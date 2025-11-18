"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP, Task, Function } from "@/types/ip";
import type { Workflow, WorkflowStep, WorkflowDeliverable } from "@/types/ip";

interface WorkflowWithDetails extends Workflow {
  steps: WorkflowStep[];
  relevant_deliverables: WorkflowDeliverable[];
}

export default function WorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workflows, setWorkflows] = useState<WorkflowWithDetails[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowWithDetails[]>([]);
  const [workflowImageUrls, setWorkflowImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [selectedDeliverable, setSelectedDeliverable] = useState<string>("");
  
  // Dropdown options (from deliverables to get categories/functions/tasks)
  const [categories, setCategories] = useState<string[]>([]);
  const [functions, setFunctions] = useState<Array<{ code: string; title: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ code: string; task_id: string; title: string }>>([]);
  const [deliverablesList, setDeliverablesList] = useState<Array<{ id: string; deliverable_id: string; title: string }>>([]);
  
  // Modal state
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithDetails | null>(null);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, [slug]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedFunction, selectedTask, selectedDeliverable, workflows]);

  async function loadWorkflows() {
    try {
      setLoading(true);
      setError(null);

      // Get IP data
      const { data: ipData, error: ipError } = await supabase
        .from("ips")
        .select("*")
        .eq("slug", slug)
        .single();

      if (ipError || !ipData) throw new Error("IP not found");
      
      setIp(ipData);

      // Handle IP icon URL
      const iconPath = ipData.icon_url;
      if (iconPath) {
        const isDevelopment = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (isDevelopment) {
          const filename = iconPath.replace(/^ip-assets\//, '');
          setIpIconUrl(`/icons/${filename}`);
        } else {
          try {
            const filename = iconPath.replace(/^ip-assets\//, '');
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('ip-assets')
              .createSignedUrl(filename, 3600);
            
            if (!urlError && signedUrl) {
              setIpIconUrl(signedUrl.signedUrl);
            } else {
              const filename = iconPath.replace(/^ip-assets\//, '');
              setIpIconUrl(`/icons/${filename}`);
            }
          } catch (err) {
            console.error("Error generating signed URL for icon:", err);
            const filename = iconPath.replace(/^ip-assets\//, '');
            setIpIconUrl(`/icons/${filename}`);
          }
        }
      }

      // Get IP-specific deliverables to build filter options
      const { data: ipFunctions, error: ipFunctionsError } = await supabase
        .from("ip_functions")
        .select("function_code")
        .eq("ip_id", ipData.id);

      if (ipFunctionsError) throw ipFunctionsError;

      if (ipFunctions && ipFunctions.length > 0) {
        const functionCodes = ipFunctions.map(f => f.function_code);

        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select(`
            *,
            function:functions(*)
          `)
          .in("function_code", functionCodes)
          .order("display_order");

        if (tasksError) throw tasksError;

        const { data: deliverablesData, error: deliverablesError } = await supabase
          .from("deliverables")
          .select("*")
          .eq("ip_id", ipData.id)
          .order("display_order");

        if (deliverablesError) throw deliverablesError;

        // Build filter options from deliverables
        const deliverablesWithTasks = deliverablesData
          .map(deliverable => {
            const task = tasksData?.find(t => t.id === deliverable.task_id);
            if (!task) return null;
            return {
              ...deliverable,
              task: {
                ...task,
                function: task.function as Function,
              },
            };
          })
          .filter((d): d is any => d !== null);

        // Extract unique categories, functions, tasks, deliverables
        const uniqueCategories = Array.from(new Set(deliverablesWithTasks.map(d => d.task.function.category)))
          .sort();
        setCategories(uniqueCategories);

        const functionsMap = new Map<string, { code: string; title: string }>();
        deliverablesWithTasks.forEach(d => {
          if (!functionsMap.has(d.task.function.code)) {
            functionsMap.set(d.task.function.code, {
              code: d.task.function.code,
              title: d.task.function.title
            });
          }
        });
        setFunctions(Array.from(functionsMap.values()).sort((a, b) => a.code.localeCompare(b.code)));

        const tasksMap = new Map<string, { code: string; task_id: string; title: string }>();
        deliverablesWithTasks.forEach(d => {
          if (!tasksMap.has(d.task.task_id)) {
            tasksMap.set(d.task.task_id, {
              code: d.task.function.code,
              task_id: d.task.task_id,
              title: d.task.title
            });
          }
        });
        setTasks(Array.from(tasksMap.values())
          .sort((a, b) => a.code.localeCompare(b.code) || a.task_id.localeCompare(b.task_id)));

        const deliverablesMap = new Map<string, { id: string; deliverable_id: string; title: string }>();
        deliverablesWithTasks.forEach(d => {
          if (!deliverablesMap.has(d.id)) {
            deliverablesMap.set(d.id, {
              id: d.id,
              deliverable_id: d.deliverable_id,
              title: d.filename || d.deliverable_id
            });
          }
        });
        setDeliverablesList(Array.from(deliverablesMap.values())
          .sort((a, b) => a.deliverable_id.localeCompare(b.deliverable_id)));
      }

      // Load all workflows with their steps and relevant deliverables
      const { data: workflowsData, error: workflowsError } = await supabase
        .from("workflows")
        .select("*")
        .order("name");

      if (workflowsError) throw workflowsError;

      // Load steps and deliverables for each workflow
      const workflowsWithDetails: WorkflowWithDetails[] = await Promise.all(
        (workflowsData || []).map(async (workflow) => {
          const [stepsData, deliverablesData] = await Promise.all([
            supabase.from("workflow_steps").select("*").eq("workflow_id", workflow.id).order("display_order"),
            supabase.from("workflow_deliverables").select("*").eq("workflow_id", workflow.id),
          ]);

          return {
            ...workflow,
            steps: stepsData.data || [],
            relevant_deliverables: deliverablesData.data || [],
          };
        })
      );

      setWorkflows(workflowsWithDetails);

      // Load image URLs for all workflows
      const imageUrlMap = new Map<string, string>();
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      console.log(`\n[Workflow Images] Loading images in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
      console.log(`[Workflow Images] Hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'server-side'}`);
      
      await Promise.all(
        workflowsWithDetails.map(async (workflow) => {
          if (workflow.image_path) {
            const url = await getWorkflowImageUrl(workflow.image_path);
            if (url) {
              imageUrlMap.set(workflow.id, url);
              console.log(`[Workflow Images] Loaded: ${workflow.name} → ${url.substring(0, 50)}...`);
            }
          }
        })
      );
      
      console.log(`[Workflow Images] ✅ Loaded ${imageUrlMap.size} image URL(s)\n`);
      setWorkflowImageUrls(imageUrlMap);

      setLoading(false);
    } catch (err) {
      console.error("Error loading workflows:", err);
      setError(err instanceof Error ? err.message : "Failed to load workflows");
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...workflows];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query) ||
        w.workflow_id.toLowerCase().includes(query)
      );
    }

    // Filter by relevant deliverables matching the selected filters
    if (selectedCategory || selectedFunction || selectedTask || selectedDeliverable) {
      filtered = filtered.filter(workflow => {
        // Check if any relevant deliverable code matches the selected filters
        return workflow.relevant_deliverables.some(wd => {
          const deliverableCode = wd.deliverable_code;
          
          // Parse deliverable code (e.g., "E1-T1-D1")
          const parts = deliverableCode.split('-');
          if (parts.length < 3) return false;
          
          const codeCategory = parts[0].charAt(0).toLowerCase() === 'e' ? 'entertainment' :
                               parts[0].charAt(0).toLowerCase() === 'g' ? 'game' :
                               parts[0].charAt(0).toLowerCase() === 'p' ? 'product' : '';
          const codeFunction = parts[0];
          const codeTask = parts[0] + '-' + parts[1];
          const codeDeliverable = deliverableCode;

          // Check category match
          if (selectedCategory && codeCategory !== selectedCategory) {
            return false;
          }

          // Check function match
          if (selectedFunction && codeFunction !== selectedFunction) {
            return false;
          }

          // Check task match
          if (selectedTask && codeTask !== selectedTask) {
            return false;
          }

          // Check deliverable match
          if (selectedDeliverable) {
            const selectedDeliverableObj = deliverablesList.find(d => d.id === selectedDeliverable);
            if (selectedDeliverableObj && codeDeliverable !== selectedDeliverableObj.deliverable_id) {
              return false;
            }
          }

          return true;
        });
      });
    }

    setFilteredWorkflows(filtered);
  }

  async function getWorkflowImageUrl(imagePath: string | null): Promise<string | null> {
    if (!imagePath) return null;
    
    // Check if it's already a full URL
    if (imagePath.startsWith('http')) {
      console.log(`[Workflow Image] Using existing URL: ${imagePath}`);
      return imagePath;
    }

    // For local development, use public folder
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (isDevelopment) {
      // Remove 'img/' prefix if present, keep the filename
      const filename = imagePath.replace(/^img\//, '');
      const localPath = `/workflows/${filename}`;
      console.log(`[Workflow Image] Development mode - Using local file: ${localPath}`);
      return localPath;
    }

    // For production, generate signed URL from Supabase Storage
    try {
      // Extract filename (remove 'img/' or 'workflows/' prefix if present)
      const filename = imagePath.replace(/^(img|workflows)\//, '');
      
      console.log(`[Workflow Image] Production mode - Attempting Supabase Storage: ${filename}`);
      
      const { data: signedUrl, error } = await supabase.storage
        .from('workflows')
        .createSignedUrl(filename, 3600); // 1 hour expiry

      if (!error && signedUrl) {
        console.log(`[Workflow Image] ✅ Using Supabase Storage signed URL for: ${filename}`);
        return signedUrl.signedUrl;
      } else {
        console.warn(`[Workflow Image] ⚠️ Supabase Storage failed for ${filename}, falling back to local:`, error);
        // Fallback to local path
        const fallbackPath = `/workflows/${filename}`;
        console.log(`[Workflow Image] Using fallback local path: ${fallbackPath}`);
        return fallbackPath;
      }
    } catch (err) {
      console.error(`[Workflow Image] ❌ Error generating signed URL for ${imagePath}:`, err);
      // Fallback to local path
      const filename = imagePath.replace(/^(img|workflows)\//, '');
      const fallbackPath = `/workflows/${filename}`;
      console.log(`[Workflow Image] Using fallback local path: ${fallbackPath}`);
      return fallbackPath;
    }
  }

  function getWorkflowImageUrlSync(workflowId: string): string | null {
    return workflowImageUrls.get(workflowId) || null;
  }

  async function handleSubmit(workflow: WorkflowWithDetails) {
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    try {
      setIsSubmitting(true);
      setOutput("");

      const response = await fetch('/api/workflow-execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: workflow.workflow_id,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const data = await response.json();
      setOutput(data.output || "No output received");
    } catch (err) {
      console.error("Error executing workflow:", err);
      setOutput(`Error: ${err instanceof Error ? err.message : "Failed to execute workflow"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get filtered functions based on category
  const filteredFunctions = selectedCategory
    ? functions.filter(f => {
        // Check if any deliverable with this function code matches the category
        return deliverablesList.some(d => {
          const parts = d.deliverable_id.split('-');
          if (parts.length < 3) return false;
          const codeCategory = parts[0].charAt(0).toLowerCase() === 'e' ? 'entertainment' :
                               parts[0].charAt(0).toLowerCase() === 'g' ? 'game' :
                               parts[0].charAt(0).toLowerCase() === 'p' ? 'product' : '';
          return codeCategory === selectedCategory && parts[0] === f.code;
        });
      })
    : functions;

  // Get filtered tasks based on core function
  const filteredTasks = selectedFunction
    ? tasks.filter(t => {
        // Filter tasks that match the selected function
        if (t.code !== selectedFunction) return false;
        
        // Also filter by category if selected
        if (selectedCategory) {
          const parts = t.task_id.split('-');
          if (parts.length < 2) return false;
          const codeCategory = parts[0].charAt(0).toLowerCase() === 'e' ? 'entertainment' :
                               parts[0].charAt(0).toLowerCase() === 'g' ? 'game' :
                               parts[0].charAt(0).toLowerCase() === 'p' ? 'product' : '';
          return codeCategory === selectedCategory;
        }
        return true;
      })
    : selectedCategory
    ? tasks.filter(t => {
        // Filter by category only
        const parts = t.task_id.split('-');
        if (parts.length < 2) return false;
        const codeCategory = parts[0].charAt(0).toLowerCase() === 'e' ? 'entertainment' :
                             parts[0].charAt(0).toLowerCase() === 'g' ? 'game' :
                             parts[0].charAt(0).toLowerCase() === 'p' ? 'product' : '';
        return codeCategory === selectedCategory;
      })
    : tasks;

  // Get filtered deliverables based on task
  const filteredDeliverablesForDropdown = selectedTask
    ? deliverablesList.filter(d => {
        // Check if deliverable matches the selected task
        const parts = d.deliverable_id.split('-');
        if (parts.length < 3) return false;
        const deliverableTask = parts[0] + '-' + parts[1];
        return deliverableTask === selectedTask;
      })
    : selectedFunction
    ? deliverablesList.filter(d => {
        // Filter by function if task not selected
        const parts = d.deliverable_id.split('-');
        if (parts.length < 3) return false;
        return parts[0] === selectedFunction;
      })
    : selectedCategory
    ? deliverablesList.filter(d => {
        // Filter by category only
        const parts = d.deliverable_id.split('-');
        if (parts.length < 3) return false;
        const codeCategory = parts[0].charAt(0).toLowerCase() === 'e' ? 'entertainment' :
                             parts[0].charAt(0).toLowerCase() === 'g' ? 'game' :
                             parts[0].charAt(0).toLowerCase() === 'p' ? 'product' : '';
        return codeCategory === selectedCategory;
      })
    : deliverablesList;

  // Helper functions for short codes
  function getShortTaskCode(taskId: string): string {
    const parts = taskId.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : taskId;
  }

  function getShortDeliverableCode(deliverableId: string): string {
    const parts = deliverableId.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : deliverableId;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - same as other pages */}
      <aside className="w-64 shrink-0 border-r border-[#e0e0e0] bg-white flex flex-col">
        <div className="h-24 flex items-center px-5">
          <div className="flex items-center gap-3">
            <img src="/Title.svg" alt="UA" className="block h-8 w-auto" />
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-semibold truncate">Universal</span>
              <span className="font-semibold truncate">Asset</span>
            </div>
          </div>
        </div>

        <div className="px-2 pt-4">
          <button
            onClick={() => router.push(`/ip/${slug}`)}
            className="w-full flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* IP Info */}
        {ip && ipIconUrl && (
          <div className="px-2 pt-4 pb-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#dfdfdf]">
              <img
                src={ipIconUrl}
                alt={ip.name}
                className="block h-8 w-8 rounded object-cover"
              />
              <span className="font-medium text-sm truncate">{ip.name}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          <button 
            onClick={() => router.push(`/ip/${slug}/workflows`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img src="/list.svg" alt="Workflows" className="block h-4 w-4" />
            </span>
            <span className="truncate">Workflows</span>
          </button>

          <button 
            onClick={() => router.push(`/ip/${slug}/assets`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img src="/photo.svg" alt="Assets" className="block h-4 w-4" />
            </span>
            <span className="truncate">Assets</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl">
          {/* IP Header */}
          {ip && ipIconUrl && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={ipIconUrl}
                  alt={`${ip.name} icon`}
                  className="w-12 h-12 object-contain"
                />
                <h1 className="text-3xl font-semibold tracking-tight">{ip.name}</h1>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Workflows</h2>
            {typeof window !== 'undefined' && (
              <div className="text-xs text-black/40 font-mono">
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                  ? '📁 Local Files' 
                  : '☁️ Supabase Storage'}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div>
              <input
                type="text"
                placeholder="Search workflows by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm"
              />
            </div>

            {/* Filter dropdowns - compact */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedFunction("");
                  setSelectedTask("");
                  setSelectedDeliverable("");
                }}
                className="px-2 py-1.5 border border-[#e0e0e0] rounded-lg text-xs"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'entertainment' ? 'Entertainment (E)' : 
                     cat === 'game' ? 'Game (G)' : 
                     cat === 'product' ? 'Product (P)' : cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedFunction}
                onChange={(e) => {
                  setSelectedFunction(e.target.value);
                  setSelectedTask("");
                  setSelectedDeliverable("");
                }}
                disabled={!selectedCategory}
                className="px-2 py-1.5 border border-[#e0e0e0] rounded-lg text-xs disabled:opacity-50"
              >
                <option value="">All Functions</option>
                {filteredFunctions.map(func => (
                  <option key={func.code} value={func.code}>
                    {func.code}: {func.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedTask}
                onChange={(e) => {
                  setSelectedTask(e.target.value);
                  setSelectedDeliverable("");
                }}
                disabled={!selectedFunction}
                className="px-2 py-1.5 border border-[#e0e0e0] rounded-lg text-xs disabled:opacity-50"
              >
                <option value="">All Tasks</option>
                {filteredTasks.map(task => (
                  <option key={task.task_id} value={task.task_id}>
                    {getShortTaskCode(task.task_id)}: {task.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedDeliverable}
                onChange={(e) => setSelectedDeliverable(e.target.value)}
                disabled={!selectedTask}
                className="px-2 py-1.5 border border-[#e0e0e0] rounded-lg text-xs disabled:opacity-50"
              >
                <option value="">All Deliverables</option>
                {filteredDeliverablesForDropdown.map(del => (
                  <option key={del.id} value={del.id}>
                    {getShortDeliverableCode(del.deliverable_id)}: {del.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Workflow cards grid */}
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 text-black/60">
              {loading ? "Loading..." : "No workflows found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWorkflows.map((workflow) => {
                const imageUrl = getWorkflowImageUrlSync(workflow.id);
                return (
                  <div
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="border border-[#e0e0e0] rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow hover:-translate-y-1"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-32 bg-black rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={workflow.name}
                          className="w-[70%] h-[70%] object-contain"
                        />
                      ) : (
                        <span className="text-4xl">⚙️</span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="text-sm font-medium mb-1">{workflow.name}</div>

                    {/* Description */}
                    <div className="text-xs text-black/60 line-clamp-2 mb-2">
                      {workflow.description}
                    </div>

                    {/* Relevant deliverables count */}
                    {workflow.relevant_deliverables.length > 0 && (
                      <div className="text-xs text-black/40">
                        {workflow.relevant_deliverables.length} deliverable{workflow.relevant_deliverables.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating detail modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedWorkflow.name}</h2>
              <button
                onClick={() => {
                  setSelectedWorkflow(null);
                  setPrompt("");
                  setOutput("");
                }}
                className="text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Image */}
              {getWorkflowImageUrlSync(selectedWorkflow.id) && (
                <div className="w-full h-48 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={getWorkflowImageUrlSync(selectedWorkflow.id)!}
                    alt={selectedWorkflow.name}
                    className="w-[70%] h-[70%] object-contain"
                  />
                </div>
              )}

              {/* Description */}
              {selectedWorkflow.description && (
                <div>
                  <label className="text-xs font-medium text-black/60">Description</label>
                  <div className="text-sm">{selectedWorkflow.description}</div>
                </div>
              )}

              {/* Steps/Directions */}
              {selectedWorkflow.steps.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-black/60 mb-2 block">Directions</label>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {selectedWorkflow.steps.map((step, index) => (
                      <li key={step.id}>{step.step_text}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Relevant Deliverables */}
              {selectedWorkflow.relevant_deliverables.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-black/60 mb-2 block">Relevant Deliverables</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkflow.relevant_deliverables.map(del => (
                      <span
                        key={del.id}
                        className="px-2 py-1 bg-gray-100 rounded text-xs font-mono"
                      >
                        {del.deliverable_code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Input/Output */}
              <div className="pt-4 border-t border-[#e0e0e0] space-y-3">
                <div>
                  <label className="text-xs font-medium text-black/60 mb-1 block">Prompt:</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt..."
                    rows={4}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-black/60 mb-1 block">Output:</label>
                  <textarea
                    value={output}
                    readOnly
                    placeholder="Output will appear here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm bg-gray-50"
                  />
                </div>

                <button
                  onClick={() => handleSubmit(selectedWorkflow)}
                  disabled={isSubmitting || !prompt.trim()}
                  className={`w-full px-4 py-2 rounded-lg text-sm transition-colors ${
                    isSubmitting || !prompt.trim()
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-[#c9c9c9] hover:bg-[#b0b0b0]"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

