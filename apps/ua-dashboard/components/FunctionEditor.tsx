"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  Function,
  FunctionGuardrail,
  Task,
  Deliverable,
  AcceptanceCriterion,
  DeliverableAlias,
} from "@/types/ip";

interface FunctionWithData extends Function {
  guardrails: FunctionGuardrail[];
  tasks: TaskWithData[];
}

interface TaskWithData extends Task {
  deliverables: DeliverableWithData[];
}

interface DeliverableWithData extends Deliverable {
  aliases: DeliverableAlias[];
  acceptance_criteria: AcceptanceCriterion[];
}

export default function FunctionEditor({
  function: func,
  onSave,
  onDelete,
}: {
  function: FunctionWithData;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editingFunction, setEditingFunction] = useState(func);
  const [saving, setSaving] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());

  async function saveFunction() {
    try {
      setSaving(true);
      
      // Update function
      const { error: funcError } = await supabase
        .from("functions")
        .update({
          title: editingFunction.title,
          category: editingFunction.category,
          phase: editingFunction.phase || null,
          purpose: editingFunction.purpose || null,
          source_md: editingFunction.source_md || null,
          updated_at: new Date().toISOString(),
        })
        .eq("code", editingFunction.code);

      if (funcError) throw funcError;

      await onSave();
      alert("Function saved successfully!");
    } catch (err) {
      console.error("Error saving function:", err);
      alert("Failed to save function");
    } finally {
      setSaving(false);
    }
  }

  async function addGuardrail() {
    const newGuardrail = prompt("Enter guardrail text:");
    if (!newGuardrail) return;

    try {
      const maxOrder = Math.max(...editingFunction.guardrails.map((g) => g.display_order), -1);
      const { error } = await supabase.from("function_guardrails").insert({
        function_code: editingFunction.code,
        guardrail_text: newGuardrail,
        display_order: maxOrder + 1,
      });

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error adding guardrail:", err);
      alert("Failed to add guardrail");
    }
  }

  async function deleteGuardrail(id: string) {
    if (!confirm("Delete this guardrail?")) return;

    try {
      const { error } = await supabase.from("function_guardrails").delete().eq("id", id);
      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error deleting guardrail:", err);
      alert("Failed to delete guardrail");
    }
  }

  async function addTask() {
    const taskId = prompt("Enter task ID (e.g., E1-T1):");
    if (!taskId) return;
    const title = prompt("Enter task title:");
    if (!title) return;

    try {
      const maxOrder = Math.max(...editingFunction.tasks.map((t) => t.display_order), -1);
      const { error } = await supabase.from("tasks").insert({
        function_code: editingFunction.code,
        task_id: taskId,
        title,
        description: null,
        display_order: maxOrder + 1,
      });

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task");
    }
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task");
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task and all its deliverables?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task");
    }
  }

  async function addDeliverable(taskId: string) {
    const deliverableId = prompt("Enter deliverable ID (e.g., E1-T1-D1):");
    if (!deliverableId) return;
    const filename = prompt("Enter filename:");
    if (!filename) return;

    try {
      const task = editingFunction.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const maxOrder = Math.max(...task.deliverables.map((d) => d.display_order), -1);
      const { error } = await supabase.from("deliverables").insert({
        task_id: taskId,
        deliverable_id: deliverableId,
        filename,
        filetype: null,
        path_hint: null,
        description: null,
        display_order: maxOrder + 1,
      });

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error adding deliverable:", err);
      alert("Failed to add deliverable");
    }
  }

  async function updateDeliverable(deliverableId: string, updates: Partial<Deliverable>) {
    try {
      const { error } = await supabase
        .from("deliverables")
        .update(updates)
        .eq("id", deliverableId);

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error updating deliverable:", err);
      alert("Failed to update deliverable");
    }
  }

  async function deleteDeliverable(id: string) {
    if (!confirm("Delete this deliverable and all its criteria?")) return;

    try {
      const { error } = await supabase.from("deliverables").delete().eq("id", id);
      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error deleting deliverable:", err);
      alert("Failed to delete deliverable");
    }
  }

  async function addAcceptanceCriterion(deliverableId: string) {
    const criteriaId = prompt("Enter criteria ID (e.g., AC-1):");
    if (!criteriaId) return;
    const text = prompt("Enter criteria text:");
    if (!text) return;

    try {
      const deliverable = editingFunction.tasks
        .flatMap((t) => t.deliverables)
        .find((d) => d.id === deliverableId);
      if (!deliverable) return;

      const maxOrder = Math.max(...deliverable.acceptance_criteria.map((c) => c.display_order), -1);
      const { error } = await supabase.from("acceptance_criteria").insert({
        deliverable_id: deliverableId,
        criteria_id: criteriaId,
        criteria_text: text,
        display_order: maxOrder + 1,
      });

      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error adding acceptance criterion:", err);
      alert("Failed to add acceptance criterion");
    }
  }

  async function deleteAcceptanceCriterion(id: string) {
    if (!confirm("Delete this acceptance criterion?")) return;

    try {
      const { error } = await supabase.from("acceptance_criteria").delete().eq("id", id);
      if (error) throw error;
      await onSave();
    } catch (err) {
      console.error("Error deleting acceptance criterion:", err);
      alert("Failed to delete acceptance criterion");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Function Header */}
      <div className="border border-[#e0e0e0] rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Code</label>
            <input
              type="text"
              value={editingFunction.code}
              disabled
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={editingFunction.title}
              onChange={(e) => setEditingFunction({ ...editingFunction, title: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Category</label>
            <select
              value={editingFunction.category}
              onChange={(e) => setEditingFunction({ ...editingFunction, category: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            >
              <option value="entertainment">Entertainment</option>
              <option value="game">Game</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phase</label>
            <input
              type="text"
              value={editingFunction.phase || ""}
              onChange={(e) => setEditingFunction({ ...editingFunction, phase: e.target.value || null })}
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Purpose</label>
            <textarea
              value={editingFunction.purpose || ""}
              onChange={(e) => setEditingFunction({ ...editingFunction, purpose: e.target.value || null })}
              rows={4}
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Source MD</label>
            <input
              type="text"
              value={editingFunction.source_md || ""}
              onChange={(e) => setEditingFunction({ ...editingFunction, source_md: e.target.value || null })}
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <button
            onClick={saveFunction}
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#c9c9c9] hover:bg-[#b0b0b0] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Function"}
          </button>
        </div>
      </div>

      {/* Guardrails */}
      <div className="border border-[#e0e0e0] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold">Guardrails</h2>
          <button
            onClick={addGuardrail}
            className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {editingFunction.guardrails.map((guardrail) => (
            <div key={guardrail.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
              <span className="flex-1 text-xs">{guardrail.guardrail_text}</span>
              <button
                onClick={() => deleteGuardrail(guardrail.id)}
                className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="border border-[#e0e0e0] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold">Tasks and Deliverables</h2>
          <button
            onClick={addTask}
            className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            + Add Task
          </button>
        </div>
        <div className="space-y-4">
          {editingFunction.tasks.map((task) => (
            <TaskEditor
              key={task.id}
              task={task}
              expanded={expandedTasks.has(task.id)}
              onToggle={() => {
                const newSet = new Set(expandedTasks);
                if (newSet.has(task.id)) {
                  newSet.delete(task.id);
                } else {
                  newSet.add(task.id);
                }
                setExpandedTasks(newSet);
              }}
              onUpdate={(updates) => updateTask(task.id, updates)}
              onDelete={() => deleteTask(task.id)}
              onAddDeliverable={() => addDeliverable(task.id)}
              onUpdateDeliverable={updateDeliverable}
              onDeleteDeliverable={deleteDeliverable}
              onAddCriterion={addAcceptanceCriterion}
              onDeleteCriterion={deleteAcceptanceCriterion}
              expandedDeliverables={expandedDeliverables}
              setExpandedDeliverables={setExpandedDeliverables}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  onAddCriterion,
  onDeleteCriterion,
  expandedDeliverables,
  setExpandedDeliverables,
}: {
  task: TaskWithData;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddDeliverable: () => Promise<void>;
  onUpdateDeliverable: (id: string, updates: Partial<Deliverable>) => Promise<void>;
  onDeleteDeliverable: (id: string) => Promise<void>;
  onAddCriterion: (deliverableId: string) => Promise<void>;
  onDeleteCriterion: (id: string) => Promise<void>;
  expandedDeliverables: Set<string>;
  setExpandedDeliverables: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [editingTask, setEditingTask] = useState(task);

  return (
    <div className="border border-[#e0e0e0] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onToggle} className="flex-1 text-left flex items-center gap-2">
          <span className={`inline-block transition-transform text-xs ${expanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span className="font-medium text-xs">
            {task.task_id}: {task.title}
            {task.deliverables.length > 0 && (
              <span className="ml-2 text-[10px] text-black/60">
                ({task.deliverables.length} deliverable{task.deliverables.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ title: editingTask.title, description: editingTask.description })}
            className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pl-3 border-l-2 border-[#e0e0e0]">
          <div>
            <label className="block text-xs font-medium mb-1">Task ID</label>
            <input
              type="text"
              value={editingTask.task_id}
              disabled
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={editingTask.description || ""}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value || null })}
              rows={3}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>

          {/* Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-xs">
                Deliverables {task.deliverables.length > 0 && `(${task.deliverables.length})`}
              </h3>
              <button
                onClick={onAddDeliverable}
                className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
              >
                + Add
              </button>
            </div>
            {task.deliverables.length === 0 ? (
              <div className="text-xs text-black/60 py-2">No deliverables yet. Click + Add to create one.</div>
            ) : (
              <div className="space-y-2">
                {task.deliverables.map((deliverable) => (
                  <DeliverableEditor
                    key={deliverable.id}
                    deliverable={deliverable}
                    expanded={expandedDeliverables.has(deliverable.id)}
                    onToggle={() => {
                      const newSet = new Set(expandedDeliverables);
                      if (newSet.has(deliverable.id)) {
                        newSet.delete(deliverable.id);
                      } else {
                        newSet.add(deliverable.id);
                      }
                      setExpandedDeliverables(newSet);
                    }}
                    onUpdate={(updates) => onUpdateDeliverable(deliverable.id, updates)}
                    onDelete={() => onDeleteDeliverable(deliverable.id)}
                    onAddCriterion={() => onAddCriterion(deliverable.id)}
                    onDeleteCriterion={onDeleteCriterion}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliverableEditor({
  deliverable,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddCriterion,
  onDeleteCriterion,
}: {
  deliverable: DeliverableWithData;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Deliverable>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddCriterion: () => Promise<void>;
  onDeleteCriterion: (id: string) => Promise<void>;
}) {
  const [editingDeliverable, setEditingDeliverable] = useState(deliverable);

  return (
    <div className="border border-[#e0e0e0] rounded p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onToggle} className="flex-1 text-left text-sm flex items-center gap-2">
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span className="font-medium">{deliverable.deliverable_id}: {deliverable.filename}</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({
              filename: editingDeliverable.filename,
              filetype: editingDeliverable.filetype,
              path_hint: editingDeliverable.path_hint,
              description: editingDeliverable.description,
            })}
            className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-[#c9c9c9]">
          <div>
            <label className="block text-xs font-medium mb-1">Deliverable ID</label>
            <input
              type="text"
              value={editingDeliverable.deliverable_id}
              disabled
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Filename</label>
            <input
              type="text"
              value={editingDeliverable.filename}
              onChange={(e) => setEditingDeliverable({ ...editingDeliverable, filename: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Filetype</label>
            <input
              type="text"
              value={editingDeliverable.filetype || ""}
              onChange={(e) => setEditingDeliverable({ ...editingDeliverable, filetype: e.target.value || null })}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Path Hint</label>
            <input
              type="text"
              value={editingDeliverable.path_hint || ""}
              onChange={(e) => setEditingDeliverable({ ...editingDeliverable, path_hint: e.target.value || null })}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={editingDeliverable.description || ""}
              onChange={(e) => setEditingDeliverable({ ...editingDeliverable, description: e.target.value || null })}
              rows={2}
              className="w-full px-2 py-1 text-xs border border-[#e0e0e0] rounded"
            />
          </div>

          {/* Acceptance Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium">Acceptance Criteria</h4>
              <button
                onClick={onAddCriterion}
                className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {deliverable.acceptance_criteria.map((criterion) => (
                <div key={criterion.id} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                  <span>{criterion.criteria_id}: {criterion.criteria_text}</span>
                  <button
                    onClick={() => onDeleteCriterion(criterion.id)}
                    className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

