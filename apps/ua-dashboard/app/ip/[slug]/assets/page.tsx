"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Deliverable, Task, Function, IP, AcceptanceCriterion, AssetHistoryWithContributor } from "@/types/ip";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";

interface DeliverableWithTask extends Deliverable {
  task: Task & { function: Function };
}

export default function AssetsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [deliverables, setDeliverables] = useState<DeliverableWithTask[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<DeliverableWithTask[]>([]);
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
  
  // Dropdown options
  const [categories, setCategories] = useState<string[]>([]);
  const [functions, setFunctions] = useState<Array<{ code: string; title: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ code: string; task_id: string; title: string }>>([]);
  const [deliverablesList, setDeliverablesList] = useState<Array<{ id: string; deliverable_id: string; title: string }>>([]);
  
  // Modal state
  const [selectedDeliverableDetail, setSelectedDeliverableDetail] = useState<DeliverableWithTask | null>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterion[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryWithContributor[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Image thumbnails cache (key: asset_history.id)
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  
  // Asset history for all deliverables (key: deliverable_id)
  const [allAssetHistory, setAllAssetHistory] = useState<Map<string, AssetHistoryWithContributor[]>>(new Map());
  
  // Assigned deliverable IDs for current contributor (Set for fast lookup)
  const [assignedDeliverableIds, setAssignedDeliverableIds] = useState<Set<string>>(new Set());
  
  // Toggle between "my assets" and "all assets"
  const [showOnlyMyAssets, setShowOnlyMyAssets] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [slug]);

  useEffect(() => {
    loadContributorAssignments();

    // Listen for contributor changes to reload assignments
    function handleContributorChange() {
      loadContributorAssignments();
    }

    window.addEventListener('contributorChanged', handleContributorChange);

    return () => {
      window.removeEventListener('contributorChanged', handleContributorChange);
    };
  }, [slug]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedFunction, selectedTask, selectedDeliverable, deliverables, assignedDeliverableIds, showOnlyMyAssets]);

  async function loadAssets() {
    try {
      setLoading(true);
      setError(null);

      // Get IP data (including name and icon)
      const { data: ipData, error: ipError } = await supabase
        .from("ips")
        .select("*")
        .eq("slug", slug)
        .single();

      if (ipError || !ipData) throw new Error("IP not found");
      
      setIp(ipData);

      // Handle IP icon URL (use local for dev, Supabase signed URLs for prod)
      const iconPath = ipData.icon_url;
      if (iconPath) {
        const isDevelopment = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (isDevelopment) {
          // Extract filename (remove 'ip-assets/' prefix if present)
          const filename = iconPath.replace(/^ip-assets\//, '');
          setIpIconUrl(`/icons/${filename}`);
        } else {
          // For production, generate signed URL from Supabase Storage
          try {
            const filename = iconPath.replace(/^ip-assets\//, '');
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('ip-assets')
              .createSignedUrl(filename, 3600); // 1 hour expiry
            
            if (!urlError && signedUrl) {
              setIpIconUrl(signedUrl.signedUrl);
            } else {
              // Fallback to local path
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

      // Get functions for this IP
      const { data: ipFunctions, error: ipFunctionsError } = await supabase
        .from("ip_functions")
        .select("function_code")
        .eq("ip_id", ipData.id);

      if (ipFunctionsError) throw ipFunctionsError;
      if (!ipFunctions || ipFunctions.length === 0) {
        setDeliverables([]);
        setLoading(false);
        return;
      }

      const functionCodes = ipFunctions.map(f => f.function_code);

      // Get all deliverables with their tasks and functions
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          function:functions(*)
        `)
        .in("function_code", functionCodes)
        .order("display_order");

      if (tasksError) throw tasksError;

      // Get IP-specific deliverables only (where ip_id matches)
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from("deliverables")
        .select("*")
        .eq("ip_id", ipData.id) // Only get IP-specific deliverables
        .order("display_order");

      if (deliverablesError) throw deliverablesError;

      // Combine deliverables with their tasks and functions
      const deliverablesWithTasks: DeliverableWithTask[] = deliverablesData
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
        .filter((d): d is DeliverableWithTask => d !== null);

      setDeliverables(deliverablesWithTasks);

      // Extract unique categories, functions, tasks, and deliverables for filters
      const uniqueCategories = Array.from(new Set(deliverablesWithTasks.map(d => d.task.function.category)))
        .sort();
      setCategories(uniqueCategories);

      // Extract unique functions
      const functionsMap = new Map<string, { code: string; title: string }>();
      deliverablesWithTasks.forEach(d => {
        if (!functionsMap.has(d.task.function.code)) {
          functionsMap.set(d.task.function.code, {
            code: d.task.function.code,
            title: d.task.function.title
          });
        }
      });
      const uniqueFunctions = Array.from(functionsMap.values())
        .sort((a, b) => a.code.localeCompare(b.code));
      setFunctions(uniqueFunctions);

      // Deduplicate tasks by task_id (using Map to ensure uniqueness, include title)
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
      const uniqueTasks = Array.from(tasksMap.values())
        .sort((a, b) => a.code.localeCompare(b.code) || a.task_id.localeCompare(b.task_id));
      setTasks(uniqueTasks);

      // Deduplicate deliverables (include filename as title)
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
      const uniqueDeliverables = Array.from(deliverablesMap.values())
        .sort((a, b) => a.deliverable_id.localeCompare(b.deliverable_id));
      setDeliverablesList(uniqueDeliverables);

      // Preload asset history for all deliverables in the background
      preloadAllAssetHistory(deliverablesWithTasks.map(d => d.id));

      setLoading(false);
    } catch (err) {
      console.error("Error loading assets:", err);
      setError(err instanceof Error ? err.message : "Failed to load assets");
      setLoading(false);
    }
  }

  async function loadContributorAssignments() {
    try {
      // Get current contributor ID from sessionStorage
      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      if (!contributorId) {
        setAssignedDeliverableIds(new Set());
        return;
      }

      // Fetch assignments for current contributor
      const { data, error } = await supabase
        .from("contributor_deliverables")
        .select("deliverable_id")
        .eq("contributor_id", contributorId);

      if (error) {
        console.error("Error loading contributor assignments:", error);
        setAssignedDeliverableIds(new Set());
        return;
      }

      // Create a Set of assigned deliverable IDs
      const assignedIds = new Set<string>((data || []).map(item => item.deliverable_id));
      setAssignedDeliverableIds(assignedIds);
    } catch (err) {
      console.error("Error in loadContributorAssignments:", err);
      setAssignedDeliverableIds(new Set());
    }
  }

  function applyFilters() {
    let filtered = [...deliverables];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.filename.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.deliverable_id.toLowerCase().includes(query) ||
        d.task.task_id.toLowerCase().includes(query) ||
        d.task.function.code.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(d => d.task.function.category === selectedCategory);
    }

    // Core Function filter
    if (selectedFunction) {
      filtered = filtered.filter(d => d.task.function.code === selectedFunction);
    }

    // Task filter
    if (selectedTask) {
      filtered = filtered.filter(d => d.task.task_id === selectedTask);
    }

    // Deliverable filter
    if (selectedDeliverable) {
      filtered = filtered.filter(d => d.id === selectedDeliverable);
    }

    // Filter by assigned assets if "my assets" mode is enabled
    if (showOnlyMyAssets && assignedDeliverableIds.size > 0) {
      filtered = filtered.filter(d => assignedDeliverableIds.has(d.id));
    }

    // Sort: assigned deliverables first, then by display_order
    filtered.sort((a, b) => {
      const aIsAssigned = assignedDeliverableIds.has(a.id);
      const bIsAssigned = assignedDeliverableIds.has(b.id);
      
      // If one is assigned and the other isn't, assigned comes first
      if (aIsAssigned && !bIsAssigned) return -1;
      if (!aIsAssigned && bIsAssigned) return 1;
      
      // If both are assigned or both are not assigned, sort by display_order
      return a.display_order - b.display_order;
    });

    setFilteredDeliverables(filtered);
  }

  function getThumbnailPlaceholder(filetype: string | null): string {
    if (!filetype) return "📄";
    const type = filetype.toLowerCase();
    if (type === "pdf") return "📕";
    if (["doc", "docx"].includes(type)) return "📘";
    if (["xls", "xlsx"].includes(type)) return "📗";
    if (["ppt", "pptx"].includes(type)) return "📙";
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(type)) return "🖼️";
    if (["mp4", "mov", "avi"].includes(type)) return "🎬";
    if (["mp3", "wav", "aac"].includes(type)) return "🎵";
    return "📄";
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800";
      case "Completed": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Needs Review": return "bg-orange-100 text-orange-800";
      case "Assigned": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  // Extract short task code (e.g., "E1-T1" -> "T1")
  function getShortTaskCode(taskId: string): string {
    const parts = taskId.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : taskId;
  }

  // Extract short deliverable code (e.g., "E1-T1-D1" -> "D1")
  function getShortDeliverableCode(deliverableId: string): string {
    const parts = deliverableId.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : deliverableId;
  }

  async function handleUpload(file: File, deliverable: DeliverableWithTask) {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${deliverable.deliverable_id}.${fileExt}`;
      const filePath = `${slug}/${deliverable.task.function.category.toUpperCase()}/${fileName}`;

      // Get current contributor ID from sessionStorage
      const contributorId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedContributorId') 
        : null;

      // Use API route to upload (bypasses RLS)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filePath', filePath);
      formData.append('deliverableId', deliverable.id);
      formData.append('filename', file.name);
      formData.append('filetype', fileExt || '');
      if (contributorId) {
        formData.append('contributorId', contributorId);
      }

      let response: Response;
      try {
        response = await fetch('/api/upload-asset', {
          method: 'POST',
          body: formData,
        });
      } catch (fetchError) {
        // Network error or fetch failed
        console.error("Fetch error:", fetchError);
        throw new Error(
          `Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server'}. ` +
          `Please check your connection and try again.`
        );
      }

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      await loadAssets();
      // Reload history for this deliverable to update cache and modal
      await loadAssetHistory(deliverable.id);
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Error uploading file:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      alert(`Failed to upload file: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadFromPath(storagePath: string, filename: string) {
    try {
      if (!storagePath) {
        alert("No file available for download");
        return;
      }

      console.log(`[Download] Attempting to download: ${storagePath}`);

      // Use API route to generate signed URL (bypasses RLS)
      const response = await fetch(`/api/download-asset?path=${encodeURIComponent(storagePath)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const { signedUrl } = await response.json();
      
      if (!signedUrl) {
        alert("File not found");
        return;
      }

      console.log(`[Download] Successfully generated signed URL`);

      // Fetch the file using the signed URL
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }

      const blob = await fileResponse.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert(`Failed to download file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function handleDownload(deliverable: DeliverableWithTask) {
    if (!deliverable.storage_path) {
      alert("No file available for download");
      return;
    }
    await handleDownloadFromPath(deliverable.storage_path, deliverable.filename);
  }

  async function handleStatusUpdate(deliverable: DeliverableWithTask, newStatus: 'Approved' | 'Needs Review') {
    try {
      const { error } = await supabase
        .from("deliverables")
        .update({ status: newStatus })
        .eq("id", deliverable.id);

      if (error) throw error;

      await loadAssets();
      setSelectedDeliverableDetail(null);
      alert(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function loadAcceptanceCriteria(deliverableId: string) {
    try {
      const { data, error } = await supabase
        .from("acceptance_criteria")
        .select("*")
        .eq("deliverable_id", deliverableId)
        .order("display_order");

      if (error) throw error;
      setAcceptanceCriteria(data || []);
    } catch (err) {
      console.error("Error loading acceptance criteria:", err);
      setAcceptanceCriteria([]);
    }
  }

  async function loadAssetHistory(deliverableId: string) {
    try {
      const { data, error } = await supabase
        .from("asset_history")
        .select(`
          *,
          contributor:contributors(name)
        `)
        .eq("deliverable_id", deliverableId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      
      const historyWithContributors: AssetHistoryWithContributor[] = (data || []).map((item: any) => ({
        ...item,
        contributor_name: item.contributor?.name || null
      }));
      
      setAssetHistory(historyWithContributors);
      
      // Update the cache
      setAllAssetHistory(prev => {
        const updated = new Map(prev);
        updated.set(deliverableId, historyWithContributors);
        return updated;
      });
      
      // Load thumbnails and images for image files
      await loadImageUrls(historyWithContributors);
    } catch (err) {
      console.error("Error loading asset history:", err);
      setAssetHistory([]);
    }
  }

  // Load image URLs (thumbnails and full images) for image files
  async function loadImageUrls(history: AssetHistoryWithContributor[]) {
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Start with existing URLs to avoid losing previously loaded ones
    const newThumbnailUrls = new Map(thumbnailUrls);
    const newImageUrls = new Map(imageUrls);

    for (const item of history) {
      // Skip if we already have URLs for this item
      if (newThumbnailUrls.has(item.id) && newImageUrls.has(item.id)) {
        continue;
      }

      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
        item.filename.toLowerCase().endsWith(`.${ext}`) || 
        item.storage_path.toLowerCase().endsWith(`.${ext}`)
      );

      if (isImage) {
        // Try to get thumbnail URL first
        if (item.thumbnail_path) {
          try {
            const response = await fetch(`/api/get-signed-url?path=${encodeURIComponent(item.thumbnail_path)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.signedUrl) {
                newThumbnailUrls.set(item.id, data.signedUrl);
              }
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error(`Error loading thumbnail for ${item.filename}:`, errorData.error || 'Unknown error');
            }
          } catch (err) {
            console.error(`Error loading thumbnail for ${item.filename}:`, err);
          }
        }

        // Get full image URL
        try {
          const response = await fetch(`/api/get-signed-url?path=${encodeURIComponent(item.storage_path)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.signedUrl) {
              newImageUrls.set(item.id, data.signedUrl);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Error loading image for ${item.filename}:`, errorData.error || 'Unknown error');
          }
        } catch (err) {
          console.error(`Error loading image for ${item.filename}:`, err);
        }
      }
    }

    setThumbnailUrls(newThumbnailUrls);
    setImageUrls(newImageUrls);
  }

  // Preload asset history for all deliverables in the background
  async function preloadAllAssetHistory(deliverableIds: string[]) {
    try {
      // Load all asset history in parallel
      const historyPromises = deliverableIds.map(async (deliverableId) => {
        try {
          const { data, error } = await supabase
            .from("asset_history")
            .select(`
              *,
              contributor:contributors(name)
            `)
            .eq("deliverable_id", deliverableId)
            .order("uploaded_at", { ascending: false });

          if (error) {
            console.error(`Error loading history for deliverable ${deliverableId}:`, error);
            return { deliverableId, history: [] };
          }

          const historyWithContributors: AssetHistoryWithContributor[] = (data || []).map((item: any) => ({
            ...item,
            contributor_name: item.contributor?.name || null
          }));

          return { deliverableId, history: historyWithContributors };
        } catch (err) {
          console.error(`Error loading history for deliverable ${deliverableId}:`, err);
          return { deliverableId, history: [] };
        }
      });

      const results = await Promise.all(historyPromises);

      // Update cache with all loaded history
      setAllAssetHistory(prev => {
        const updated = new Map(prev);
        results.forEach(({ deliverableId, history }) => {
          updated.set(deliverableId, history);
        });
        return updated;
      });

      // Load image URLs for all image files
      const allImageItems: AssetHistoryWithContributor[] = [];
      results.forEach(({ history }) => {
        const imageFiles = getImageFiles(history);
        allImageItems.push(...imageFiles);
      });

      if (allImageItems.length > 0) {
        await loadImageUrls(allImageItems);
      }
    } catch (err) {
      console.error("Error preloading asset history:", err);
    }
  }

  // Get image files from asset history
  function getImageFiles(history: AssetHistoryWithContributor[]): AssetHistoryWithContributor[] {
    return history.filter(item => {
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
        item.filename.toLowerCase().endsWith(`.${ext}`) || 
        item.storage_path.toLowerCase().endsWith(`.${ext}`)
      );
      return isImage;
    });
  }

  function handleDeliverableSelect(deliverable: DeliverableWithTask) {
    setSelectedDeliverableDetail(deliverable);
    loadAcceptanceCriteria(deliverable.id);
    // Use cached asset history if available, otherwise load it
    const cachedHistory = allAssetHistory.get(deliverable.id);
    if (cachedHistory) {
      setAssetHistory(cachedHistory);
      // Ensure image URLs are loaded
      loadImageUrls(cachedHistory);
    } else {
      loadAssetHistory(deliverable.id);
    }
  }

  // Get filtered functions based on category
  const filteredFunctions = selectedCategory
    ? functions.filter(f => {
        const deliverable = deliverables.find(d => d.task.function.code === f.code);
        return deliverable?.task.function.category === selectedCategory;
      })
    : functions;

  // Get filtered tasks based on core function
  // When function is selected, only show tasks from that function
  const filteredTasks = selectedFunction
    ? (() => {
        const tasksMap = new Map<string, { code: string; task_id: string; title: string }>();
        deliverables.forEach(d => {
          if (d.task.function.code === selectedFunction) {
            if (!tasksMap.has(d.task.task_id)) {
              tasksMap.set(d.task.task_id, {
                code: d.task.function.code,
                task_id: d.task.task_id,
                title: d.task.title
              });
            }
          }
        });
        return Array.from(tasksMap.values())
          .sort((a, b) => a.task_id.localeCompare(b.task_id));
      })()
    : [];

  // Get filtered deliverables based on task
  const filteredDeliverablesForDropdown = selectedTask
    ? deliverablesList.filter(d => {
        const deliverable = deliverables.find(del => del.id === d.id);
        return deliverable?.task.task_id === selectedTask;
      })
    : deliverablesList;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading assets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - same as IP detail page */}
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
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img src="/list.svg" alt="Workflows" className="block h-4 w-4" />
            </span>
            <span className="truncate">Workflows</span>
          </button>

          <button 
            onClick={() => router.push(`/ip/${slug}/assets`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-[#c9c9c9] transition-colors"
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
                  <h1 className="text-3xl font-semibold tracking-tight leading-tight">Assets</h1>
                  <p className="text-sm text-black/60 leading-tight">{ip.name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Toggle between "My Assets" and "All Assets" */}
              <div className="flex items-center gap-2 border border-[#e0e0e0] rounded-lg p-1 bg-white">
                <button
                  onClick={() => setShowOnlyMyAssets(true)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    showOnlyMyAssets
                      ? 'bg-[#c9c9c9] text-black'
                      : 'bg-transparent text-black/60 hover:text-black'
                  }`}
                >
                  My Assets
                </button>
                <button
                  onClick={() => setShowOnlyMyAssets(false)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    !showOnlyMyAssets
                      ? 'bg-[#c9c9c9] text-black'
                      : 'bg-transparent text-black/60 hover:text-black'
                  }`}
                >
                  All Assets
                </button>
              </div>
            </div>
            <div className="text-xs text-black/40 font-mono">
              {showOnlyMyAssets 
                ? `${filteredDeliverables.length} ${filteredDeliverables.length === 1 ? 'asset' : 'assets'} assigned to you`
                : `${filteredDeliverables.length} out of ${deliverables.length} assets${assignedDeliverableIds.size > 0 ? ` (${filteredDeliverables.filter(d => assignedDeliverableIds.has(d.id)).length} assigned to you)` : ''}`
              }
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div>
              <input
                type="text"
                placeholder="Search assets by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex gap-4 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedFunction("");
                  setSelectedTask("");
                  setSelectedDeliverable("");
                }}
                className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
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
                className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm disabled:opacity-50"
              >
                <option value="">All Core Functions</option>
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
                className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm disabled:opacity-50"
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
                className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm disabled:opacity-50"
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

          {/* Asset cards grid */}
          {filteredDeliverables.length === 0 ? (
            <div className="text-center py-12 text-black/60">
              {loading ? "Loading..." : "No assets found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDeliverables.map((deliverable) => {
                const isAssigned = assignedDeliverableIds.has(deliverable.id);
                return (
                <div
                  key={deliverable.id}
                  onClick={() => handleDeliverableSelect(deliverable)}
                  className={`border border-[#e0e0e0] rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow hover:-translate-y-1 ${
                    isAssigned ? 'bg-gray-100' : 'bg-white'
                  }`}
                >
                  {/* Filename */}
                  {deliverable.filename && (
                    <div className="text-xs font-medium mb-2 line-clamp-1">
                      {deliverable.filename}
                    </div>
                  )}

                  {/* Thumbnail */}
                  {(() => {
                    // Get image files from asset history for this deliverable
                    const deliverableHistory = allAssetHistory.get(deliverable.id) || [];
                    const imageFiles = deliverableHistory.filter(item => 
                      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                        item.filename.toLowerCase().endsWith(`.${ext}`) ||
                        item.storage_path.toLowerCase().endsWith(`.${ext}`)
                      )
                    );
                    
                    if (imageFiles.length > 0) {
                      // Show first image thumbnail
                      const firstImage = imageFiles[0];
                      const thumbnailUrl = thumbnailUrls.get(firstImage.id);
                      const imageUrl = imageUrls.get(firstImage.id);
                      
                      return (
                        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative mb-3">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={firstImage.filename}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to full image if thumbnail fails
                                if (imageUrl) {
                                  (e.target as HTMLImageElement).src = imageUrl;
                                } else {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="text-4xl">${getThumbnailPlaceholder(deliverable.filetype)}</div>`;
                                  }
                                }
                              }}
                            />
                          ) : imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={firstImage.filename}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="text-4xl">${getThumbnailPlaceholder(deliverable.filetype)}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="text-4xl">{getThumbnailPlaceholder(deliverable.filetype)}</div>
                          )}
                          {imageFiles.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                              +{imageFiles.length - 1}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // No images, show placeholder
                    return (
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-4xl mb-3">
                        {getThumbnailPlaceholder(deliverable.filetype)}
                      </div>
                    );
                  })()}

                  {/* Code */}
                  <div className="text-xs font-mono text-black/60 mb-1">
                    {deliverable.deliverable_id}
                  </div>

                  {/* Description */}
                  <div className="text-sm font-medium mb-2 line-clamp-2">
                    {deliverable.description || deliverable.filename}
                  </div>

                  {/* Status */}
                  <div className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(deliverable.status || 'Assigned')}`}>
                    {deliverable.status || 'Assigned'}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating detail modal */}
      {selectedDeliverableDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Asset Details</h2>
              <button
                onClick={() => {
                  setSelectedDeliverableDetail(null);
                  setAcceptanceCriteria([]);
                  setAssetHistory([]);
                }}
                className="text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Image Gallery */}
              {(() => {
                const imageFiles = getImageFiles(assetHistory);
                
                if (imageFiles.length > 0) {
                  return (
                    <div>
                      <label className="text-xs font-medium text-black/60 mb-2 block">
                        Images ({imageFiles.length})
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {imageFiles.map((imageItem) => {
                          const thumbnailUrl = thumbnailUrls.get(imageItem.id);
                          const imageUrl = imageUrls.get(imageItem.id);
                          
                          return (
                            <div key={imageItem.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={imageItem.filename}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    if (imageUrl) {
                                      window.open(imageUrl, '_blank');
                                    }
                                  }}
                                  onError={(e) => {
                                    if (imageUrl) {
                                      (e.target as HTMLImageElement).src = imageUrl;
                                    }
                                  }}
                                />
                              ) : imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={imageItem.filename}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  {getThumbnailPlaceholder('image')}
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                                {imageItem.filename}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // No images, show placeholder
                return (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-6xl">
                    {getThumbnailPlaceholder(selectedDeliverableDetail.filetype)}
                  </div>
                );
              })()}

              {/* Code */}
              <div>
                <label className="text-xs font-medium text-black/60">Code</label>
                <div className="text-sm font-mono">
                  {selectedDeliverableDetail.deliverable_id}
                </div>
              </div>

              {/* Filename */}
              <div>
                <label className="text-xs font-medium text-black/60">Filename</label>
                {selectedDeliverableDetail.storage_path ? (
                  <button
                    onClick={() => handleDownloadFromPath(selectedDeliverableDetail.storage_path!, selectedDeliverableDetail.filename)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {selectedDeliverableDetail.filename}
                  </button>
                ) : (
                  <div className="text-sm">{selectedDeliverableDetail.filename}</div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-black/60">Description</label>
                <div className="text-sm">{selectedDeliverableDetail.description || "No description"}</div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-black/60">Status</label>
                <div className={`inline-block px-3 py-1 rounded text-sm ${getStatusColor(selectedDeliverableDetail.status || 'Assigned')}`}>
                  {selectedDeliverableDetail.status || 'Assigned'}
                </div>
              </div>

              {/* Acceptance Criteria */}
              {acceptanceCriteria.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-black/60 mb-2 block">Acceptance Criteria</label>
                  <ol className="list-decimal list-inside space-y-1">
                    {acceptanceCriteria.map((criterion) => (
                      <li key={criterion.id} className="text-sm">
                        {criterion.criteria_text}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Asset History */}
              {assetHistory.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-black/60 mb-2 block">Upload History</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {assetHistory.map((historyItem) => (
                      <div key={historyItem.id} className="border border-[#e0e0e0] rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <button
                            onClick={() => handleDownloadFromPath(historyItem.storage_path, historyItem.filename)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          >
                            {historyItem.filename}
                          </button>
                          <span className="text-black/60">
                            {new Date(historyItem.uploaded_at).toLocaleString()}
                          </span>
                        </div>
                        {historyItem.contributor_name && (
                          <div className="text-black/60">
                            Uploaded by: {historyItem.contributor_name}
                            {historyItem.model_used && ` (using ${historyItem.model_used})`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[#e0e0e0]">
                <label className="flex-1 min-w-[120px]">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, selectedDeliverableDetail);
                    }}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className={`px-4 py-2 rounded-lg text-sm text-center cursor-pointer transition-colors ${
                    uploading 
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                      : "bg-[#c9c9c9] hover:bg-[#b0b0b0]"
                  }`}>
                    {uploading ? "Uploading..." : "UPLOAD"}
                  </div>
                </label>


                <button
                  onClick={() => handleStatusUpdate(selectedDeliverableDetail, "Approved")}
                  className="px-4 py-2 rounded-lg text-sm bg-green-100 hover:bg-green-200 text-green-800 transition-colors"
                >
                  APPROVE
                </button>

                <button
                  onClick={() => handleStatusUpdate(selectedDeliverableDetail, "Needs Review")}
                  className="px-4 py-2 rounded-lg text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 transition-colors"
                >
                  NEEDS REVIEW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

