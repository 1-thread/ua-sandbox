"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP, IPVertical, Function, Task, Deliverable, Contributor } from "@/types/ip";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";

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

export default function IPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';

  const [ip, setIp] = useState<IP | null>(null);
  const [verticals, setVerticals] = useState<IPVertical[]>([]);
  const [verticalTreeData, setVerticalTreeData] = useState<VerticalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [ipName, setIpName] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<{
    iconUrl: string | null;
    heroUrl: string | null;
  }>({ iconUrl: null, heroUrl: null });
  const [profileImageUrls, setProfileImageUrls] = useState<Map<string, string>>(new Map());

  const verticalNames = ['entertainment', 'game', 'product'];

  useEffect(() => {
    async function fetchIPData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch IP name first for loading message
        const { data: ipNameData, error: ipNameError } = await supabase
          .from("ips")
          .select("name")
          .eq("slug", slug)
          .single();
        
        if (!ipNameError && ipNameData) {
          setIpName(ipNameData.name);
        }

        // Fetch IP data
        console.log("Fetching IP with slug:", slug);
        console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
        
        const { data: ipData, error: ipError } = await supabase
          .from("ips")
          .select("*")
          .eq("slug", slug)
          .single();

        console.log("IP query result:", { ipData, ipError });
        
        if (ipError) {
          console.error("IP query error details:", {
            message: ipError.message,
            code: ipError.code,
            details: ipError.details,
            hint: ipError.hint
          });
          throw ipError;
        }
        if (!ipData) {
          setError("IP not found");
          setLoading(false);
          return;
        }

        setIp(ipData);

        // Fetch verticals for this IP
        const { data: verticalsData, error: verticalsError } = await supabase
          .from("ip_verticals")
          .select("*")
          .eq("ip_id", ipData.id)
          .order("vertical_name");

        if (verticalsError) throw verticalsError;
        setVerticals(verticalsData || []);

        // Handle image URLs: use local public folder for development, Supabase signed URLs for production
        const iconPath = ipData.icon_url;
        const heroPath = ipData.representative_image_url;
        
        // Check if we're in development (localhost)
        const isDevelopment = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        // Helper to get image URL
        const getImageUrl = async (path: string | null, type: 'icon' | 'hero'): Promise<string | null> => {
          if (!path) return null;
          
          // If it's already a full URL (signed or public), use it directly
          if (path.startsWith('http')) {
            return path;
          }
          
          // Extract filename (remove 'ip-assets/' prefix if present)
          const filename = path.replace(/^ip-assets\//, '');
          
          // For local development, use public folder paths
          if (isDevelopment) {
            const localPath = type === 'icon' 
              ? `/icons/${filename}`
              : `/images/${filename}`;
            return localPath;
          }
          
          // For production, generate signed URL from Supabase Storage
          try {
            const { data: signedUrl, error } = await supabase.storage
              .from('ip-assets')
              .createSignedUrl(filename, 3600); // 1 hour expiry
            
            if (!error && signedUrl) {
              return signedUrl.signedUrl;
            } else {
              console.error(`Error generating signed URL for ${filename}:`, error);
              // Fallback to local path even in production (for testing)
              const localPath = type === 'icon' 
                ? `/icons/${filename}`
                : `/images/${filename}`;
              return localPath;
            }
          } catch (err) {
            console.error(`Exception generating signed URL for ${filename}:`, err);
            // Fallback to local path
            const localPath = type === 'icon' 
              ? `/icons/${filename}`
              : `/images/${filename}`;
            return localPath;
          }
        };

        // Get icon URL
        if (iconPath) {
          const iconUrl = await getImageUrl(iconPath, 'icon');
          if (iconUrl) {
            setImageUrls(prev => ({ ...prev, iconUrl }));
          }
        }

        // Get hero image URL
        if (heroPath) {
          const heroUrl = await getImageUrl(heroPath, 'hero');
          if (heroUrl) {
            setImageUrls(prev => ({ ...prev, heroUrl }));
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching IP data:", err);
        let errorMessage = "Failed to load IP data";
        
        if (err instanceof Error) {
          errorMessage = err.message;
          console.error("Full error:", err);
        }
        
        // More specific error messages
        if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Failed to fetch")) {
          errorMessage = "Unable to connect to database. Check your Supabase URL and network connection.";
        } else if (errorMessage.includes("JWT") || errorMessage.includes("auth")) {
          errorMessage = "Authentication error. Check your Supabase anon key.";
        } else if (errorMessage.includes("relation") || errorMessage.includes("does not exist")) {
          errorMessage = "Database table not found. Make sure you've run the schema.sql in Supabase.";
        } else if (errorMessage.includes("permission") || errorMessage.includes("policy")) {
          errorMessage = "Permission denied. Check your RLS policies in Supabase.";
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    }

    if (slug) {
      fetchIPData();
    }
  }, [slug]);

  useEffect(() => {
    if (ip?.id) {
      loadTreeStructure(ip.id);
    }
  }, [ip?.id]);

  function getFirstName(fullName: string): string {
    return fullName.split(' ')[0].toLowerCase();
  }

  async function getProfileImageUrl(firstName: string, size: 'small' | 'medium' | 'original' = 'small'): Promise<string | null> {
    try {
      const sizeSuffix = size === 'original' ? '' : `-${size}`;
      const filename = `${firstName}${sizeSuffix}.png`;
      
      // Check cache first
      const cached = profileImageCache.get(filename);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        // Cache is still valid (with 5 minute buffer before expiry)
        return cached.url;
      }
      
      // Check if we're in development mode
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // Generate new signed URL
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);
      
      if (error) {
        if (isDevelopment) {
          console.warn(`[Profile Image] Could not load ${filename} from Supabase Storage:`, error.message);
          console.warn(`[Profile Image] Make sure Supabase credentials and RLS policies are set up correctly`);
        }
        return null;
      }
      
      if (signedUrl) {
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

  async function loadTreeStructure(ipId: string) {
    try {
      // Load contributors
      const { data: contributorsData } = await supabase
        .from("contributors")
        .select("*")
        .order("name");

      // Load profile images
      const profileImageUrlMap = new Map<string, string>();
      if (contributorsData) {
        console.log(`[Overview] Loading profile images for ${contributorsData.length} contributors...`);
        await Promise.all(
          contributorsData.map(async (contributor) => {
            const firstName = getFirstName(contributor.name);
            const imageUrl = await getProfileImageUrl(firstName, 'small');
            if (imageUrl) {
              profileImageUrlMap.set(contributor.id, imageUrl);
            } else {
              console.warn(`[Overview] Could not load profile image for ${contributor.name} (${firstName}-small.png)`);
            }
          })
        );
        console.log(`[Overview] Loaded ${profileImageUrlMap.size} profile images`);
        setProfileImageUrls(profileImageUrlMap);
      }

      // Load contributor assignments
      const { data: assignmentsData } = await supabase
        .from("contributor_deliverables")
        .select("*");

      const assignmentsMap = new Map<string, string>(); // deliverable_id -> contributor_id
      if (assignmentsData) {
        assignmentsData.forEach((assignment: any) => {
          assignmentsMap.set(assignment.deliverable_id, assignment.contributor_id);
        });
      }

      // Load functions for this IP
      const { data: ipFunctions } = await supabase
        .from("ip_functions")
        .select("function_code")
        .eq("ip_id", ipId);

      const functionCodes = ipFunctions?.map(f => f.function_code) || [];

      // Load all functions
      const { data: functionsData } = await supabase
        .from("functions")
        .select("*")
        .in("code", functionCodes)
        .order("code");

      // Load tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .in("function_code", functionCodes)
        .order("display_order");

      // Load deliverables for this IP
      const { data: deliverablesData } = await supabase
        .from("deliverables")
        .select("*")
        .eq("ip_id", ipId)
        .order("display_order");

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
              const deliverableList = deliverablesData?.filter(
                (d: Deliverable) => d.task_id === task.id && d.ip_id === ipId
              ) || [];
              
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
      verticalsMap.forEach((vertical) => {
        const verticalContributors = new Set<Contributor>();
        vertical.functions.forEach(funcData => {
          funcData.contributors.forEach(c => verticalContributors.add(c));
        });
        vertical.contributors = Array.from(verticalContributors);
      });

      const verticalsArray = Array.from(verticalsMap.values());
      setVerticalTreeData(verticalsArray);
    } catch (err) {
      console.error("Error loading tree structure:", err);
    }
  }

  function calculateProgress(deliverables: DeliverableData[]): number {
    if (deliverables.length === 0) return 0;
    const completed = deliverables.filter(d => d.deliverable.status === 'Completed' || d.deliverable.status === 'Approved').length;
    return Math.round((completed / deliverables.length) * 100);
  }

  function toggleVertical(index: number) {
    setVerticalTreeData(prev => {
      const updated = prev.map((v, i) => {
        if (i === index) {
          const newExpanded = !v.expanded;
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
    setVerticalTreeData(prev => {
      const updated = prev.map((v, vi) => {
        if (vi === verticalIndex) {
          const updatedFunctions = v.functions.map((f, fi) => {
            if (fi === functionIndex) {
              const newExpanded = !f.expanded;
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
    setVerticalTreeData(prev => {
      const updated = prev.map((v, vi) => {
        if (vi === verticalIndex) {
          const updatedFunctions = v.functions.map((f, fi) => {
            if (fi === functionIndex) {
              const updatedTasks = f.tasks.map((t, ti) => {
                if (ti === taskIndex) {
                  return {
                    ...t,
                    expanded: !t.expanded
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">
          {ipName ? `Loading ${ipName}...` : "Loading..."}
        </div>
      </div>
    );
  }

  if (error || !ip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 text-black">
            {error || "IP not found"}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-[#c9c9c9] hover:bg-[#b0b0b0] text-black"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - same as landing page */}
      <aside className="w-64 shrink-0 border-r border-[#e0e0e0] bg-white flex flex-col">
        {/* Logo / brand */}
        <div className="h-24 flex items-center justify-between px-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img
              src="/Title.svg"
              alt="UA"
              className="block h-8 w-auto"
            />
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

        {/* Back button */}
        <div className="px-2 pt-4">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* IP Info */}
        {ip && imageUrls.iconUrl && (
          <div className="px-2 pt-4 pb-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#dfdfdf]">
              <img
                src={imageUrls.iconUrl}
                alt={ip.name}
                className="block h-8 w-8 rounded object-cover"
              />
              <span className="font-medium text-sm truncate">{ip.name}</span>
            </div>
          </div>
        )}

        {/* Main nav */}
        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          {/* To Do */}
          <button 
            onClick={() => router.push(`/ip/${slug}/contributions`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img
                src="/list.svg"
                alt="To Do"
                className="block h-4 w-4"
              />
            </span>
            <span className="truncate">To Do</span>
          </button>

          {/* Workflows */}
          <button 
            onClick={() => router.push(`/ip/${slug}/workflows`)}
            className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded">
              <img
                src="/contributions.svg"
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
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          {/* IP Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              {imageUrls.iconUrl && (
                <img
                  src={imageUrls.iconUrl}
                  alt={`${ip.name} icon`}
                  className="w-12 h-12 object-contain"
                />
              )}
              <h1 className="text-xl font-semibold tracking-tight">{ip.name}</h1>
            </div>
            
            {/* Image and Description with text wrapping */}
            <div className="mb-10">
              {imageUrls.heroUrl && (
                <img
                  src={imageUrls.heroUrl}
                  alt={`${ip.name} representative image`}
                  className="float-left w-64 h-auto rounded-lg mr-6 mb-4 object-cover"
                  style={{ maxWidth: '300px' }}
                />
              )}
              {ip.description && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold mb-2 tracking-tight">Description</h2>
                  <p className="text-xs leading-relaxed text-black/80">{ip.description}</p>
                </div>
              )}
              {ip.health_summary && (
                <div>
                  <h2 className="text-sm font-semibold mb-2 tracking-tight">Health Summary</h2>
                  <p className="text-xs leading-relaxed text-black/80">{ip.health_summary}</p>
                </div>
              )}
              <div className="clear-both"></div>
            </div>
          </div>

          {/* Overview */}
          {verticalTreeData.length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm font-semibold mb-3 tracking-tight">Overview</h2>
              <div className="space-y-4">
                {verticalTreeData.map((vertical, verticalIndex) => {
                  const allDeliverables = vertical.functions.flatMap(f => 
                    f.tasks.flatMap(t => t.deliverables)
                  );
                  const progress = calculateProgress(allDeliverables);
                  // Show contributors at vertical level only when vertical is collapsed
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

                      {/* Contributors Row (only when vertical is collapsed) */}
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
                            // Show contributors at function level when function is NOT expanded AND no tasks are expanded
                            const isFunctionExpanded = funcData.expanded === true;
                            const hasExpandedTasks = funcData.tasks.length > 0 && funcData.tasks.some(t => t.expanded === true);
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
                                      // Show task contributors when task is NOT expanded
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
                                                  
                                                    {/* Owner Profile Picture (read-only, no click) */}
                                                    {deliverableData.owner && (
                                                      <div className="flex items-center gap-2">
                                                        <div className="relative group w-6 h-6 rounded-full overflow-visible flex-shrink-0">
                                                          <div className="w-6 h-6 rounded-full overflow-hidden">
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
                                                          </div>
                                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                            {deliverableData.owner.name}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
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
          )}
        </div>
      </main>
    </div>
  );
}

