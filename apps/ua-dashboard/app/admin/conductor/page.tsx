"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP, Function, Task, Deliverable, Contributor, ContributorDeliverable } from "@/types/ip";

interface VerticalData {
  name: string;
  functions: FunctionData[];
  expanded: boolean;
  contributors: Contributor[];
}

interface FunctionData {
  function: Function;
  tasks: TaskData[];
  expanded: boolean;
  contributors: Contributor[];
}

interface TaskData {
  task: Task;
  deliverables: DeliverableData[];
  expanded: boolean;
  contributors: Contributor[];
}

interface DeliverableData {
  deliverable: Deliverable;
  owner: Contributor | null;
}

// Module-level cache for profile images (persists across re-renders and component instances)
const profileImageCache = new Map<string, { url: string; expiresAt: number }>();

// Module-level cache to persist data across navigation
interface ConductorCache {
  ip: IP | null;
  ipIconUrl: string | null;
  verticals: VerticalData[];
  contributors: Contributor[];
  profileImageUrls: Array<[string, string]>; // Map as array of tuples for serialization
}

const conductorCache = new Map<string, ConductorCache>();

export default function ConductorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipSlug = searchParams.get('ip');
  const hasLoadedRef = useRef(false);
  
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [verticals, setVerticals] = useState<VerticalData[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [profileImageUrls, setProfileImageUrls] = useState<Map<string, string>>(new Map());
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableData | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const verticalNames = ['entertainment', 'game', 'product'];

  useEffect(() => {
    if (!ipSlug) return;
    
    // Reset the ref when ipSlug changes
    hasLoadedRef.current = false;
    
    // Check cache first
    const cached = conductorCache.get(ipSlug);
    if (cached) {
      // Restore from cache
      setIp(cached.ip);
      setIpIconUrl(cached.ipIconUrl);
      setVerticals(cached.verticals);
      setContributors(cached.contributors);
      setProfileImageUrls(new Map(cached.profileImageUrls));
      setLoading(false);
      hasLoadedRef.current = true;
      // Still load IP data for icon URL
      loadIPData();
      // Preload profile images in background (they may have expired)
      preloadAllProfileImages();
      return;
    }

    // Load fresh data if not in cache
    loadIPData();
    loadAllData();
    // Preload all profile images in the background
    preloadAllProfileImages();
  }, [ipSlug]);

  async function preloadAllProfileImages() {
    // Load all contributors first to get their names
    const { data: allContributors } = await supabase
      .from("contributors")
      .select("name")
      .order("name");

    if (!allContributors) return;

    console.log(`[Profile Images] Preloading ${allContributors.length} profile images in background...`);
    
    // Preload all profile images in parallel (don't await, let it run in background)
    Promise.all(
      allContributors.map(async (contributor) => {
        const firstName = getFirstName(contributor.name);
        const imageUrl = await getProfileImageUrl(firstName);
        
        // Preload the actual image in the browser cache
        if (imageUrl) {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Resolve even on error to not block other images
            img.src = imageUrl;
          });
        }
      })
    ).then(() => {
      console.log(`[Profile Images] ✅ Preloaded ${allContributors.length} profile images into browser cache`);
    }).catch((err) => {
      console.error("[Profile Images] Error during preload:", err);
    });
  }

  async function loadIPData() {
    if (!ipSlug) return;
    
    try {
      const { data: ipData, error: ipError } = await supabase
        .from("ips")
        .select("*")
        .eq("slug", ipSlug)
        .single();

      if (ipError || !ipData) return;
      
      setIp(ipData);

      const iconPath = ipData.icon_url;
      let iconUrlValue: string | null = null;
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
      
      // Update cache with IP icon URL if we have cached data
      if (ipSlug && hasLoadedRef.current) {
        const cached = conductorCache.get(ipSlug);
        if (cached) {
          conductorCache.set(ipSlug, {
            ...cached,
            ip: ipData,
            ipIconUrl: iconUrlValue
          });
        }
      }
    } catch (err) {
      console.error("Error loading IP data:", err);
    }
  }

  function getFirstName(fullName: string): string {
    return fullName.split(' ')[0].toLowerCase();
  }

  async function getProfileImageUrl(firstName: string): Promise<string | null> {
    try {
      const filename = `${firstName}.png`;
      
      // Check cache first
      const cached = profileImageCache.get(filename);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        // Cache is still valid (with 5 minute buffer before expiry)
        return cached.url;
      }
      
      // Generate new signed URL
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);
      
      if (!error && signedUrl) {
        // Cache the URL (expires 5 minutes before the signed URL expires)
        profileImageCache.set(filename, {
          url: signedUrl.signedUrl,
          expiresAt: now + (3600 - 300) * 1000 // 55 minutes from now
        });
        return signedUrl.signedUrl;
      }
      return null;
    } catch (err) {
      console.error(`Error loading profile image for ${firstName}:`, err);
      return null;
    }
  }

  async function loadAllData() {
    if (!ipSlug) return;
    
    try {
      setLoading(true);

      // Load IP
      const { data: ipData } = await supabase
        .from("ips")
        .select("*")
        .eq("slug", ipSlug)
        .single();

      if (!ipData) return;

      // Load contributors
      const { data: contributorsData } = await supabase
        .from("contributors")
        .select("*")
        .order("name");

      // Load profile images (with caching)
      const profileImageUrlMap = new Map<string, string>();
      if (contributorsData) {
        setContributors(contributorsData);
        
        await Promise.all(
          contributorsData.map(async (contributor) => {
            const firstName = getFirstName(contributor.name);
            const imageUrl = await getProfileImageUrl(firstName);
            if (imageUrl) {
              profileImageUrlMap.set(contributor.id, imageUrl);
            }
          })
        );
        setProfileImageUrls(profileImageUrlMap);
        
        console.log(`Loaded ${profileImageUrlMap.size} profile images (${profileImageCache.size} cached)`);
      }

      // Load contributor assignments
      const { data: assignmentsData } = await supabase
        .from("contributor_deliverables")
        .select("*");

      const assignmentsMap = new Map<string, string>(); // deliverable_id -> contributor_id
      if (assignmentsData) {
        assignmentsData.forEach((assignment: ContributorDeliverable) => {
          assignmentsMap.set(assignment.deliverable_id, assignment.contributor_id);
        });
      }

      // Load functions for this IP
      const { data: ipFunctions } = await supabase
        .from("ip_functions")
        .select("function_code")
        .eq("ip_id", ipData.id);

      const functionCodes = ipFunctions?.map(f => f.function_code) || [];

      // Load all functions
      const { data: functionsData } = await supabase
        .from("functions")
        .select("*")
        .in("code", functionCodes)
        .order("code");

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("function_code", functionCodes)
        .order("display_order");

      console.log("Tasks query result:", {
        count: tasksData?.length || 0,
        error: tasksError,
        functionCodes: functionCodes,
        sample: tasksData?.slice(0, 3)?.map(t => ({ task_id: t.task_id, function_code: t.function_code }))
      });

      // Load deliverables for this IP
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from("deliverables")
        .select("*")
        .eq("ip_id", ipData.id)
        .order("display_order");

      console.log("Deliverables query result:", {
        count: deliverablesData?.length || 0,
        error: deliverablesError,
        ipId: ipData.id,
        sample: deliverablesData?.slice(0, 3)
      });

      // Build vertical structure
      const verticalsMap = new Map<string, VerticalData>();
      
      verticalNames.forEach(verticalName => {
        verticalsMap.set(verticalName, {
          name: verticalName,
          functions: [],
          expanded: false,
          contributors: []
        });
      });

      // Group functions by vertical
      if (functionsData) {
        functionsData.forEach((func: Function) => {
          const vertical = verticalsMap.get(func.category);
          if (vertical) {
            const taskList = tasksData?.filter((t: Task) => t.function_code === func.code) || [];
            const taskDataList: TaskData[] = taskList.map((task: Task) => {
              // Match deliverables by task.id (UUID), not task.task_id (string like "E1-T1")
              const deliverableList = deliverablesData?.filter(
                (d: Deliverable) => d.task_id === task.id && d.ip_id === ipData.id
              ) || [];
              
              console.log(`Task ${task.task_id} (function ${func.code}):`, {
                deliverableCount: deliverableList.length,
                totalDeliverables: deliverablesData?.length || 0,
                matchingDeliverables: deliverableList.map(d => ({
                  id: d.deliverable_id,
                  task_id: d.task_id,
                  ip_id: d.ip_id
                }))
              });
              
              const deliverableDataList: DeliverableData[] = deliverableList.map((deliverable: Deliverable) => {
                const ownerId = assignmentsMap.get(deliverable.id);
                const owner = ownerId ? contributorsData?.find(c => c.id === ownerId) || null : null;
                return {
                  deliverable,
                  owner
                };
              });

              // Get contributors for this task
              const taskContributors = new Set<Contributor>();
              deliverableDataList.forEach(dd => {
                if (dd.owner) {
                  taskContributors.add(dd.owner);
                }
              });

              return {
                task,
                deliverables: deliverableDataList,
                expanded: false,
                contributors: Array.from(taskContributors)
              };
            });

            // Get contributors for this function
            const functionContributors = new Set<Contributor>();
            taskDataList.forEach(td => {
              td.contributors.forEach(c => functionContributors.add(c));
            });

            vertical.functions.push({
              function: func,
              tasks: taskDataList,
              expanded: false,
              contributors: Array.from(functionContributors)
            });
          }
        });
      }

      // Calculate contributors for each vertical
      verticalsMap.forEach((vertical, key) => {
        const verticalContributors = new Set<Contributor>();
        vertical.functions.forEach(funcData => {
          funcData.contributors.forEach(c => verticalContributors.add(c));
        });
        vertical.contributors = Array.from(verticalContributors);
      });

      const verticalsArray = Array.from(verticalsMap.values());
      console.log("Loaded verticals:", verticalsArray.map(v => ({ name: v.name, functionCount: v.functions.length })));
      setVerticals(verticalsArray);
      
      // Cache the data
      if (ipSlug) {
        conductorCache.set(ipSlug, {
          ip: ipData,
          ipIconUrl: ipIconUrl || null,
          verticals: verticalsArray,
          contributors: contributorsData || [],
          profileImageUrls: Array.from(profileImageUrlMap.entries())
        });
        hasLoadedRef.current = true;
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading conductor data:", err);
      setLoading(false);
    }
  }

  function calculateProgress(deliverables: DeliverableData[]): number {
    if (deliverables.length === 0) return 0;
    const completed = deliverables.filter(d => d.deliverable.status === 'Completed' || d.deliverable.status === 'Approved').length;
    return Math.round((completed / deliverables.length) * 100);
  }

  function getContributorsForLevel(
    vertical: VerticalData | null,
    func: FunctionData | null,
    task: TaskData | null
  ): Contributor[] {
    if (task && task.expanded) {
      return task.contributors;
    }
    if (func && func.expanded) {
      return func.contributors;
    }
    if (vertical && vertical.expanded) {
      return vertical.contributors;
    }
    if (vertical && !vertical.expanded) {
      return vertical.contributors;
    }
    return [];
  }

  function toggleVertical(index: number) {
    console.log("Toggling vertical at index:", index);
    setVerticals(prev => {
      const updated = prev.map((v, i) => {
        if (i === index) {
          const newExpanded = !v.expanded;
          console.log(`Vertical ${v.name} expanded: ${newExpanded}`);
          // Collapse all functions when vertical is collapsed
          const updatedFunctions = v.functions.map(f => ({
            ...f,
            expanded: newExpanded ? f.expanded : false,
            tasks: f.tasks.map(t => ({
              ...t,
              expanded: newExpanded ? t.expanded : false
            }))
          }));
          return {
            ...v,
            expanded: newExpanded,
            functions: updatedFunctions
          };
        }
        return v;
      });
      return updated;
    });
  }

  function toggleFunction(verticalIndex: number, functionIndex: number) {
    console.log("Toggling function at vertical:", verticalIndex, "function:", functionIndex);
    setVerticals(prev => {
      const updated = prev.map((v, vi) => {
        if (vi === verticalIndex) {
          const updatedFunctions = v.functions.map((f, fi) => {
            if (fi === functionIndex) {
              const newExpanded = !f.expanded;
              console.log(`Function ${f.function.code} expanded: ${newExpanded}`);
              // Collapse all tasks when function is collapsed
              const updatedTasks = f.tasks.map(t => ({
                ...t,
                expanded: newExpanded ? t.expanded : false
              }));
              return {
                ...f,
                expanded: newExpanded,
                tasks: updatedTasks
              };
            }
            return f;
          });
          return {
            ...v,
            functions: updatedFunctions
          };
        }
        return v;
      });
      return updated;
    });
  }

  function toggleTask(verticalIndex: number, functionIndex: number, taskIndex: number) {
    console.log("Toggling task at vertical:", verticalIndex, "function:", functionIndex, "task:", taskIndex);
    setVerticals(prev => {
      const updated = prev.map((v, vi) => {
        if (vi === verticalIndex) {
          const updatedFunctions = v.functions.map((f, fi) => {
            if (fi === functionIndex) {
              const updatedTasks = f.tasks.map((t, ti) => {
                if (ti === taskIndex) {
                  const newExpanded = !t.expanded;
                  console.log(`Task ${t.task.task_id} expanded: ${newExpanded}`);
                  return {
                    ...t,
                    expanded: newExpanded
                  };
                }
                return t;
              });
              return {
                ...f,
                tasks: updatedTasks
              };
            }
            return f;
          });
          return {
            ...v,
            functions: updatedFunctions
          };
        }
        return v;
      });
      return updated;
    });
  }

  async function assignOwner(deliverableId: string, contributorId: string | null) {
    try {
      // Save current expanded state
      const expandedState = {
        verticals: verticals.map(v => ({
          name: v.name,
          expanded: v.expanded,
          functions: v.functions.map(f => ({
            code: f.function.code,
            expanded: f.expanded,
            tasks: f.tasks.map(t => ({
              task_id: t.task.task_id,
              expanded: t.expanded
            }))
          }))
        }))
      };

      // Find which deliverable was assigned to restore its expanded path
      let targetDeliverable: DeliverableData | null = null;
      for (const vertical of verticals) {
        for (const funcData of vertical.functions) {
          for (const taskData of funcData.tasks) {
            const found = taskData.deliverables.find(d => d.deliverable.id === deliverableId);
            if (found) {
              targetDeliverable = found;
              break;
            }
          }
          if (targetDeliverable) break;
        }
        if (targetDeliverable) break;
      }

      if (contributorId) {
        // Assign owner
        const { error } = await supabase
          .from("contributor_deliverables")
          .upsert({
            contributor_id: contributorId,
            deliverable_id: deliverableId,
            status: 'Assigned'
          }, {
            onConflict: 'contributor_id,deliverable_id'
          });

        if (error) throw error;
      } else {
        // Remove owner
        const { error } = await supabase
          .from("contributor_deliverables")
          .delete()
          .eq("deliverable_id", deliverableId);

        if (error) throw error;
      }

      // Reload data
      await loadAllData();

      // Restore expanded state and ensure target deliverable's path is expanded
      setVerticals(prev => {
        return prev.map((v, vi) => {
          const savedVertical = expandedState.verticals.find(sv => sv.name === v.name);
          const hasTargetDeliverable = targetDeliverable && v.functions.some(f => 
            f.tasks.some(t => t.deliverables.some(d => d.deliverable.id === deliverableId))
          );
          const shouldExpandVertical = savedVertical?.expanded ?? hasTargetDeliverable ?? false;

          const updatedFunctions = v.functions.map((f, fi) => {
            const savedFunction = savedVertical?.functions.find(sf => sf.code === f.function.code);
            const hasTargetInFunction = targetDeliverable && f.tasks.some(t => 
              t.deliverables.some(d => d.deliverable.id === deliverableId)
            );
            const shouldExpandFunction = savedFunction?.expanded ?? hasTargetInFunction ?? false;

            const updatedTasks = f.tasks.map((t, ti) => {
              const savedTask = savedFunction?.tasks.find(st => st.task_id === t.task.task_id);
              const hasTargetInTask = targetDeliverable && t.deliverables.some(d => d.deliverable.id === deliverableId);
              const shouldExpandTask = savedTask?.expanded ?? hasTargetInTask ?? false;

              return {
                ...t,
                expanded: shouldExpandTask
              };
            });

            return {
              ...f,
              expanded: shouldExpandFunction,
              tasks: updatedTasks
            };
          });

          return {
            ...v,
            expanded: shouldExpandVertical,
            functions: updatedFunctions
          };
        });
      });

      setShowOwnerModal(false);
      setSelectedDeliverable(null);
    } catch (err) {
      console.error("Error assigning owner:", err);
      alert("Failed to assign owner. Please try again.");
    }
  }

  async function getContributorAssignmentCount(contributorId: string): Promise<number> {
    const { data, error } = await supabase
      .from("contributor_deliverables")
      .select("id", { count: 'exact', head: true })
      .eq("contributor_id", contributorId);

    if (error) return 0;
    return data?.length || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-white text-black">
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - IP context sidebar */}
      <aside className="w-64 shrink-0 border-r border-[#e0e0e0] bg-white flex flex-col">
        <div className="h-24 flex items-center px-5">
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
        </div>

        {ipSlug && (
          <div className="px-2 pt-4">
            <button
              onClick={() => router.push(`/ip/${ipSlug}`)}
              className="w-full flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-transparent hover:bg-[#c9c9c9] transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {!ipSlug && (
          <div className="px-2 pt-4">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-transparent hover:bg-[#c9c9c9] transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {/* IP Info */}
        {ip && ipIconUrl && (
          <div className="px-2 pt-4 pb-2">
            <button
              onClick={() => router.push(`/ip/${ipSlug}`)}
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
          {/* Workflows */}
          {ipSlug && (
            <button 
              onClick={() => router.push(`/ip/${ipSlug}/workflows`)}
              className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded">
                <img src="/list.svg" alt="Workflows" className="block h-4 w-4" />
              </span>
              <span className="truncate">Workflows</span>
            </button>
          )}

          {/* Assets */}
          {ipSlug && (
            <button 
              onClick={() => router.push(`/ip/${ipSlug}/assets`)}
              className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded">
                <img src="/photo.svg" alt="Assets" className="block h-4 w-4" />
              </span>
              <span className="truncate">Assets</span>
            </button>
          )}

          {/* Admin (section header) */}
          <div>
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded">
                <img src="/admin_tools_icon.svg" alt="Admin" className="block h-4 w-4" />
              </span>
              <span className="truncate">Admin</span>
            </button>

            {/* Segmented Admin list - Always visible on admin pages */}
            <div className="mt-1 rounded-lg bg-[#dfdfdf] px-1.5 py-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => router.push(ipSlug ? `/admin/conductor?ip=${ipSlug}` : "/admin/conductor")}
                  className="w-full flex items-center justify-between rounded border border-black/10 bg-transparent hover:bg-white px-3 h-8 text-left text-[14px] cursor-pointer bg-white"
                >
                  <span className="truncate">Conductor</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ipSlug ? `/admin/function-editor?ip=${ipSlug}` : "/admin/function-editor")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Function Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ipSlug ? `/admin/contributors?ip=${ipSlug}` : "/admin/contributors")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Contributors</span>
                </button>
              </div>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            {ip && ipIconUrl && (
              <img
                src={ipIconUrl}
                alt={ip.name}
                className="block h-12 w-12 rounded object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-1">Conductor</h1>
              {ip && <p className="text-sm text-black/60">{ip.name}</p>}
            </div>
          </div>

          {/* Vertical Cards */}
          <div className="space-y-4">
            {verticals.map((vertical, verticalIndex) => {
              const allDeliverables = vertical.functions.flatMap(f => 
                f.tasks.flatMap(t => t.deliverables)
              );
              const progress = calculateProgress(allDeliverables);
              // Show contributors at vertical level only when vertical is collapsed
              // When vertical is expanded, profile pictures appear next to each core function instead
              const showVerticalContributors = !vertical.expanded;

              return (
                <div key={vertical.name} className="border border-[#e0e0e0] rounded-lg p-6 bg-white">
                  {/* Vertical Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleVertical(verticalIndex);
                      }}
                      className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                    >
                      <span className="text-sm">
                        {vertical.expanded ? '▼' : '▶'}
                      </span>
                      <h2 className="text-lg font-semibold capitalize">
                        {vertical.name}
                      </h2>
                    </button>
                    
                    {/* Progress Bar */}
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-[#e0e0e0] rounded-full h-2">
                        <div
                          className="bg-[#c9c9c9] h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-black/60">{progress}%</div>
                  </div>

                  {/* Contributors Row (only when vertical is collapsed or no functions expanded) */}
                  {showVerticalContributors && vertical.contributors.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 pl-6">
                      {vertical.contributors.map(contributor => {
                        const imageUrl = profileImageUrls.get(contributor.id);
                        return (
                          <div
                            key={contributor.id}
                            className="relative group w-8 h-8 rounded-full overflow-visible flex-shrink-0"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              {imageUrl ? (
                                <img src={imageUrl} alt={contributor.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                                  <span className="text-xs font-semibold text-black/60">
                                    {contributor.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                              {contributor.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Content */}
                  {vertical.expanded && (
                    <div className="pl-6 space-y-4 mt-4">
                      {vertical.functions.length === 0 && (
                        <p className="text-sm text-black/60">No functions found in this vertical.</p>
                      )}
                      {vertical.functions.map((funcData, functionIndex) => {
                        // Show contributors at function level when:
                        // 1. Vertical is expanded (so functions are visible)
                        // 2. Function is NOT expanded (function is collapsed, tasks are not visible)
                        // 3. NO tasks are expanded (tasks are NOT expanded)
                        // When function is expanded or tasks are expanded, profile images appear next to tasks instead
                        const isFunctionExpanded = funcData.expanded === true;
                        const hasExpandedTasks = funcData.tasks.length > 0 && funcData.tasks.some(t => t.expanded === true);
                        // Show function contributors when function is NOT expanded AND no tasks are expanded
                        const showFunctionContributors = !isFunctionExpanded && !hasExpandedTasks;

                        return (
                          <div key={funcData.function.id} className="border-l-2 border-[#e0e0e0] pl-4">
                            {/* Function Header with Contributors */}
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleFunction(verticalIndex, functionIndex);
                                }}
                                className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                              >
                                <span className="text-xs">
                                  {funcData.expanded ? '▼' : '▶'}
                                </span>
                                <span className="text-sm font-medium">
                                  {funcData.function.code}: {funcData.function.title}
                                </span>
                              </button>
                              
                              {/* Function Contributors - to the right of function name */}
                              {showFunctionContributors && funcData.contributors.length > 0 && (
                                <div className="flex items-center gap-2 ml-4">
                                  {funcData.contributors.map(contributor => {
                                    const imageUrl = profileImageUrls.get(contributor.id);
                                    return (
                                      <div
                                        key={contributor.id}
                                        className="relative group w-6 h-6 rounded-full overflow-visible flex-shrink-0"
                                      >
                                        <div className="w-6 h-6 rounded-full overflow-hidden">
                                          {imageUrl ? (
                                            <img src={imageUrl} alt={contributor.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                                              <span className="text-[10px] font-semibold text-black/60">
                                                {contributor.name.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                          {contributor.name}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Expanded Tasks */}
                            {funcData.expanded && (
                              <div className="pl-4 space-y-3 mt-2">
                                {funcData.tasks.map((taskData, taskIndex) => {
                                  // Show task contributors when task is NOT expanded (aggregated view)
                                  // When task is expanded, deliverables show individual owners, so hide aggregated task contributors
                                  // When no tasks are expanded, function-level contributors are shown instead
                                  const showTaskContributors = !taskData.expanded;

                                  return (
                                    <div key={taskData.task.id} className="border-l-2 border-[#e0e0e0] pl-4">
                                      {/* Task Header with Contributors */}
                                      <div className="flex items-center justify-between mb-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleTask(verticalIndex, functionIndex, taskIndex);
                                          }}
                                          className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                                        >
                                          <span className="text-xs">
                                            {taskData.expanded ? '▼' : '▶'}
                                          </span>
                                          <span className="text-xs font-medium">
                                            {taskData.task.task_id}: {taskData.task.title}
                                          </span>
                                        </button>
                                        
                                        {/* Task Contributors - to the right of task name */}
                                        {showTaskContributors && taskData.contributors.length > 0 && (
                                          <div className="flex items-center gap-2 ml-4">
                                            {taskData.contributors.map(contributor => {
                                              const imageUrl = profileImageUrls.get(contributor.id);
                                              return (
                                                <div
                                                  key={contributor.id}
                                                  className="relative group w-6 h-6 rounded-full overflow-visible flex-shrink-0"
                                                >
                                                  <div className="w-6 h-6 rounded-full overflow-hidden">
                                                    {imageUrl ? (
                                                      <img src={imageUrl} alt={contributor.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                      <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                                                        <span className="text-[10px] font-semibold text-black/60">
                                                          {contributor.name.charAt(0).toUpperCase()}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                    {contributor.name}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Expanded Deliverables */}
                                      {taskData.expanded && (
                                        <div className="pl-4 space-y-2 mt-2">
                                          {taskData.deliverables.length === 0 ? (
                                            <p className="text-xs text-black/60">No deliverables found for this task.</p>
                                          ) : (
                                            taskData.deliverables.map((deliverableData) => (
                                              <div key={deliverableData.deliverable.id} className="flex items-center justify-between py-1">
                                                <span className="text-xs text-black/80">
                                                  {deliverableData.deliverable.deliverable_id}: {deliverableData.deliverable.filename}
                                                </span>
                                              
                                                {/* Owner Profile Picture or Add Button */}
                                                <div className="flex items-center gap-2">
                                                  {deliverableData.owner ? (
                                                    <div className="relative group">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectedDeliverable(deliverableData);
                                                          setShowOwnerModal(true);
                                                        }}
                                                        className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[#c9c9c9]"
                                                      >
                                                        {profileImageUrls.get(deliverableData.owner.id) ? (
                                                          <img 
                                                            src={profileImageUrls.get(deliverableData.owner.id)!} 
                                                            alt={deliverableData.owner.name} 
                                                            className="w-full h-full object-cover" 
                                                          />
                                                        ) : (
                                                          <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                                                            <span className="text-[10px] font-semibold text-black/60">
                                                              {deliverableData.owner.name.charAt(0).toUpperCase()}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </button>
                                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                        {deliverableData.owner.name}
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedDeliverable(deliverableData);
                                                        setShowOwnerModal(true);
                                                      }}
                                                      className="w-6 h-6 rounded-full bg-[#e0e0e0] hover:bg-[#c9c9c9] flex items-center justify-center flex-shrink-0"
                                                      title="Add owner"
                                                    >
                                                      <span className="text-xs text-black/60">+</span>
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Owner Assignment Modal */}
      {showOwnerModal && selectedDeliverable && (
        <OwnerAssignmentModal
          deliverable={selectedDeliverable}
          contributors={contributors}
          profileImageUrls={profileImageUrls}
          onAssign={assignOwner}
          onClose={() => {
            setShowOwnerModal(false);
            setSelectedDeliverable(null);
          }}
        />
      )}
    </div>
  );
}

// Owner Assignment Modal Component
function OwnerAssignmentModal({
  deliverable,
  contributors,
  profileImageUrls,
  onAssign,
  onClose
}: {
  deliverable: DeliverableData;
  contributors: Contributor[];
  profileImageUrls: Map<string, string>;
  onAssign: (deliverableId: string, contributorId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      const counts = new Map<string, number>();
      await Promise.all(
        contributors.map(async (contributor) => {
          const { count } = await supabase
            .from("contributor_deliverables")
            .select("*", { count: 'exact', head: true })
            .eq("contributor_id", contributor.id);
          counts.set(contributor.id, count || 0);
        })
      );
      setAssignmentCounts(counts);
      setLoading(false);
    }
    if (contributors.length > 0) {
      loadCounts();
    } else {
      setLoading(false);
    }
  }, [contributors]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Assign Owner</h2>
            <p className="text-sm text-black/60">
              {deliverable.deliverable.deliverable_id}: {deliverable.deliverable.filename}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-black/60 hover:text-black"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-black/60">Loading...</div>
        ) : (
          <div className="space-y-2">
            {/* No Owner Option */}
            <button
              onClick={() => onAssign(deliverable.deliverable.id, null)}
              className="w-full flex items-center gap-3 p-3 border border-[#e0e0e0] rounded-lg hover:bg-[#f9f9f9] text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#e0e0e0] flex items-center justify-center flex-shrink-0">
                <span className="text-sm text-black/60">—</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">No Owner</div>
                <div className="text-xs text-black/60">Unassign this deliverable</div>
              </div>
            </button>

            {/* Contributors List */}
            {contributors.map((contributor) => {
              const imageUrl = profileImageUrls.get(contributor.id);
              const assignmentCount = assignmentCounts.get(contributor.id) || 0;
              
              return (
                <button
                  key={contributor.id}
                  onClick={() => onAssign(deliverable.deliverable.id, contributor.id)}
                  className="w-full flex items-center gap-3 p-3 border border-[#e0e0e0] rounded-lg hover:bg-[#f9f9f9] text-left"
                >
                  <div className="relative group w-10 h-10 rounded-full overflow-visible flex-shrink-0">
                    {imageUrl ? (
                      <img
                      src={imageUrl}
                      alt={contributor.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#dfdfdf] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-black/60">
                        {contributor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {contributor.name}
                  </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{contributor.name}</div>
                    <div className="text-xs text-black/60">
                      {contributor.expertise.join(", ")} • {assignmentCount} assigned
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
