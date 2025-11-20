"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP } from "@/types/ip";
import FunctionEditorComponent from "@/components/FunctionEditor";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";
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

export default function FunctionEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipSlug = searchParams.get('ip');
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';
  
  const [functions, setFunctions] = useState<Function[]>([]);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<FunctionWithData | null>(null);
  const [isNewFunction, setIsNewFunction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFunction, setLoadingFunction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  
  // IP context state
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  // Load IP data if slug is provided
  useEffect(() => {
    if (ipSlug) {
      loadIPData();
    }
  }, [ipSlug]);

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

  const verticals = [
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'game', label: 'Game' },
    { value: 'product', label: 'Product' },
  ];

  // Filter functions by selected vertical (or show all if no vertical selected)
  const filteredFunctions = selectedVertical
    ? functions.filter(f => f.category === selectedVertical)
    : functions;

  // Load all functions
  useEffect(() => {
    loadFunctions();
  }, []);

  // Load selected function details when code changes
  useEffect(() => {
    const code = selectedFunction?.code;
    if (code) {
      loadFunctionDetails(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunction?.code]);

  // Clear function selection when vertical changes
  useEffect(() => {
    setSelectedFunction(null);
    setIsNewFunction(false);
  }, [selectedVertical]);

  async function loadFunctions() {
    try {
      setLoading(true);
      setError(null);
      console.log("Loading functions from Supabase...");
      
      const { data, error } = await supabase
        .from("functions")
        .select("*")
        .order("code");

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Functions loaded:", data?.length || 0);
      setFunctions(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading functions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load functions";
      setError(errorMessage);
      setLoading(false);
      
      // Show more detailed error
      if (err instanceof Error) {
        if (err.message.includes("relation") || err.message.includes("does not exist")) {
          setError("Functions table not found. Make sure you've run schema.sql in Supabase.");
        } else if (err.message.includes("permission") || err.message.includes("policy")) {
          setError("Permission denied. Check RLS policies in Supabase.");
        }
      }
    }
  }

  async function loadFunctionDetails(functionCode: string) {
    try {
      setLoadingFunction(true);
      console.log("Loading function details for:", functionCode);
      
      // Load function with all related data
      const [functionData, guardrailsData, tasksData] = await Promise.all([
        supabase.from("functions").select("*").eq("code", functionCode).single(),
        supabase.from("function_guardrails").select("*").eq("function_code", functionCode).order("display_order"),
        supabase.from("tasks").select("*").eq("function_code", functionCode).order("display_order"),
      ]);

      if (functionData.error) throw functionData.error;

      const functionWithData: FunctionWithData = {
        ...functionData.data,
        guardrails: guardrailsData.data || [],
        tasks: [],
      };

      // Load deliverables for each task
      if (tasksData.data) {
        const tasksWithDeliverables = await Promise.all(
          tasksData.data.map(async (task) => {
            const [deliverablesData] = await Promise.all([
              supabase.from("deliverables").select("*").eq("task_id", task.id).order("display_order"),
            ]);

            // Deduplicate deliverables by ID (in case of duplicates in database)
            const uniqueDeliverablesMap = new Map<string, any>();
            (deliverablesData.data || []).forEach((deliverable) => {
              if (!uniqueDeliverablesMap.has(deliverable.id)) {
                uniqueDeliverablesMap.set(deliverable.id, deliverable);
              }
            });
            const uniqueDeliverables = Array.from(uniqueDeliverablesMap.values());

            const deliverables: DeliverableWithData[] = await Promise.all(
              uniqueDeliverables.map(async (deliverable) => {
                const [aliasesData, criteriaData] = await Promise.all([
                  supabase.from("deliverable_aliases").select("*").eq("deliverable_id", deliverable.id),
                  supabase.from("acceptance_criteria").select("*").eq("deliverable_id", deliverable.id).order("display_order"),
                ]);

                return {
                  ...deliverable,
                  aliases: aliasesData.data || [],
                  acceptance_criteria: criteriaData.data || [],
                };
              })
            );

            return {
              ...task,
              deliverables,
            };
          })
        );

        functionWithData.tasks = tasksWithDeliverables;
      }

      console.log("Function details loaded, updating state:", functionCode);
      setSelectedFunction(functionWithData);
      setLoadingFunction(false);
    } catch (err) {
      console.error("Error loading function details:", err);
      setError(err instanceof Error ? err.message : "Failed to load function details");
      setLoadingFunction(false);
    }
  }

  async function createBackup() {
    try {
      setSaving(true);
      
      // Fetch all function-related data
      const [functionsData, guardrailsData, tasksData, deliverablesData, criteriaData, aliasesData] = await Promise.all([
        supabase.from("functions").select("*"),
        supabase.from("function_guardrails").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("deliverables").select("*"),
        supabase.from("acceptance_criteria").select("*"),
        supabase.from("deliverable_aliases").select("*"),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        functions: functionsData.data || [],
        guardrails: guardrailsData.data || [],
        tasks: tasksData.data || [],
        deliverables: deliverablesData.data || [],
        acceptance_criteria: criteriaData.data || [],
        deliverable_aliases: aliasesData.data || [],
      };

      // Try to store in Supabase backup table
      const { data, error } = await supabase
        .from("function_backups")
        .insert({
          backup_data: backupData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // If backup table doesn't exist, store in localStorage as fallback
        const backups = JSON.parse(localStorage.getItem("function_backups") || "[]");
        backups.push(backupData);
        localStorage.setItem("function_backups", JSON.stringify(backups));
      }

      alert("Backup created successfully!");
    } catch (err) {
      console.error("Error creating backup:", err);
      // Fallback to localStorage
      const backupData = {
        timestamp: new Date().toISOString(),
        functions: functions,
      };
      const backups = JSON.parse(localStorage.getItem("function_backups") || "[]");
      backups.push(backupData);
      localStorage.setItem("function_backups", JSON.stringify(backups));
      alert("Backup created (stored locally)!");
    } finally {
      setSaving(false);
    }
  }

  async function loadBackups() {
    try {
      const { data, error } = await supabase
        .from("function_backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        // Fallback to localStorage
        const backups = JSON.parse(localStorage.getItem("function_backups") || "[]");
        setBackups(backups.reverse().slice(0, 10));
      } else {
        setBackups(data || []);
      }
    } catch (err) {
      console.error("Error loading backups:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - IP context sidebar */}
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


        {/* Main nav */}
        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          {/* Contributions */}
          {ipSlug && (
            <button 
              onClick={() => router.push(`/ip/${ipSlug}/contributions`)}
              className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
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
          )}

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

          {/* Admin (section header) - Only visible to admins */}
          {isAdmin && (
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
                    className="w-full flex items-center justify-between rounded border border-black/10 bg-transparent hover:bg-white px-3 h-8 text-left text-[14px] cursor-pointer"
                  >
                    <span className="truncate">Conductor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(ipSlug ? `/admin/function-editor?ip=${ipSlug}` : "/admin/function-editor")}
                    className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white bg-white cursor-pointer"
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
          )}
          {error && (
            <div className="px-2 mb-2 text-xs text-red-600">
              Error: {error}
            </div>
          )}

        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl">
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
                  <h1 className="text-3xl font-semibold tracking-tight leading-tight">Function Editor</h1>
                  <p className="text-sm text-black/60 leading-tight">{ip.name}</p>
                </div>
              </div>
            </div>
          )}
          
          {loadingFunction ? (
            <div className="text-black">Loading function details...</div>
          ) : selectedFunction ? (
            <FunctionEditorComponent
              function={selectedFunction}
              onSave={async () => {
                await loadFunctionDetails(selectedFunction.code);
                await loadFunctions();
              }}
              onDelete={async () => {
                setSelectedFunction(null);
                await loadFunctions();
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Vertical dropdown */}
              <div>
                <label className="block text-xs font-medium mb-2 text-black/80">
                  Vertical (Optional)
                </label>
                <select
                  value={selectedVertical || ""}
                  onChange={(e) => {
                    const verticalValue = e.target.value || null;
                    setSelectedVertical(verticalValue);
                    setSelectedFunction(null);
                    setIsNewFunction(false);
                  }}
                  className="w-full max-w-md px-3 py-2 border border-[#e0e0e0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                >
                  <option value="">-- All Verticals --</option>
                  {verticals.map((vertical) => (
                    <option key={vertical.value} value={vertical.value}>
                      {vertical.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Core Function dropdown */}
              {!isNewFunction && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-black/80">
                    Core Function
                  </label>
                  <select
                    value={(selectedFunction as FunctionWithData | null)?.code || ""}
                    onChange={(e) => {
                      const funcCode = e.target.value;
                      if (funcCode === "__new__") {
                        setIsNewFunction(true);
                        setSelectedFunction(null);
                      } else if (funcCode) {
                        const func = functions.find(f => f.code === funcCode);
                        if (func) {
                          setSelectedFunction({ ...func, guardrails: [], tasks: [] } as FunctionWithData);
                          setIsNewFunction(false);
                        }
                      } else {
                        setSelectedFunction(null);
                        setIsNewFunction(false);
                      }
                    }}
                    className="w-full max-w-md px-3 py-2 border border-[#e0e0e0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                  >
                    <option value="">-- Select a function --</option>
                    <option value="__new__">+ Add new function</option>
                    {filteredFunctions.map((func) => (
                      <option key={func.id} value={func.code}>
                        {func.code}: {func.title}
                      </option>
                    ))}
                  </select>
                  {filteredFunctions.length === 0 && (
                    <p className="mt-2 text-xs text-black/60">
                      {selectedVertical 
                        ? `No functions found in ${verticals.find(v => v.value === selectedVertical)?.label} vertical.`
                        : "No functions found."}
                    </p>
                  )}
                </div>
              )}

              {/* New Function Editor */}
              {isNewFunction && (
                <NewFunctionEditor
                  category={selectedVertical || null}
                  onSave={async (newFunction) => {
                    await loadFunctions();
                    // Select the newly created function
                    setSelectedFunction({ ...newFunction, guardrails: [], tasks: [] } as FunctionWithData);
                    setIsNewFunction(false);
                  }}
                  onCancel={() => {
                    setIsNewFunction(false);
                    setSelectedFunction(null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Backup Modal */}
      {showBackupModal && (
        <BackupModal
          onClose={() => {
            setShowBackupModal(false);
            loadBackups();
          }}
          onCreateBackup={createBackup}
          onLoadBackups={loadBackups}
        />
      )}
    </div>
  );
}


// Backup Modal Component
function BackupModal({
  onClose,
  onCreateBackup,
  onLoadBackups,
}: {
  onClose: () => void;
  onCreateBackup: () => Promise<void>;
  onLoadBackups: () => Promise<void>;
}) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBackups() {
    try {
      setLoading(true);
      // Try to load from Supabase backup table
      const { data, error } = await supabase
        .from("function_backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // Fallback to localStorage
        const localBackups = JSON.parse(localStorage.getItem("function_backups") || "[]");
        setBackups(localBackups.reverse().slice(0, 20));
      } else {
        setBackups(data || []);
      }
    } catch (err) {
      console.error("Error loading backups:", err);
      const localBackups = JSON.parse(localStorage.getItem("function_backups") || "[]");
      setBackups(localBackups.reverse().slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  async function restoreBackup(backup: any) {
    if (!confirm("Are you sure you want to restore this backup? This will overwrite current data.")) {
      return;
    }

    try {
      setRestoring(true);
      const backupData = backup.backup_data || backup;

      // Restore functions
      if (backupData.functions) {
        for (const func of backupData.functions) {
          const { error } = await supabase
            .from("functions")
            .upsert({
              id: func.id,
              code: func.code,
              title: func.title,
              category: func.category,
              phase: func.phase,
              purpose: func.purpose,
              source_md: func.source_md,
              position_x: func.position_x,
              position_y: func.position_y,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'code' });

          if (error) console.error("Error restoring function:", error);
        }
      }

      alert("Backup restored successfully! Please refresh the page.");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Error restoring backup:", err);
      alert("Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  }

  async function downloadBackup(backup: any) {
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `function-backup-${backup.timestamp || backup.created_at}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Backup & Restore</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            Close
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={async () => {
              await onCreateBackup();
              await loadBackups();
            }}
            className="px-4 py-2 rounded-lg bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            Create Backup
          </button>
        </div>

        {loading ? (
          <p>Loading backups...</p>
        ) : backups.length === 0 ? (
          <p className="text-black/60">No backups found.</p>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold mb-2">Available Backups:</h3>
            {backups.map((backup, index) => (
              <div key={index} className="border border-[#e0e0e0] rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {backup.timestamp ? new Date(backup.timestamp).toLocaleString() : 
                     backup.created_at ? new Date(backup.created_at).toLocaleString() : 
                     'Unknown date'}
                  </p>
                  {backup.backup_data?.functions && (
                    <p className="text-sm text-black/60">
                      {backup.backup_data.functions.length} functions
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBackup(backup)}
                    className="px-3 py-1 text-sm rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => restoreBackup(backup)}
                    disabled={restoring}
                    className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                  >
                    {restoring ? "Restoring..." : "Restore"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// New Function Editor Component
function NewFunctionEditor({
  category,
  onSave,
  onCancel,
}: {
  category: string | null;
  onSave: (func: Function) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sourceMd, setSourceMd] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!code || !title || !category) {
      alert("Please fill in Code, Title, and Category");
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("functions")
        .insert({
          code: code.toUpperCase(),
          title,
          category: category.toLowerCase(),
          phase: phase || null,
          purpose: purpose || null,
          source_md: sourceMd || null,
        })
        .select()
        .single();

      if (error) throw error;

      alert("Function created successfully!");
      await onSave(data);
    } catch (err: any) {
      console.error("Error creating function:", err);
      let errorMessage = "Failed to create function";
      if (err?.message) {
        errorMessage = err.message;
      }
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="border border-[#e0e0e0] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold">Add New Function</h2>
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs rounded bg-[#c9c9c9] hover:bg-[#b0b0b0]"
          >
            Cancel
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Code *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., E1, G1, P1"
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter function title"
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Category *</label>
            <input
              type="text"
              value={category || ""}
              disabled
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phase</label>
            <input
              type="text"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              placeholder="e.g., R&D"
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              placeholder="Enter function purpose"
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Source MD</label>
            <input
              type="text"
              value={sourceMd}
              onChange={(e) => setSourceMd(e.target.value)}
              placeholder="Path to source markdown file"
              className="w-full px-2 py-1.5 text-xs border border-[#e0e0e0] rounded"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !code || !title}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#c9c9c9] hover:bg-[#b0b0b0] disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Function"}
          </button>
        </div>
      </div>
    </div>
  );
}
