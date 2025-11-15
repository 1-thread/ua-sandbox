'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import PasswordGate from '../components/PasswordGate'

type Function = {
  id: string
  code: string
  title: string
  category: string | null
  phase: string | null
  purpose: string | null
  tasks: Task[]
}

type Task = {
  id: string
  task_id: string
  title: string
  description: string | null
  deliverables: Deliverable[]
}

type Deliverable = {
  id: string
  deliverable_id: string
  filename: string | null
  filetype: string | null
  path_hint: string | null
  description: string | null
  aliases: string[] | null
  acceptance: AcceptanceCriterion[]
}

type AcceptanceCriterion = {
  id: string
  criterion_id: string
  text: string
}

export default function Home() {
  const [functions, setFunctions] = useState<Function[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        // Check if Supabase is configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.')
        }

        // Fetch functions
        const { data: funcs, error: funcError } = await supabase
          .from('functions')
          .select('*')
          .order('code')

        if (funcError) throw funcError

        if (!funcs || funcs.length === 0) {
          setError('No functions found. Please run the migration script to populate the database.')
          setLoading(false)
          return
        }

        // Fetch tasks for each function
        const functionsWithTasks = await Promise.all(
          funcs.map(async (func) => {
            const { data: tasks, error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .eq('function_id', func.id)
              .order('task_id')

            if (tasksError) throw tasksError

            // Fetch deliverables for each task
            const tasksWithDeliverables = await Promise.all(
              (tasks || []).map(async (task) => {
                const { data: deliverables, error: delsError } = await supabase
                  .from('deliverables')
                  .select('*')
                  .eq('task_id', task.id)
                  .order('deliverable_id')

                if (delsError) throw delsError

                // Fetch acceptance criteria for each deliverable
                const deliverablesWithAcceptance = await Promise.all(
                  (deliverables || []).map(async (del) => {
                    const { data: acceptance, error: accError } = await supabase
                      .from('acceptance_criteria')
                      .select('*')
                      .eq('deliverable_id', del.id)
                      .order('criterion_id')

                    if (accError) throw accError

                    return {
                      ...del,
                      acceptance: (acceptance || []).map(ac => ({
                        id: ac.id,
                        criterion_id: ac.criterion_id,
                        text: ac.text
                      }))
                    }
                  })
                )

                return {
                  ...task,
                  deliverables: deliverablesWithAcceptance
                }
              })
            )

            return {
              ...func,
              tasks: tasksWithDeliverables
            }
          })
        )

        setFunctions(functionsWithTasks)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFunctions()
  }, [])

  // Group functions by phase
  const groupedFunctions = useMemo(() => {
    const grouped = functions.reduce((acc, func) => {
      const phase = func.phase || 'Unspecified'
      if (!acc[phase]) acc[phase] = []
      acc[phase].push(func)
      return acc
    }, {} as Record<string, Function[]>)

    // Sort phases in a sensible order
    const PHASE_ORDER = ['R&D', 'Development', 'Production', 'Post', 'Other', 'Unspecified']
    const ordered: Array<[string, Function[]]> = []
    const present = new Set(Object.keys(grouped))

    for (const p of PHASE_ORDER) {
      if (grouped[p]) {
        ordered.push([p, grouped[p].sort((a, b) => a.code.localeCompare(b.code))])
      }
    }

    for (const p of Array.from(present).sort()) {
      if (!PHASE_ORDER.includes(p)) {
        ordered.push([p, grouped[p].sort((a, b) => a.code.localeCompare(b.code))])
      }
    }

    return ordered
  }, [functions])

  // Filter functions based on search
  const filteredFunctions = useMemo(() => {
    if (!searchQuery.trim()) return groupedFunctions

    const search = searchQuery.toLowerCase()
    return groupedFunctions.map(([phase, funcs]) => [
      phase,
      funcs.filter(func => {
        const searchableText = `${func.code} ${func.title} ${func.category || ''} ${func.phase || ''} ${func.purpose || ''}`.toLowerCase()
        const matchesFunction = searchableText.includes(search)
        
        const matchesTask = func.tasks.some(t => 
          `${t.task_id} ${t.title} ${t.description || ''}`.toLowerCase().includes(search) ||
          t.deliverables.some(d => 
            `${d.deliverable_id} ${d.filename || ''} ${d.description || ''} ${d.path_hint || ''} ${d.filetype || ''}`.toLowerCase().includes(search)
          )
        )

        return matchesFunction || matchesTask
      })
    ]).filter(([_, funcs]) => funcs.length > 0) as Array<[string, Function[]]>
  }, [groupedFunctions, searchQuery])

  if (loading) {
    return (
      <div className="loading">
        Loading functions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        Error: {error}
      </div>
    )
  }

  const visibleCount = filteredFunctions.reduce((sum, [_, funcs]) => sum + funcs.length, 0)

  return (
    <PasswordGate>
      <header>
        <h1>
          Core Functions Viewer <span className="pill" id="count">{visibleCount} functions</span>
        </h1>
      </header>
      <div className="container">
        <div className="search">
          <input
            id="q"
            type="text"
            placeholder="Filter by code, title, task, deliverable, phase, or category… (e.g., E2, storyboard, R&D)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredFunctions.map(([phase, funcs]) => (
          <div key={phase}>
            <div className="phase">{phase}</div>
            {funcs.map(func => (
              <details key={func.id} className="function">
                <summary>
                  <span>{func.code} — {func.title}</span>
                  <span className="meta">
                    [{func.category || 'uncat'}] <span className="badge">{func.phase || 'Unspecified'}</span>
                  </span>
                </summary>
                {func.purpose && (
                  <div className="muted" style={{ margin: '6px 0 8px 2px' }}>
                    {func.purpose}
                  </div>
                )}

                {func.tasks.map(task => (
                  <details key={task.id} className="task">
                    <summary>{task.task_id} — {task.title}</summary>
                    {task.description && (
                      <div className="muted" style={{ margin: '6px 0 6px 2px' }}>
                        {task.description}
                      </div>
                    )}

                    {task.deliverables.map(del => (
                      <details key={del.id} className="deliverable">
                        <summary>
                          {del.deliverable_id} — {del.filename || '[no filename]'} <span className="meta">{del.filetype || ''}</span>
                        </summary>
                        {del.description && (
                          <div className="muted" style={{ margin: '6px 0 6px 2px' }}>
                            {del.description}
                          </div>
                        )}
                        {del.path_hint && (
                          <div className="muted" style={{ margin: '4px 0 6px 2px', fontSize: '11px' }}>
                            Path: {del.path_hint}
                          </div>
                        )}
                        {del.acceptance.length > 0 && (
                          <>
                            <div className="muted" style={{ margin: '6px 0 4px 0' }}>Acceptance Criteria:</div>
                            <ul className="acceptance">
                              {del.acceptance.map(ac => (
                                <li key={ac.id}>
                                  <strong>{ac.criterion_id}</strong> — {ac.text}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </details>
                    ))}
                  </details>
                ))}
              </details>
            ))}
          </div>
        ))}

        <div className="footer">
          Generated from {functions.length} function(s).
        </div>
      </div>
    </PasswordGate>
  )
}

