// TypeScript types for IP data structures

export interface IP {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  representative_image_url: string | null;
  description: string | null;
  health_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPVertical {
  id: string;
  ip_id: string;
  vertical_name: string;
  progress_percentage: number;
  created_at: string;
}

// Core Function (from functions folder)
export interface Function {
  id: string;
  code: string; // 'E1', 'G1', 'P1', etc.
  title: string;
  category: string; // 'entertainment', 'game', 'product'
  phase: string | null;
  purpose: string | null;
  source_md: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

// Function Dependencies
export interface FunctionDependency {
  id: string;
  from_function_code: string;
  to_function_code: string;
  created_at: string;
}

// IP-Function Mapping
export interface IPFunction {
  id: string;
  ip_id: string;
  function_code: string;
  created_at: string;
}

// Function Guardrails
export interface FunctionGuardrail {
  id: string;
  function_code: string;
  guardrail_text: string;
  display_order: number;
  created_at: string;
}

// Tasks
export interface Task {
  id: string;
  function_code: string;
  task_id: string; // 'E1-T1', 'G1-T2', etc.
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

// Deliverables
export interface Deliverable {
  id: string;
  task_id: string;
  deliverable_id: string; // 'E1-T1-D1', etc.
  filename: string;
  filetype: string | null;
  path_hint: string | null;
  description: string | null;
  status?: 'Assigned' | 'In Progress' | 'Completed' | 'Approved' | 'Needs Review';
  storage_path: string | null; // Path in Supabase Storage
  ip_id: string | null; // NULL = generic template, UUID = IP-specific
  display_order: number;
  created_at: string;
}

// Deliverable Aliases
export interface DeliverableAlias {
  id: string;
  deliverable_id: string;
  alias: string;
  created_at: string;
}

// Acceptance Criteria
export interface AcceptanceCriterion {
  id: string;
  deliverable_id: string;
  criteria_id: string; // 'AC-1', 'AC-2', etc.
  criteria_text: string;
  display_order: number;
  created_at: string;
}

// Asset History
export interface AssetHistory {
  id: string;
  deliverable_id: string;
  contributor_id: string | null;
  filename: string;
  storage_path: string;
  uploaded_at: string;
  created_at: string;
}

// Asset History with Contributor
export interface AssetHistoryWithContributor extends AssetHistory {
  contributor_name: string | null;
}

// Extended types with relationships
export interface FunctionWithDetails extends Function {
  guardrails: FunctionGuardrail[];
  tasks: TaskWithDetails[];
  dependencies: FunctionDependency[];
}

export interface TaskWithDetails extends Task {
  deliverables: DeliverableWithDetails[];
}

export interface DeliverableWithDetails extends Deliverable {
  aliases: DeliverableAlias[];
  acceptance_criteria: AcceptanceCriterion[];
}

// Combined type for IP detail page
export interface IPDetail extends IP {
  verticals: IPVertical[];
  functions: FunctionWithDetails[];
}

// Graph node type for visualization
export interface GraphNode {
  id: string;
  code: string;
  name: string;
  category: string;
  x?: number;
  y?: number;
}

// Graph edge type for visualization
export interface GraphEdge {
  id: string;
  source: string; // function code
  target: string; // function code
}

// Workflows
export interface Workflow {
  id: string;
  workflow_id: string; // 'img2actions', 'txt2img', etc.
  name: string;
  description: string | null;
  image_path: string | null;
  supports_upload: boolean;
  hidden_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_text: string;
  display_order: number;
  created_at: string;
}

export interface WorkflowDeliverable {
  id: string;
  workflow_id: string;
  deliverable_code: string; // 'E1-T1-D1', etc.
  created_at: string;
}

export interface WorkflowWithDetails extends Workflow {
  steps: WorkflowStep[];
  relevant_deliverables: WorkflowDeliverable[];
}

// Contributors
export interface Contributor {
  id: string;
  name: string;
  expertise: string[];
  roles: string[];
  role: 'admin' | 'contributor';
  created_at: string;
  updated_at: string;
}

export interface ContributorDeliverable {
  id: string;
  contributor_id: string;
  deliverable_id: string;
  status: 'Assigned' | 'Completed';
  assigned_at: string;
  completed_at: string | null;
}

export interface ContributorWithDeliverables extends Contributor {
  deliverables_assigned: ContributorDeliverable[];
  deliverables_completed: ContributorDeliverable[];
}

