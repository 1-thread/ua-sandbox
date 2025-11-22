"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Deliverable, Task, Function, IP, Contributor, ContributorDeliverable, AssetHistoryWithContributor } from "@/types/ip";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";

interface DeliverableWithTask extends Deliverable {
  task: Task & { function: Function };
}

interface DeliverableWithContributor extends DeliverableWithTask {
  contributorDeliverable: ContributorDeliverable;
}

export default function ContributionsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [selectedContributorId, setSelectedContributorId] = useState<string>("");
  const [assignedDeliverables, setAssignedDeliverables] = useState<DeliverableWithContributor[]>([]);
  const [completedDeliverables, setCompletedDeliverables] = useState<DeliverableWithContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map());
  // Asset history for each deliverable (key: deliverable.id, value: array of all items)
  const [assetHistory, setAssetHistory] = useState<Map<string, AssetHistoryWithContributor[]>>(new Map());
  // Thumbnail and image URLs (key: asset_history.id)
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadContributors();
    loadIPData();
  }, [slug]);

  useEffect(() => {
    if (contributors.length > 0 && !selectedContributorId) {
      // Load from sessionStorage or default to first contributor
      const storedId = typeof window !== 'undefined' ? sessionStorage.getItem('selectedContributorId') : null;
      const defaultId = storedId || contributors[0]?.id || '';
      if (defaultId) {
        setSelectedContributorId(defaultId);
      }
    }
  }, [contributors]);

  useEffect(() => {
    if (selectedContributorId) {
      loadContributorDeliverables(selectedContributorId);
    } else {
      setAssignedDeliverables([]);
      setCompletedDeliverables([]);
    }
  }, [selectedContributorId, slug]);

  // Listen for contributor changes from ProfileSelector
  useEffect(() => {
    function handleContributorChange(event: Event) {
      const customEvent = event as CustomEvent<string>;
      const contributorId = customEvent.detail;
      setSelectedContributorId(contributorId);
    }

    window.addEventListener('contributorChanged', handleContributorChange);
    return () => {
      window.removeEventListener('contributorChanged', handleContributorChange);
    };
  }, []);

  async function loadIPData() {
    try {
      const { data: ipData, error: ipError } = await supabase
        .from("ips")
        .select("*")
        .eq("slug", slug)
        .single();

      if (ipError || !ipData) return;
      
      setIp(ipData);

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
    } catch (err) {
      console.error("Error loading IP data:", err);
    }
  }

  async function loadContributors() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contributors")
        .select("*")
        .order("name");

      if (error) throw error;
      setContributors(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading contributors:", err);
      setError(err instanceof Error ? err.message : "Failed to load contributors");
      setLoading(false);
    }
  }

  async function loadContributorDeliverables(contributorId: string) {
    try {
      setLoading(true);
      
      // Get IP ID
      const { data: ipData } = await supabase
        .from("ips")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!ipData) return;

      // Get contributor deliverables
      const { data: contributorDeliverables, error: cdError } = await supabase
        .from("contributor_deliverables")
        .select("*")
        .eq("contributor_id", contributorId);

      if (cdError) throw cdError;

      // Get all deliverable IDs
      const deliverableIds = (contributorDeliverables || []).map(cd => cd.deliverable_id);

      if (deliverableIds.length === 0) {
        setAssignedDeliverables([]);
        setCompletedDeliverables([]);
        setLoading(false);
        return;
      }

      // Get deliverables with their tasks and functions, filtered by IP
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from("deliverables")
        .select(`
          *,
          tasks!inner(
            *,
            functions!inner(*)
          )
        `)
        .in("id", deliverableIds)
        .eq("ip_id", ipData.id);

      if (deliverablesError) throw deliverablesError;

      // Combine deliverables with contributor deliverable info
      const deliverablesWithContributor: DeliverableWithContributor[] = (deliverablesData || []).map(deliverable => {
        const contributorDeliverable = contributorDeliverables.find(cd => cd.deliverable_id === deliverable.id);
        return {
          ...deliverable,
          task: deliverable.tasks as Task & { function: Function },
          contributorDeliverable: contributorDeliverable!,
        };
      });

      // Separate into assigned and completed
      // Assigned: status is 'Assigned' OR deliverable status is 'Needs Review'
      // Completed: status is 'Completed' AND deliverable status is not 'Needs Review'
      const assigned = deliverablesWithContributor.filter(d => 
        d.contributorDeliverable.status === 'Assigned' || d.status === 'Needs Review'
      );
      const completed = deliverablesWithContributor.filter(d => 
        d.contributorDeliverable.status === 'Completed' && d.status !== 'Needs Review'
      );

      setAssignedDeliverables(assigned);
      setCompletedDeliverables(completed);

      // Load asset URLs for deliverables with storage_path
      const assetUrlMap = new Map<string, string>();
      await Promise.all(
        deliverablesWithContributor
          .filter(d => d.storage_path)
          .map(async (deliverable) => {
            try {
              const { data: signedUrl, error: urlError } = await supabase.storage
                .from('ip-assets')
                .createSignedUrl(deliverable.storage_path!, 3600);
              
              if (!urlError && signedUrl) {
                assetUrlMap.set(deliverable.id, signedUrl.signedUrl);
              }
            } catch (err) {
              console.error(`Error loading asset for ${deliverable.id}:`, err);
            }
          })
      );
      setAssetUrls(assetUrlMap);

      setLoading(false);
    } catch (err) {
      console.error("Error loading contributor deliverables:", err);
      setError(err instanceof Error ? err.message : "Failed to load deliverables");
      setLoading(false);
    }
  }

  function toggleDeliverable(deliverableId: string) {
    const newSet = new Set(expandedDeliverables);
    if (newSet.has(deliverableId)) {
      newSet.delete(deliverableId);
    } else {
      newSet.add(deliverableId);
      // Load asset history when expanding
      loadAssetHistory(deliverableId);
    }
    setExpandedDeliverables(newSet);
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

      // Update asset history map
      setAssetHistory(prev => {
        const updated = new Map(prev);
        updated.set(deliverableId, historyWithContributors);
        return updated;
      });

      // Load image URLs for image files
      await loadImageUrls(historyWithContributors);
    } catch (err) {
      console.error("Error loading asset history:", err);
    }
  }

  async function loadImageUrls(historyItems: AssetHistoryWithContributor[]) {
    const newThumbnailUrls = new Map(thumbnailUrls);
    const newImageUrls = new Map(imageUrls);

    for (const item of historyItems) {
      // Skip if we already have URLs
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
          }
        } catch (err) {
          console.error(`Error loading image for ${item.filename}:`, err);
        }
      }
    }

    setThumbnailUrls(newThumbnailUrls);
    setImageUrls(newImageUrls);
  }

  function getThumbnailPlaceholder(filetype: string | null): string {
    if (!filetype) return "📄";
    const type = filetype.toLowerCase();
    if (["pdf"].includes(type)) return "📕";
    if (["doc", "docx"].includes(type)) return "📘";
    if (["xls", "xlsx"].includes(type)) return "📗";
    if (["ppt", "pptx"].includes(type)) return "📙";
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(type)) return "🖼️";
    if (["mp4", "mov", "avi"].includes(type)) return "🎬";
    if (["mp3", "wav", "aac"].includes(type)) return "🎵";
    return "📄";
  }

  // Get image files from asset history
  function getImageFiles(history: AssetHistoryWithContributor[]): AssetHistoryWithContributor[] {
    return history.filter(item => {
      const filename = item.filename.toLowerCase();
      const storagePath = item.storage_path.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => 
        filename.endsWith(`.${ext}`) || storagePath.endsWith(`.${ext}`)
      );
    });
  }

  async function handleDownloadFromPath(storagePath: string, filename: string) {
    try {
      // Get signed URL from API
      const response = await fetch(`/api/download-asset?path=${encodeURIComponent(storagePath)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate download URL: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.signedUrl) {
        throw new Error("No signed URL returned");
      }

      // Download the file
      const downloadResponse = await fetch(data.signedUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert(`Failed to download file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function handleUpload(file: File, deliverable: DeliverableWithContributor) {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${deliverable.deliverable_id}.${fileExt}`;
      const filePath = `${slug}/${deliverable.task.function.category.toUpperCase()}/${fileName}`;

      // Use API route to upload (bypasses RLS)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filePath', filePath);
      formData.append('deliverableId', deliverable.id);
      formData.append('filename', file.name);
      formData.append('filetype', fileExt || '');

      const response = await fetch('/api/upload-asset', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Refresh asset URL
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('ip-assets')
        .createSignedUrl(filePath, 3600);
      
      if (!urlError && signedUrl) {
        setAssetUrls(prev => new Map(prev).set(deliverable.id, signedUrl.signedUrl));
      }

      await loadContributorDeliverables(selectedContributorId);
      // Reload asset history for this deliverable
      if (expandedDeliverables.has(deliverable.id)) {
        await loadAssetHistory(deliverable.id);
      }
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(`Failed to upload file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(deliverable: DeliverableWithContributor) {
    if (!confirm("Are you sure you want to remove this file?")) return;

    try {
      if (deliverable.storage_path) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('ip-assets')
          .remove([deliverable.storage_path]);

        if (deleteError) throw deleteError;
      }

      // Clear storage_path in database
      const { error: updateError } = await supabase
        .from("deliverables")
        .update({ storage_path: null })
        .eq("id", deliverable.id);

      if (updateError) throw updateError;

      setAssetUrls(prev => {
        const newMap = new Map(prev);
        newMap.delete(deliverable.id);
        return newMap;
      });

      await loadContributorDeliverables(selectedContributorId);
      alert("File removed successfully!");
    } catch (err) {
      console.error("Error removing file:", err);
      alert(`Failed to remove file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function handleApprove(deliverable: DeliverableWithContributor) {
    try {
      // Update contributor_deliverables status to Completed
      const { error: cdError } = await supabase
        .from("contributor_deliverables")
        .update({ 
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
        .eq("id", deliverable.contributorDeliverable.id);

      if (cdError) throw cdError;

      // Update deliverables status to Approved
      const { error: dError } = await supabase
        .from("deliverables")
        .update({ status: 'Approved' })
        .eq("id", deliverable.id);

      if (dError) throw dError;

      await loadContributorDeliverables(selectedContributorId);
      // Status tag will update automatically via loadContributorDeliverables
    } catch (err) {
      console.error("Error approving deliverable:", err);
      // Silently fail - status tag will remain unchanged
    }
  }

  async function handleNeedsReview(deliverable: DeliverableWithContributor) {
    try {
      // Update deliverables status to Needs Review
      const { error: dError } = await supabase
        .from("deliverables")
        .update({ status: 'Needs Review' })
        .eq("id", deliverable.id);

      if (dError) throw dError;

      // Update contributor_deliverables status back to Assigned so it moves to assigned section
      const { error: cdError } = await supabase
        .from("contributor_deliverables")
        .update({ 
          status: 'Assigned',
          completed_at: null
        })
        .eq("id", deliverable.contributorDeliverable.id);

      if (cdError) throw cdError;

      await loadContributorDeliverables(selectedContributorId);
      // Status tag will update automatically via loadContributorDeliverables
    } catch (err) {
      console.error("Error updating status:", err);
      // Silently fail - status tag will remain unchanged
    }
  }

  if (loading && !selectedContributorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar */}
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

        {/* Main nav */}
        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          {/* Contributions */}
          <button 
            onClick={() => router.push(`/ip/${slug}/contributions`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img
                src="/contributions.svg"
                alt="Contributions"
                className="block h-4 w-4"
              />
            </span>
            <span className="truncate">Contributions</span>
          </button>

          {/* Workflows */}
          <button 
            onClick={() => router.push(`/ip/${slug}/workflows`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img
                src="/list.svg"
                alt="Workflows"
                className="block h-4 w-4"
              />
            </span>
            <span className="truncate">Workflows</span>
          </button>

          {/* Assets */}
          <button 
            onClick={() => router.push(`/ip/${slug}/assets`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img
                src="/photo.svg"
                alt="Assets"
                className="block h-4 w-4"
              />
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
          {/* Header */}
          {ip && ipIconUrl && (
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={ipIconUrl}
                  alt={ip.name}
                  className="block h-12 w-12 rounded object-cover flex-shrink-0"
                />
                <div className="flex flex-col justify-center h-12">
                  <h1 className="text-3xl font-semibold tracking-tight leading-tight">Contributions</h1>
                  <p className="text-sm text-black/60 leading-tight">{ip.name}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded text-sm">
              {error}
            </div>
          )}

          {loading && selectedContributorId && (
            <div className="text-black">Loading deliverables...</div>
          )}

          {!loading && selectedContributorId && (
            <div className="space-y-6">
              {/* Assigned Deliverables Card */}
              <div className="border border-[#e0e0e0] rounded-lg p-6">
                <h3 className="text-sm font-semibold mb-4">Assigned Deliverables ({assignedDeliverables.length})</h3>
                {assignedDeliverables.length === 0 ? (
                  <p className="text-sm text-black/60">No assigned deliverables.</p>
                ) : (
                  <div className="space-y-3">
                    {assignedDeliverables.map((deliverable) => (
                      <DeliverableItem
                        key={deliverable.id}
                        deliverable={deliverable}
                        expanded={expandedDeliverables.has(deliverable.id)}
                        onToggle={() => toggleDeliverable(deliverable.id)}
                        onUpload={(file) => handleUpload(file, deliverable)}
                        onApprove={() => handleApprove(deliverable)}
                        onNeedsReview={() => handleNeedsReview(deliverable)}
                        assetUrl={assetUrls.get(deliverable.id)}
                        getThumbnailPlaceholder={getThumbnailPlaceholder}
                        uploading={uploading}
                        isCompleted={false}
                        assetHistory={assetHistory.get(deliverable.id) || []}
                        thumbnailUrls={thumbnailUrls}
                        imageUrls={imageUrls}
                        getImageFiles={getImageFiles}
                        handleDownloadFromPath={handleDownloadFromPath}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Deliverables Card */}
              <div className="border border-[#e0e0e0] rounded-lg p-6">
                <h3 className="text-sm font-semibold mb-4">Completed Deliverables ({completedDeliverables.length})</h3>
                {completedDeliverables.length === 0 ? (
                  <p className="text-sm text-black/60">No completed deliverables.</p>
                ) : (
                  <div className="space-y-3">
                    {completedDeliverables.map((deliverable) => (
                      <DeliverableItem
                        key={deliverable.id}
                        deliverable={deliverable}
                        expanded={expandedDeliverables.has(deliverable.id)}
                        onToggle={() => toggleDeliverable(deliverable.id)}
                        onUpload={(file) => handleUpload(file, deliverable)}
                        onApprove={() => handleApprove(deliverable)}
                        onNeedsReview={() => handleNeedsReview(deliverable)}
                        assetUrl={assetUrls.get(deliverable.id)}
                        getThumbnailPlaceholder={getThumbnailPlaceholder}
                        uploading={uploading}
                        isCompleted={true}
                        assetHistory={assetHistory.get(deliverable.id) || []}
                        thumbnailUrls={thumbnailUrls}
                        imageUrls={imageUrls}
                        getImageFiles={getImageFiles}
                        handleDownloadFromPath={handleDownloadFromPath}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedContributorId && !loading && contributors.length === 0 && (
            <div className="text-black/60 text-sm">No contributors found.</div>
          )}
        </div>
      </main>
    </div>
  );
}

function DeliverableItem({
  deliverable,
  expanded,
  onToggle,
  onUpload,
  onApprove,
  onNeedsReview,
  assetUrl,
  getThumbnailPlaceholder,
  uploading,
  isCompleted,
  assetHistory,
  thumbnailUrls,
  imageUrls,
  getImageFiles,
  handleDownloadFromPath,
}: {
  deliverable: DeliverableWithContributor;
  expanded: boolean;
  onToggle: () => void;
  onUpload: (file: File) => void;
  onApprove: () => void;
  onNeedsReview: () => void;
  assetUrl?: string;
  getThumbnailPlaceholder: (filetype: string | null) => string;
  uploading: boolean;
  isCompleted: boolean;
  assetHistory: AssetHistoryWithContributor[];
  thumbnailUrls: Map<string, string>;
  imageUrls: Map<string, string>;
  getImageFiles: (history: AssetHistoryWithContributor[]) => AssetHistoryWithContributor[];
  handleDownloadFromPath: (storagePath: string, filename: string) => Promise<void>;
}) {
  return (
    <div className="border border-[#e0e0e0] rounded-lg p-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="font-medium text-sm flex-1">
          {deliverable.deliverable_id}: {deliverable.description || deliverable.filename}
        </span>
        {/* Status tag */}
        {(() => {
          // Determine status: prioritize deliverable.status if it's 'Approved' or 'Needs Review', otherwise use contributorDeliverable.status
          const deliverableStatus = deliverable.status;
          const contributorStatus = deliverable.contributorDeliverable.status;
          
          // Use deliverable.status if it's a review status, otherwise use contributor status
          const status = (deliverableStatus === 'Approved' || deliverableStatus === 'Needs Review') 
            ? deliverableStatus 
            : contributorStatus;
          
          const statusColors = {
            'Assigned': 'bg-gray-100 text-gray-800',
            'Completed': 'bg-blue-100 text-blue-800',
            'Approved': 'bg-green-100 text-green-800',
            'Needs Review': 'bg-orange-100 text-orange-800',
            'In Progress': 'bg-yellow-100 text-yellow-800',
          };
          const statusColor = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
          
          return (
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {status}
            </span>
          );
        })()}
      </button>

      {expanded && (
        <div className="mt-4 pl-6 space-y-4 border-l-2 border-[#e0e0e0]">
          {/* Task Title */}
          <div>
            <label className="text-xs font-medium text-black/60">Task</label>
            <div className="text-sm font-medium">{deliverable.task.title}</div>
          </div>

          {/* Deliverable Description */}
          <div>
            <label className="text-xs font-medium text-black/60">Description</label>
            <div className="text-sm">{deliverable.description || "No description"}</div>
          </div>

          {/* Asset History */}
          {assetHistory.length > 0 && (
            <>
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
                return null;
              })()}

              {/* Upload History */}
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
            </>
          )}
          {assetHistory.length === 0 && (
            <div>
              <label className="text-xs font-medium text-black/60 mb-2 block">Upload History</label>
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-4xl">
                  {getThumbnailPlaceholder(deliverable.filetype)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-[#e0e0e0]">
            <label className="flex-1 min-w-[120px]">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
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
              onClick={onApprove}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isCompleted
                  ? "bg-green-500 hover:bg-green-600 text-white font-semibold"
                  : "bg-green-100 hover:bg-green-200 text-green-800"
              }`}
            >
              APPROVE
            </button>

            <button
              onClick={onNeedsReview}
              className="px-4 py-2 rounded-lg text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 transition-colors"
            >
              NEEDS REVIEW
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

