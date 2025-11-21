"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP, Task, Function, Deliverable, AcceptanceCriterion, WorkflowResult } from "@/types/ip";
import type { Workflow, WorkflowStep, WorkflowDeliverable } from "@/types/ip";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";

interface WorkflowWithDetails extends Workflow {
  steps: WorkflowStep[];
  relevant_deliverables: WorkflowDeliverable[];
}

// Module-level cache to persist data across navigation
interface WorkflowsCache {
  workflows: WorkflowWithDetails[];
  workflowImageUrls: Map<string, string>;
  ip: IP | null;
  ipIconUrl: string | null;
  categories: string[];
  functions: Array<{ code: string; title: string }>;
  tasks: Array<{ code: string; task_id: string; title: string }>;
  deliverablesList: Array<{ id: string; deliverable_id: string; title: string }>;
}

const workflowsCache = new Map<string, WorkflowsCache>();

export default function WorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const hasLoadedRef = useRef(false);
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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
  
  // Text2Img specific state
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [availableDeliverables, setAvailableDeliverables] = useState<Array<{ id: string; deliverable_id: string; filename: string; description: string | null }>>([]);
  const [selectedTxt2ImgDeliverable, setSelectedTxt2ImgDeliverable] = useState<Deliverable & { task: Task & { function: Function }; acceptance_criteria: AcceptanceCriterion[] } | null>(null);
  const [contextPrompt, setContextPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Reset the ref when slug changes
    hasLoadedRef.current = false;
    
    // Check cache first
    const cached = workflowsCache.get(slug);
    if (cached) {
      // Restore from cache
      setWorkflows(cached.workflows);
      setWorkflowImageUrls(cached.workflowImageUrls);
      setIp(cached.ip);
      setIpIconUrl(cached.ipIconUrl);
      setCategories(cached.categories);
      setFunctions(cached.functions);
      setTasks(cached.tasks);
      setDeliverablesList(cached.deliverablesList);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    // Load fresh data if not in cache
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
      let iconUrlValue: string | null = null;
      const iconPath = ipData.icon_url;
      if (iconPath) {
        const isDevelopment = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (isDevelopment) {
          const filename = iconPath.replace(/^ip-assets\//, '');
          iconUrlValue = `/icons/${filename}`;
          setIpIconUrl(iconUrlValue);
        } else {
          try {
            const filename = iconPath.replace(/^ip-assets\//, '');
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('ip-assets')
              .createSignedUrl(filename, 3600);
            
            if (!urlError && signedUrl) {
              iconUrlValue = signedUrl.signedUrl;
              setIpIconUrl(iconUrlValue);
            } else {
              const filename = iconPath.replace(/^ip-assets\//, '');
              iconUrlValue = `/icons/${filename}`;
              setIpIconUrl(iconUrlValue);
            }
          } catch (err) {
            console.error("Error generating signed URL for icon:", err);
            const filename = iconPath.replace(/^ip-assets\//, '');
            iconUrlValue = `/icons/${filename}`;
            setIpIconUrl(iconUrlValue);
          }
        }
      }

      // Get IP-specific deliverables to build filter options
      const { data: ipFunctions, error: ipFunctionsError } = await supabase
        .from("ip_functions")
        .select("function_code")
        .eq("ip_id", ipData.id);

      if (ipFunctionsError) throw ipFunctionsError;

      // Initialize filter option variables
      let uniqueCategories: string[] = [];
      let functionsMap = new Map<string, { code: string; title: string }>();
      let tasksMap = new Map<string, { code: string; task_id: string; title: string }>();
      let deliverablesMap = new Map<string, { id: string; deliverable_id: string; title: string }>();

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
        uniqueCategories = Array.from(new Set(deliverablesWithTasks.map(d => d.task.function.category)))
          .sort();
        setCategories(uniqueCategories);

        deliverablesWithTasks.forEach(d => {
          if (!functionsMap.has(d.task.function.code)) {
            functionsMap.set(d.task.function.code, {
              code: d.task.function.code,
              title: d.task.function.title
            });
          }
        });
        setFunctions(Array.from(functionsMap.values()).sort((a, b) => a.code.localeCompare(b.code)));

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

      // Cache the loaded data
      workflowsCache.set(slug, {
        workflows: workflowsWithDetails,
        workflowImageUrls: imageUrlMap,
        ip: ipData,
        ipIconUrl: iconUrlValue,
        categories: uniqueCategories,
        functions: Array.from(functionsMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
        tasks: Array.from(tasksMap.values())
          .sort((a, b) => a.code.localeCompare(b.code) || a.task_id.localeCompare(b.task_id)),
        deliverablesList: Array.from(deliverablesMap.values())
          .sort((a, b) => a.deliverable_id.localeCompare(b.deliverable_id)),
      });

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

  // Load deliverables assigned to current user
  async function loadUserDeliverables() {
    try {
      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      if (!contributorId) {
        setAvailableDeliverables([]);
        return;
      }

      // Get IP ID
      const { data: ipData } = await supabase
        .from('ips')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!ipData) return;

      // Get contributor deliverables
      const { data: contributorDeliverables } = await supabase
        .from('contributor_deliverables')
        .select('deliverable_id')
        .eq('contributor_id', contributorId)
        .eq('status', 'Assigned');

      if (!contributorDeliverables || contributorDeliverables.length === 0) {
        setAvailableDeliverables([]);
        return;
      }

      const deliverableIds = contributorDeliverables.map(cd => cd.deliverable_id);

      // Get deliverable details
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('id, deliverable_id, filename, description')
        .in('id', deliverableIds)
        .eq('ip_id', ipData.id);

      setAvailableDeliverables(deliverablesData || []);
    } catch (err) {
      console.error('Error loading user deliverables:', err);
      setAvailableDeliverables([]);
    }
  }

  // Load deliverable details with acceptance criteria
  async function loadDeliverableDetails(deliverableId: string) {
    try {
      // Get deliverable
      const { data: deliverableData, error: deliverableError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('id', deliverableId)
        .single();

      if (deliverableError || !deliverableData) {
        setSelectedTxt2ImgDeliverable(null);
        return;
      }

      // Get task with function
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          function:functions(*)
        `)
        .eq('id', deliverableData.task_id)
        .single();

      if (taskError || !taskData) {
        console.error('Error loading task:', taskError);
        setSelectedTxt2ImgDeliverable(null);
        return;
      }

      // Load acceptance criteria
      const { data: criteriaData } = await supabase
        .from('acceptance_criteria')
        .select('*')
        .eq('deliverable_id', deliverableId)
        .order('display_order');

      const deliverableWithDetails = {
        ...deliverableData,
        task: {
          ...taskData,
          function: taskData.function as Function
        } as Task & { function: Function },
        acceptance_criteria: (criteriaData || []) as AcceptanceCriterion[]
      };

      setSelectedTxt2ImgDeliverable(deliverableWithDetails);

      // Build context prompt
      await buildContextPrompt(deliverableWithDetails);
    } catch (err) {
      console.error('Error loading deliverable details:', err);
      setSelectedTxt2ImgDeliverable(null);
    }
  }

  // Validate workflow is appropriate for deliverable
  function validateWorkflowForDeliverable(deliverable: Deliverable & { task: Task & { function: Function }; acceptance_criteria: AcceptanceCriterion[] }): string | null {
    if (!selectedWorkflow || selectedWorkflow.workflow_id !== 'txt2img') {
      return null;
    }

    // Check if deliverable is for PowerPoint or other non-image tasks
    const filename = deliverable.filename.toLowerCase();
    const description = (deliverable.description || '').toLowerCase();
    
    // PowerPoint files should not use txt2img
    if (filename.includes('.pptx') || filename.includes('.ppt') || 
        description.includes('powerpoint') || description.includes('presentation')) {
      return 'This workflow (Text → Image) is not appropriate for PowerPoint deliverables. Please use a different workflow.';
    }

    return null;
  }

  // Build context prompt from IP, deliverable, acceptance criteria, and workflow
  async function buildContextPrompt(deliverable: Deliverable & { task: Task & { function: Function }; acceptance_criteria: AcceptanceCriterion[] }) {
    try {
      // Validate workflow
      const validationError = validateWorkflowForDeliverable(deliverable);
      if (validationError) {
        setContextPrompt(`ERROR: ${validationError}`);
        return;
      }

      // Check if deliverable has a stored context prompt
      if (deliverable.context_prompt) {
        console.log('Using stored context prompt from database');
        setContextPrompt(deliverable.context_prompt);
        return;
      }

      // Otherwise, build it dynamically
      let contextParts: string[] = [];

      // Get IP description
      if (ip && ip.description) {
        contextParts.push(`IP Description: ${ip.description}`);
      }

      // Add deliverable description
      if (deliverable.description) {
        contextParts.push(`Deliverable Description: ${deliverable.description}`);
      }

      // Add deliverable code and filename
      contextParts.push(`Deliverable: ${deliverable.deliverable_id} - ${deliverable.filename}`);

      // Add task and function context
      contextParts.push(`Task: ${deliverable.task.title}`);
      contextParts.push(`Core Function: ${deliverable.task.function.code} - ${deliverable.task.function.title}`);

      // Add acceptance criteria
      if (deliverable.acceptance_criteria && deliverable.acceptance_criteria.length > 0) {
        contextParts.push(`\nAcceptance Criteria:`);
        deliverable.acceptance_criteria.forEach((criterion, index) => {
          contextParts.push(`${index + 1}. ${criterion.criteria_text}`);
        });
      }

      // Add workflow description
      if (selectedWorkflow && selectedWorkflow.description) {
        contextParts.push(`\nWorkflow: ${selectedWorkflow.name}`);
        contextParts.push(`Workflow Description: ${selectedWorkflow.description}`);
      }

      // Add workflow validation note
      if (selectedWorkflow && selectedWorkflow.workflow_id === 'txt2img') {
        contextParts.push(`\nIMPORTANT: This workflow (${selectedWorkflow.name}) is designed for text-to-image generation.`);
        contextParts.push(`Generate a high-quality image that meets the deliverable requirements and acceptance criteria.`);
      }

      const fullContextPrompt = contextParts.join('\n\n');
      console.log('Built context prompt:', fullContextPrompt);
      setContextPrompt(fullContextPrompt);
    } catch (err) {
      console.error('Error building context prompt:', err);
      setContextPrompt(`Error building context prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Load last workflow result if exists
  async function loadLastWorkflowResult() {
    if (!selectedWorkflow || !selectedDeliverableId) return;

    try {
      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      if (!contributorId) return;

      const { data: resultData } = await supabase
        .from('workflow_results')
        .select('*')
        .eq('workflow_id', selectedWorkflow.workflow_id)
        .eq('deliverable_id', selectedDeliverableId)
        .eq('contributor_id', contributorId)
        .in('status', ['processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (resultData) {
        setContextPrompt(resultData.context_prompt);
        setUserPrompt(resultData.user_prompt);
        setCurrentResultId(resultData.id);
        
        if (resultData.status === 'processing') {
          setIsGenerating(true);
          // Poll for completion
          pollForCompletion(resultData.id);
        } else if (resultData.status === 'completed' && resultData.output_image_url) {
          setGeneratedImageUrl(resultData.output_image_url);
        }
      }
    } catch (err) {
      // No previous result found, that's okay
    }
  }

  // Poll for workflow completion
  async function pollForCompletion(resultId: string) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsGenerating(false);
        return;
      }

      try {
        const { data: resultData } = await supabase
          .from('workflow_results')
          .select('status, output_image_url')
          .eq('id', resultId)
          .single();

        if (resultData) {
          if (resultData.status === 'completed' && resultData.output_image_url) {
            setIsGenerating(false);
            setGeneratedImageUrl(resultData.output_image_url);
          } else if (resultData.status === 'failed') {
            setIsGenerating(false);
            alert('Image generation failed. Please try again.');
          } else {
            attempts++;
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        }
      } catch (err) {
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  }

  // Handle deliverable selection
  async function handleDeliverableSelect(deliverableId: string) {
    setSelectedDeliverableId(deliverableId);
    await loadDeliverableDetails(deliverableId);
    await loadLastWorkflowResult();
  }

  // Handle image generation
  async function handleGenerateImage() {
    if (!selectedTxt2ImgDeliverable || !userPrompt.trim()) {
      alert('Please select a deliverable and enter a prompt');
      return;
    }

    if (!contextPrompt) {
      alert('Context prompt not available');
      return;
    }

    // Check for validation errors
    if (contextPrompt.startsWith('ERROR:')) {
      alert(contextPrompt);
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedImageUrl(null);

      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      if (!contributorId) {
        alert('No contributor selected');
        return;
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextPrompt: contextPrompt,
          userPrompt: userPrompt,
          workflowId: selectedWorkflow!.workflow_id,
          deliverableId: selectedTxt2ImgDeliverable.id,
          contributorId: contributorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to generate image';
        const details = errorData.details ? ` Details: ${JSON.stringify(errorData.details)}` : '';
        console.error('Image generation error:', errorData);
        throw new Error(`${errorMessage}${details}`);
      }

      const data = await response.json();
      setGeneratedImageUrl(data.imageUrl);
      setCurrentResultId(data.resultId);
      setIsGenerating(false);
    } catch (err) {
      console.error('Error generating image:', err);
      alert(`Failed to generate image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  }

  // Handle archive
  async function handleArchive() {
    if (!selectedTxt2ImgDeliverable || !generatedImageUrl) {
      alert('No result to archive');
      return;
    }

    try {
      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      if (!contributorId) {
        alert('No contributor selected');
        return;
      }

      // Get contributor name
      const { data: contributorData } = await supabase
        .from('contributors')
        .select('name')
        .eq('id', contributorId)
        .single();

      const contributorName = contributorData?.name || 'Unknown';

      // Fetch the image through API route to avoid CORS issues
      const imageResponse = await fetch(`/api/download-workflow-image?url=${encodeURIComponent(generatedImageUrl)}`);
      
      if (!imageResponse.ok) {
        throw new Error('Failed to download image');
      }
      
      const imageBlob = await imageResponse.blob();

      // Create versioned file paths
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const contributorSlug = contributorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const category = selectedTxt2ImgDeliverable.task.function.category.toUpperCase();
      
      const promptFileName = `${selectedTxt2ImgDeliverable.deliverable_id}_prompt_${timestamp}_${contributorSlug}.txt`;
      const imageFileName = `${selectedTxt2ImgDeliverable.deliverable_id}_image_${timestamp}_${contributorSlug}.png`;
      
      const promptPath = `${slug}/${category}/${promptFileName}`;
      const imagePath = `${slug}/${category}/${imageFileName}`;

      // Convert prompt to blob
      const promptBlob = new Blob([userPrompt], { type: 'text/plain' });

      // Get or create workflow result
      let workflowResultId = currentResultId;
      // Default model name - should match what's used in generate-image API
      const defaultModelName = 'DALL-E 3';
      let modelUsed = defaultModelName;

      if (workflowResultId) {
        // Get model used from existing workflow result
        const { data: resultData } = await supabase
          .from('workflow_results')
          .select('model_used')
          .eq('id', workflowResultId)
          .single();

        if (resultData) {
          modelUsed = resultData.model_used || defaultModelName;
        }
      } else {
        // Create a new workflow result if one doesn't exist
        const { data: newResult, error: createError } = await supabase
          .from('workflow_results')
          .insert({
            workflow_id: selectedWorkflow!.workflow_id,
            deliverable_id: selectedTxt2ImgDeliverable.id,
            contributor_id: contributorId,
            context_prompt: contextPrompt,
            user_prompt: userPrompt,
            output_image_url: generatedImageUrl,
            model_used: defaultModelName,
            status: 'completed'
          })
          .select('id')
          .single();

        if (!createError && newResult) {
          workflowResultId = newResult.id;
          setCurrentResultId(workflowResultId);
        }
      }

      const promptFormData = new FormData();
      promptFormData.append('file', promptBlob, promptFileName);
      promptFormData.append('filePath', promptPath);
      promptFormData.append('deliverableId', selectedTxt2ImgDeliverable.id);
      promptFormData.append('filename', promptFileName);
      promptFormData.append('filetype', 'txt');
      promptFormData.append('contributorId', contributorId);
      promptFormData.append('modelUsed', modelUsed);

      // Create a new Blob with explicit content type to ensure image detection works
      const typedImageBlob = new Blob([imageBlob], { type: 'image/png' });
      
      const imageFormData = new FormData();
      imageFormData.append('file', typedImageBlob, imageFileName);
      imageFormData.append('filePath', imagePath);
      imageFormData.append('deliverableId', selectedTxt2ImgDeliverable.id);
      imageFormData.append('filename', imageFileName);
      imageFormData.append('filetype', 'png');
      imageFormData.append('contributorId', contributorId);
      imageFormData.append('modelUsed', modelUsed);

      const uploadPromises = [
        fetch('/api/upload-asset', {
          method: 'POST',
          body: promptFormData,
        }),
        fetch('/api/upload-asset', {
          method: 'POST',
          body: imageFormData,
        }),
      ];

      const uploadResults = await Promise.all(uploadPromises);
      
      // Check for errors and log details
      for (let i = 0; i < uploadResults.length; i++) {
        const result = uploadResults[i];
        const fileType = i === 0 ? 'prompt' : 'image';
        
        if (!result.ok) {
          const errorData = await result.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`Error uploading ${fileType}:`, errorData);
          throw new Error(`Failed to upload ${fileType}: ${errorData.error || 'Unknown error'}`);
        } else {
          const successData = await result.json().catch(() => ({}));
          console.log(`✅ Successfully uploaded ${fileType}:`, successData);
        }
      }

      // Update workflow result if it exists
      if (workflowResultId) {
        await supabase
          .from('workflow_results')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_prompt_path: promptPath,
            archived_image_path: imagePath,
          })
          .eq('id', workflowResultId);
      }

      // Reset to default state
      resetWorkflowState();
      alert('Results archived successfully!');
    } catch (err) {
      console.error('Error archiving:', err);
      alert(`Failed to archive: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!currentResultId) {
      alert('No result to delete');
      return;
    }

    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      await supabase
        .from('workflow_results')
        .update({ status: 'deleted' })
        .eq('id', currentResultId);

      resetWorkflowState();
    } catch (err) {
      console.error('Error deleting result:', err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Reset workflow state to default
  function resetWorkflowState() {
    setSelectedDeliverableId('');
    setSelectedTxt2ImgDeliverable(null);
    setContextPrompt('');
    setUserPrompt('');
    setGeneratedImageUrl(null);
    setCurrentResultId(null);
    setIsGenerating(false);
  }

  // Load deliverables when workflow modal opens for txt2img
  useEffect(() => {
    if (selectedWorkflow && selectedWorkflow.workflow_id === 'txt2img') {
      loadUserDeliverables();
    } else {
      setAvailableDeliverables([]);
      resetWorkflowState();
    }
  }, [selectedWorkflow, slug]);

  async function handleSubmit(workflow: WorkflowWithDetails) {
    // For txt2img, use special handler
    if (workflow.workflow_id === 'txt2img') {
      await handleGenerateImage();
      return;
    }

    // For other workflows, use original handler
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
        <div className="h-24 flex items-center justify-between px-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img src="/Title.svg" alt="UA" className="block h-8 w-auto" />
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-semibold truncate">Universal</span>
              <span className="font-semibold truncate">Asset</span>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="relative group p-2 hover:bg-[#c9c9c9] rounded transition-colors"
            title="Logout"
          >
            <img
              src="/logout.svg"
              alt="Logout"
              className="block h-5 w-5"
            />
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              logout
            </span>
          </button>
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
            <button
              onClick={() => router.push(`/ip/${slug}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#dfdfdf] hover:bg-[#c9c9c9] transition-colors cursor-pointer"
            >
              <img
                src={ipIconUrl}
                alt={ip.name}
                className="block h-8 w-8 rounded object-cover"
              />
              <span className="font-medium text-sm truncate">{ip.name}</span>
            </button>
          </div>
        )}

        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          {/* Contributions */}
          <button 
            onClick={() => router.push(`/ip/${slug}/contributions`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img src="/contributions.svg" alt="Contributions" className="block h-4 w-4" />
            </span>
            <span className="truncate">Contributions</span>
          </button>

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

          {/* Admin (section header) - Only visible to admins */}
          {isAdmin && (
            <div
              onMouseEnter={() => setIsAdminOpen(true)}
              onMouseLeave={() => setIsAdminOpen(false)}
            >
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
                onClick={() => setIsAdminOpen((open) => !open)}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded">
                  <img
                    src="/admin_tools_icon.svg"
                    alt="Admin"
                    className="block h-4 w-4"
                  />
                </span>
                <span className="truncate">Admin</span>
              </button>

              {/* Segmented Admin list */}
              {isAdminOpen && (
                <div className="mt-1 rounded-lg bg-[#dfdfdf] px-1.5 py-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/conductor?ip=${slug}`)}
                    className="w-full flex items-center justify-between rounded border border-black/10 bg-transparent hover:bg-white px-3 h-8 text-left text-[14px] cursor-pointer"
                  >
                    <span className="truncate">Conductor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/function-editor?ip=${slug}`)}
                    className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                  >
                    <span className="truncate">Function Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/contributors?ip=${slug}`)}
                    className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                  >
                    <span className="truncate">Contributors</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl">
          {/* IP Header */}
          {ip && ipIconUrl && (
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={ipIconUrl}
                  alt={ip.name}
                  className="block h-12 w-12 rounded object-cover flex-shrink-0"
                />
                <div className="flex flex-col justify-center h-12">
                  <h1 className="text-3xl font-semibold tracking-tight leading-tight">Workflows</h1>
                  <p className="text-sm text-black/60 leading-tight">{ip.name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
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
                  resetWorkflowState();
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

              {/* Text2Img Special UI */}
              {selectedWorkflow.workflow_id === 'txt2img' ? (
                <div className="pt-4 border-t border-[#e0e0e0] space-y-4">
                  {/* Deliverable Selection */}
                  <div>
                    <label className="text-xs font-medium text-black/60 mb-1 block">
                      Select Deliverable <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDeliverableId}
                      onChange={(e) => handleDeliverableSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                    >
                      <option value="">-- Select a deliverable --</option>
                      {availableDeliverables.map(del => (
                        <option key={del.id} value={del.id}>
                          {del.deliverable_id}: {del.filename}
                        </option>
                      ))}
                    </select>
                    {availableDeliverables.length === 0 && (
                      <p className="text-xs text-black/60 mt-1">No deliverables assigned to you</p>
                    )}
                  </div>

                  {/* Context Prompt (read-only) */}
                  {selectedTxt2ImgDeliverable && (
                    <div>
                      <label className="text-xs font-medium text-black/60 mb-1 block">Project Context Prompt:</label>
                      <textarea
                        value={contextPrompt || 'Loading context prompt...'}
                        readOnly
                        rows={8}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          contextPrompt.startsWith('ERROR:')
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-[#e0e0e0] bg-gray-50'
                        }`}
                      />
                    </div>
                  )}

                  {/* User Prompt */}
                  {selectedTxt2ImgDeliverable && (
                    <div>
                      <label className="text-xs font-medium text-black/60 mb-1 block">
                        Your Prompt <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder={userPrompt ? "" : "Add your own prompt for this deliverable..."}
                        rows={4}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                      />
                    </div>
                  )}

                  {/* Generate Button */}
                  {selectedTxt2ImgDeliverable && (
                    <button
                      onClick={handleGenerateImage}
                      disabled={isGenerating || !userPrompt.trim()}
                      className={`w-full px-4 py-2 rounded-lg text-sm transition-colors ${
                        isGenerating || !userPrompt.trim()
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-[#c9c9c9] hover:bg-[#b0b0b0]"
                      }`}
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                          <span>Generating image...</span>
                        </div>
                      ) : (
                        "Generate Image"
                      )}
                    </button>
                  )}

                  {/* Generated Image */}
                  {generatedImageUrl && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-black/60 mb-1 block">Generated Image:</label>
                      <div className="w-full border border-[#e0e0e0] rounded-lg overflow-hidden">
                        <img
                          src={generatedImageUrl}
                          alt="Generated"
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleArchive}
                          className="flex-1 px-4 py-2 rounded-lg text-sm bg-green-100 hover:bg-green-200 text-green-800 transition-colors"
                        >
                          Archive
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 px-4 py-2 rounded-lg text-sm bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Workflow Input/Output */
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

