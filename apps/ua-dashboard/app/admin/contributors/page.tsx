"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Contributor, ContributorWithDeliverables, Deliverable, IP } from "@/types/ip";

// Module-level cache to persist data across navigation
interface ContributorsCache {
  contributors: ContributorWithDeliverables[];
  deliverablesMap: Map<string, Deliverable>;
  profileImageUrls: Map<string, string>;
}

const contributorsCache = new Map<string, ContributorsCache>();

export default function ContributorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipSlug = searchParams.get('ip');
  const hasLoadedRef = useRef(false);

  const [contributors, setContributors] = useState<ContributorWithDeliverables[]>([]);
  const [deliverablesMap, setDeliverablesMap] = useState<Map<string, Deliverable>>(new Map());
  const [profileImageUrls, setProfileImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // IP context state
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(true); // Keep admin menu open
  
  // Modal state
  const [selectedContributor, setSelectedContributor] = useState<ContributorWithDeliverables | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Add contributor form state
  const [newContributorName, setNewContributorName] = useState("");
  const [newContributorExpertise, setNewContributorExpertise] = useState("");
  const [newContributorRoles, setNewContributorRoles] = useState("");

  // Load IP data if slug is provided
  useEffect(() => {
    if (ipSlug) {
      loadIPData();
    }
  }, [ipSlug]);

  useEffect(() => {
    // Check cache first
    const cached = contributorsCache.get('all');
    if (cached && !hasLoadedRef.current) {
      setContributors(cached.contributors);
      setDeliverablesMap(cached.deliverablesMap);
      setProfileImageUrls(cached.profileImageUrls);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    // Load fresh data if not in cache
    if (!hasLoadedRef.current) {
      loadContributors();
      hasLoadedRef.current = true;
    }
  }, []);

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
      console.log(`[Profile Image] Attempting to load: ${filename}`);
      
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);
      
      if (error) {
        console.error(`[Profile Image] Error loading ${filename}:`, error);
        console.error(`[Profile Image] Error details:`, {
          message: error.message
        });
        return null;
      }
      
      if (signedUrl && signedUrl.signedUrl) {
        console.log(`[Profile Image] ✅ Successfully loaded: ${filename}`);
        return signedUrl.signedUrl;
      }
      
      console.warn(`[Profile Image] ⚠️ No signed URL returned for: ${filename}`);
      return null;
    } catch (err) {
      console.error(`[Profile Image] ❌ Exception loading profile image for ${firstName}:`, err);
      return null;
    }
  }

  async function loadContributors() {
    try {
      setLoading(true);
      setError(null);

      // Load all contributors
      const { data: contributorsData, error: contributorsError } = await supabase
        .from("contributors")
        .select("*")
        .order("name");

      if (contributorsError) throw contributorsError;

      // Load contributor deliverables
      const { data: contributorDeliverablesData, error: deliverablesError } = await supabase
        .from("contributor_deliverables")
        .select("*");

      if (deliverablesError) throw deliverablesError;

      // Load deliverable details for display
      const deliverableIds = contributorDeliverablesData?.map(cd => cd.deliverable_id) || [];
      const { data: deliverablesData } = deliverableIds.length > 0
        ? await supabase
            .from("deliverables")
            .select("id, deliverable_id, filename, description")
            .in("id", deliverableIds)
        : { data: [] };

      // Store deliverables in a map for easy lookup
      const deliverablesMapData = new Map<string, Deliverable>();
      (deliverablesData || []).forEach(d => {
        deliverablesMapData.set(d.id, d);
      });
      setDeliverablesMap(deliverablesMapData);

      // Combine contributors with their deliverables
      const contributorsWithDeliverables: ContributorWithDeliverables[] = (contributorsData || []).map(contributor => {
        const assigned = (contributorDeliverablesData || [])
          .filter(cd => cd.contributor_id === contributor.id && cd.status === 'Assigned');
        
        const completed = (contributorDeliverablesData || [])
          .filter(cd => cd.contributor_id === contributor.id && cd.status === 'Completed');

        return {
          ...contributor,
          deliverables_assigned: assigned,
          deliverables_completed: completed
        };
      });

      setContributors(contributorsWithDeliverables);

      // Load profile images for all contributors
      const profileImageUrlMap = new Map<string, string>();
      console.log(`\n[Profile Images] Loading profile images for ${contributorsWithDeliverables.length} contributors...`);
      
      const imageLoadResults = await Promise.all(
        contributorsWithDeliverables.map(async (contributor) => {
          const firstName = getFirstName(contributor.name);
          const imageUrl = await getProfileImageUrl(firstName);
          if (imageUrl) {
            profileImageUrlMap.set(contributor.id, imageUrl);
            return { contributor: contributor.name, success: true };
          }
          return { contributor: contributor.name, success: false };
        })
      );
      
      const successCount = imageLoadResults.filter(r => r.success).length;
      console.log(`[Profile Images] ✅ Loaded ${successCount} out of ${contributorsWithDeliverables.length} profile images\n`);
      
      if (successCount === 0 && contributorsWithDeliverables.length > 0) {
        console.warn(`[Profile Images] ⚠️ No profile images loaded. Check:`);
        console.warn(`   1. Bucket "profile-pics" exists in Supabase Storage`);
        console.warn(`   2. RLS policies are set (run supabase/profile-pics-storage-policies.sql)`);
        console.warn(`   3. Files are named correctly (e.g., nick.png, alex.png)`);
      }
      
      setProfileImageUrls(profileImageUrlMap);

      // Cache the loaded data
      contributorsCache.set('all', {
        contributors: contributorsWithDeliverables,
        deliverablesMap: deliverablesMapData,
        profileImageUrls: profileImageUrlMap
      });

      setLoading(false);
    } catch (err) {
      console.error("Error loading contributors:", err);
      setError(err instanceof Error ? err.message : "Failed to load contributors");
      setLoading(false);
    }
  }

  async function handleAddContributor() {
    if (!newContributorName.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      // Parse expertise and roles from comma-separated strings
      const expertise = newContributorExpertise
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      const roles = newContributorRoles
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const { data, error } = await supabase
        .from("contributors")
        .insert({
          name: newContributorName.trim(),
          expertise,
          roles
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newContributor: ContributorWithDeliverables = {
        ...data,
        deliverables_assigned: [],
        deliverables_completed: []
      };

      // Try to load profile image for new contributor
      const firstName = getFirstName(newContributor.name);
      const imageUrl = await getProfileImageUrl(firstName);
      if (imageUrl) {
        setProfileImageUrls(prev => {
          const updated = new Map(prev);
          updated.set(newContributor.id, imageUrl);
          return updated;
        });
      }

      const sortedContributors = [...contributors, newContributor].sort((a, b) => a.name.localeCompare(b.name));
      setContributors(sortedContributors);

      // Update cache
      const cached = contributorsCache.get('all');
      if (cached) {
        const updatedProfileUrls = new Map(cached.profileImageUrls);
        if (imageUrl) {
          updatedProfileUrls.set(newContributor.id, imageUrl);
        }
        contributorsCache.set('all', {
          contributors: sortedContributors,
          deliverablesMap: cached.deliverablesMap,
          profileImageUrls: updatedProfileUrls
        });
      }

      // Reset form
      setNewContributorName("");
      setNewContributorExpertise("");
      setNewContributorRoles("");
      setIsAddModalOpen(false);

      alert("Contributor added successfully!");
    } catch (err) {
      console.error("Error adding contributor:", err);
      alert(err instanceof Error ? err.message : "Failed to add contributor");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading contributors...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 text-black">Error</h1>
          <p className="text-black/60 mb-4">{error}</p>
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
                <img
                  src="/list.svg"
                  alt="Workflows"
                  className="block h-4 w-4"
                />
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
                <img
                  src="/photo.svg"
                  alt="Assets"
                  className="block h-4 w-4"
                />
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
                <img
                  src="/admin_tools_icon.svg"
                  alt="Admin"
                  className="block h-4 w-4"
                />
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
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Function Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ipSlug ? `/admin/contributors?ip=${ipSlug}` : "/admin/contributors")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white bg-white cursor-pointer"
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
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Contributors</h1>
            <p className="text-[15px] text-black/60">Manage team members and their assignments</p>
          </div>

          {/* Contributor cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Contributor cards */}
            {contributors.map((contributor) => {
              const profileImageUrl = profileImageUrls.get(contributor.id);
              return (
                <div
                  key={contributor.id}
                  onClick={() => setSelectedContributor(contributor)}
                  className="p-6 border border-[#e0e0e0] rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-4 mb-4">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={contributor.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#dfdfdf] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-black/60">
                          {contributor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold">{contributor.name}</h3>
                  </div>
                <div className="mb-3">
                  <div className="text-xs font-medium text-black/60 mb-1">Roles</div>
                  <div className="flex flex-wrap gap-1">
                    {contributor.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-[#dfdfdf] rounded text-xs"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-black/60 mb-1">Expertise</div>
                  <div className="text-sm text-black/80 line-clamp-2">
                    {contributor.expertise.join(", ")}
                  </div>
                </div>
              </div>
              );
            })}

            {/* Add new contributor card - at the end */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#e0e0e0] rounded-lg hover:border-[#c9c9c9] hover:bg-[#f9f9f9] transition-all cursor-pointer min-h-[200px]"
            >
              <div className="text-4xl mb-2 text-black/40">+</div>
              <div className="text-sm font-medium text-black/60">Add New Contributor</div>
            </button>
          </div>
        </div>
      </main>

      {/* Contributor detail modal */}
      {selectedContributor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedContributor(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {profileImageUrls.get(selectedContributor.id) ? (
                  <img
                    src={profileImageUrls.get(selectedContributor.id)!}
                    alt={selectedContributor.name}
                    className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#dfdfdf] flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-semibold text-black/60">
                      {selectedContributor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-2xl font-semibold">{selectedContributor.name}</h2>
              </div>
              <button
                onClick={() => setSelectedContributor(null)}
                className="text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Roles */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContributor.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#dfdfdf] rounded text-sm"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expertise */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContributor.expertise.map((exp, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#c9c9c9] rounded text-sm"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deliverables Assigned */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Deliverables Assigned</h3>
                {selectedContributor.deliverables_assigned.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContributor.deliverables_assigned.map((cd) => {
                      const deliverable = deliverablesMap.get(cd.deliverable_id);
                      return (
                        <div
                          key={cd.id}
                          className="p-3 border border-[#e0e0e0] rounded text-sm"
                        >
                          {deliverable?.filename || deliverable?.deliverable_id || 'Unknown deliverable'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-black/60">No deliverables assigned</p>
                )}
              </div>

              {/* Deliverables Completed */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Deliverables Completed</h3>
                {selectedContributor.deliverables_completed.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContributor.deliverables_completed.map((cd) => {
                      const deliverable = deliverablesMap.get(cd.deliverable_id);
                      return (
                        <div
                          key={cd.id}
                          className="p-3 border border-[#e0e0e0] rounded text-sm"
                        >
                          {deliverable?.filename || deliverable?.deliverable_id || 'Unknown deliverable'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-black/60">No deliverables completed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add contributor modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Add New Contributor</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newContributorName}
                  onChange={(e) => setNewContributorName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                  placeholder="Enter contributor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expertise (comma-separated)</label>
                <input
                  type="text"
                  value={newContributorExpertise}
                  onChange={(e) => setNewContributorExpertise(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                  placeholder="e.g., Game design, Animation, Rigging"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Roles (comma-separated)</label>
                <input
                  type="text"
                  value={newContributorRoles}
                  onChange={(e) => setNewContributorRoles(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                  placeholder="e.g., Game Designer, Technical Artist"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddContributor}
                  className="flex-1 px-4 py-2 bg-[#c9c9c9] hover:bg-[#b0b0b0] rounded-lg font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[#e0e0e0] hover:bg-[#f9f9f9] rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

