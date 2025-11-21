"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Contributor, ContributorWithDeliverables, Deliverable, IP } from "@/types/ip";
import { useLogout } from "@/components/LogoutContext";
import { useSelectedContributorRole } from "@/hooks/useSelectedContributorRole";

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
  const { handleLogout } = useLogout();
  const selectedContributorRole = useSelectedContributorRole();
  const isAdmin = selectedContributorRole === 'admin';

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
  
  // Edit state for contributor profile
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editExpertise, setEditExpertise] = useState("");
  const [editRoles, setEditRoles] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  
  // Add contributor form state
  const [newContributorFirstName, setNewContributorFirstName] = useState("");
  const [newContributorLastName, setNewContributorLastName] = useState("");
  const [newContributorRole, setNewContributorRole] = useState<'admin' | 'contributor'>('contributor');
  const [newContributorExpertise, setNewContributorExpertise] = useState("");
  const [newContributorRoles, setNewContributorRoles] = useState("");
  const [newContributorImage, setNewContributorImage] = useState<File | null>(null);
  const [newContributorImagePreview, setNewContributorImagePreview] = useState<string | null>(null);

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

  // Resize image using Canvas API with center crop to maintain aspect ratio
  function resizeImage(file: File, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Calculate aspect ratios
          const imgAspect = img.width / img.height;
          const targetAspect = width / height;
          
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          
          // Crop to square (center crop) if image is not square
          if (imgAspect > targetAspect) {
            // Image is wider than target - crop width
            sourceWidth = img.height * targetAspect;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            // Image is taller than target - crop height
            sourceHeight = img.width / targetAspect;
            sourceY = (img.height - sourceHeight) / 2;
          }
          
          // Draw the cropped and scaled image
          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (cropped)
            0, 0, width, height  // Destination rectangle (target size)
          );
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert image to PNG blob
  function convertToPng(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Upload profile image to Supabase Storage via API route
  async function uploadProfileImage(firstName: string, imageFile: File): Promise<void> {
    try {
      // Convert original to PNG and create resized versions
      const originalBlob = await convertToPng(imageFile);
      const smallBlob = await resizeImage(imageFile, 32, 32);
      const mediumBlob = await resizeImage(imageFile, 80, 80);

      // Convert blobs to Files for FormData
      const originalFile = new File([originalBlob], `${firstName}.png`, { type: 'image/png' });
      const smallFile = new File([smallBlob], `${firstName}-small.png`, { type: 'image/png' });
      const mediumFile = new File([mediumBlob], `${firstName}-medium.png`, { type: 'image/png' });

      // Create FormData
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('original', originalFile);
      formData.append('small', smallFile);
      formData.append('medium', mediumFile);

      // Upload via API route (uses service role key, bypasses RLS)
      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload images: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully uploaded profile images for ${firstName}:`, result);
    } catch (err) {
      console.error('Error uploading profile image:', err);
      throw err;
    }
  }

  async function getProfileImageUrl(firstName: string, size: 'small' | 'medium' | 'original' = 'medium'): Promise<string | null> {
    try {
      const sizeSuffix = size === 'original' ? '' : `-${size}`;
      const filename = `${firstName}${sizeSuffix}.png`;
      
      // Check if we're in development mode
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      console.log(`[Profile Image] Attempting to load: ${filename} (${isDevelopment ? 'DEV' : 'PROD'} mode)`);
      
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);
      
      if (error) {
        console.error(`[Profile Image] Error loading ${filename}:`, error.message);
        if (isDevelopment) {
          console.warn(`[Profile Image] Development mode troubleshooting:`);
          console.warn(`   1. Check .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY`);
          console.warn(`   2. Verify profile images exist in Supabase Storage "profile-pics" bucket`);
          console.warn(`   3. Check RLS policies: run supabase/profile-pics-storage-policies.sql`);
          console.warn(`   4. Verify the bucket is public or RLS allows read access`);
        }
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
            .select("id, task_id, deliverable_id, filename, filetype, path_hint, description, status, storage_path, ip_id, context_prompt, display_order, created_at")
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
          const imageUrl = await getProfileImageUrl(firstName, 'medium');
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
    if (!newContributorFirstName.trim()) {
      alert("Please enter a first name");
      return;
    }

    try {
      // Combine first and last name
      const fullName = [newContributorFirstName.trim(), newContributorLastName.trim()]
        .filter(n => n.length > 0)
        .join(' ');

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
          name: fullName,
          expertise,
          roles,
          role: newContributorRole
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

      // Upload profile image if provided
      const firstName = newContributorFirstName.trim().toLowerCase();
      if (newContributorImage) {
        try {
          await uploadProfileImage(firstName, newContributorImage);
        } catch (uploadError) {
          console.error("Error uploading profile image:", uploadError);
          // Continue even if image upload fails - contributor is already created
          alert(`Contributor added, but image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Try to load profile image for new contributor
      const imageUrl = await getProfileImageUrl(firstName, 'medium');
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
      setNewContributorFirstName("");
      setNewContributorLastName("");
      setNewContributorRole('contributor');
      setNewContributorExpertise("");
      setNewContributorRoles("");
      setNewContributorImage(null);
      setNewContributorImagePreview(null);
      setIsAddModalOpen(false);

      alert("Contributor added successfully!");
    } catch (err) {
      console.error("Error adding contributor:", err);
      alert(err instanceof Error ? err.message : "Failed to add contributor");
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setNewContributorImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewContributorImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setEditImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSaveName() {
    if (!selectedContributor) return;
    
    const fullName = [editFirstName.trim(), editLastName.trim()]
      .filter(n => n.length > 0)
      .join(' ');

    if (!fullName.trim()) {
      alert("Name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("contributors")
        .update({ name: fullName, updated_at: new Date().toISOString() })
        .eq("id", selectedContributor.id);

      if (error) throw error;

      // Update local state
      setSelectedContributor({
        ...selectedContributor,
        name: fullName
      });

      // Update in contributors list
      setContributors(prev =>
        prev.map(c =>
          c.id === selectedContributor.id
            ? { ...c, name: fullName }
            : c
        )
      );

      // Update cache
      const cached = contributorsCache.get('all');
      if (cached) {
        const updatedContributors = cached.contributors.map(c =>
          c.id === selectedContributor.id
            ? { ...c, name: fullName }
            : c
        );
        contributorsCache.set('all', {
          ...cached,
          contributors: updatedContributors
        });
      }

      setEditFirstName("");
      setEditLastName("");
    } catch (err) {
      console.error("Error updating name:", err);
      alert("Failed to update name");
    }
  }

  async function handleSaveExpertise() {
    if (!selectedContributor) return;

    const expertise = editExpertise
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    try {
      const { error } = await supabase
        .from("contributors")
        .update({ expertise, updated_at: new Date().toISOString() })
        .eq("id", selectedContributor.id);

      if (error) throw error;

      // Update local state
      setSelectedContributor({
        ...selectedContributor,
        expertise
      });

      // Update in contributors list
      setContributors(prev =>
        prev.map(c =>
          c.id === selectedContributor.id
            ? { ...c, expertise }
            : c
        )
      );

      // Update cache
      const cached = contributorsCache.get('all');
      if (cached) {
        const updatedContributors = cached.contributors.map(c =>
          c.id === selectedContributor.id
            ? { ...c, expertise }
            : c
        );
        contributorsCache.set('all', {
          ...cached,
          contributors: updatedContributors
        });
      }

      setEditExpertise("");
    } catch (err) {
      console.error("Error updating expertise:", err);
      alert("Failed to update expertise");
    }
  }

  async function handleSaveRoles() {
    if (!selectedContributor) return;

    const roles = editRoles
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    try {
      const { error } = await supabase
        .from("contributors")
        .update({ roles, updated_at: new Date().toISOString() })
        .eq("id", selectedContributor.id);

      if (error) throw error;

      // Update local state
      setSelectedContributor({
        ...selectedContributor,
        roles
      });

      // Update in contributors list
      setContributors(prev =>
        prev.map(c =>
          c.id === selectedContributor.id
            ? { ...c, roles }
            : c
        )
      );

      // Update cache
      const cached = contributorsCache.get('all');
      if (cached) {
        const updatedContributors = cached.contributors.map(c =>
          c.id === selectedContributor.id
            ? { ...c, roles }
            : c
        );
        contributorsCache.set('all', {
          ...cached,
          contributors: updatedContributors
        });
      }

      setEditRoles("");
    } catch (err) {
      console.error("Error updating roles:", err);
      alert("Failed to update roles");
    }
  }

  async function handleSaveImage() {
    if (!selectedContributor || !editImage) return;

    try {
      const firstName = getFirstName(selectedContributor.name);
      await uploadProfileImage(firstName, editImage);

      // Reload profile image
      const imageUrl = await getProfileImageUrl(firstName, 'medium');
      if (imageUrl) {
        setProfileImageUrls(prev => {
          const updated = new Map(prev);
          updated.set(selectedContributor.id, imageUrl);
          return updated;
        });

        // Update cache
        const cached = contributorsCache.get('all');
        if (cached) {
          const updatedProfileUrls = new Map(cached.profileImageUrls);
          updatedProfileUrls.set(selectedContributor.id, imageUrl);
          contributorsCache.set('all', {
            ...cached,
            profileImageUrls: updatedProfileUrls
          });
        }
      }

      setEditImage(null);
      setEditImagePreview(null);
      alert("Profile image updated successfully!");
    } catch (err) {
      console.error("Error updating profile image:", err);
      alert(err instanceof Error ? err.message : "Failed to update profile image");
    }
  }

  function handleStartEditing() {
    if (!selectedContributor) return;
    const nameParts = selectedContributor.name.split(' ');
    setEditFirstName(nameParts[0] || '');
    setEditLastName(nameParts.slice(1).join(' ') || '');
    setEditExpertise(selectedContributor.expertise.join(', '));
    setEditRoles(selectedContributor.roles.join(', '));
    setIsEditing(true);
  }

  function handleCancelEditing() {
    setIsEditing(false);
    setEditFirstName("");
    setEditLastName("");
    setEditExpertise("");
    setEditRoles("");
    setEditImage(null);
    setEditImagePreview(null);
  }

  async function handleSaveAll() {
    if (!selectedContributor) return;
    
    try {
      // Save all changes
      if (editFirstName.trim() || editLastName.trim()) {
        await handleSaveName();
      }
      if (editExpertise !== selectedContributor.expertise.join(', ')) {
        await handleSaveExpertise();
      }
      if (editRoles !== selectedContributor.roles.join(', ')) {
        await handleSaveRoles();
      }
      if (editImage) {
        await handleSaveImage();
      }
      
      setIsEditing(false);
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Error saving changes:", err);
      alert("Failed to save some changes");
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

          {/* Admin (section header) - Only visible to admins */}
          {isAdmin && (
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
                  <h1 className="text-3xl font-semibold tracking-tight leading-tight">Contributors</h1>
                  <p className="text-sm text-black/60 leading-tight">{ip.name}</p>
                </div>
              </div>
            </div>
          )}

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
          onClick={() => {
            handleCancelEditing();
            setSelectedContributor(null);
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="px-2 py-1 border border-[#e0e0e0] rounded text-lg font-semibold"
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="px-2 py-1 border border-[#e0e0e0] rounded text-lg font-semibold"
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-semibold">{selectedContributor.name}</h2>
                )}
              </div>
              <button
                onClick={() => {
                  handleCancelEditing();
                  setSelectedContributor(null);
                }}
                className="text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Image */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Profile Image</h3>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageSelect}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                    />
                    {editImagePreview ? (
                      <div>
                        <img
                          src={editImagePreview}
                          alt="Preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-[#e0e0e0]"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full overflow-hidden">
                        {profileImageUrls.get(selectedContributor.id) ? (
                          <img
                            src={profileImageUrls.get(selectedContributor.id)!}
                            alt={selectedContributor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                            <span className="text-xl font-semibold text-black/60">
                              {selectedContributor.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    {profileImageUrls.get(selectedContributor.id) ? (
                      <img
                        src={profileImageUrls.get(selectedContributor.id)!}
                        alt={selectedContributor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                        <span className="text-xl font-semibold text-black/60">
                          {selectedContributor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Role</h3>
                {isEditing ? (
                  (() => {
                    const isCaptainKangaroo = selectedContributor.name.toLowerCase() === 'captain kangaroo';
                    return (
                      <>
                        <select
                          value={selectedContributor.role || 'contributor'}
                          onChange={async (e) => {
                            const newRole = e.target.value as 'admin' | 'contributor';
                            try {
                              const { error } = await supabase
                                .from("contributors")
                                .update({ role: newRole, updated_at: new Date().toISOString() })
                                .eq("id", selectedContributor.id);

                              if (error) throw error;

                              // Update local state
                              setSelectedContributor({
                                ...selectedContributor,
                                role: newRole
                              });

                              // Update in contributors list
                              setContributors(prev =>
                                prev.map(c =>
                                  c.id === selectedContributor.id
                                    ? { ...c, role: newRole }
                                    : c
                                )
                              );

                              // Update cache
                              const cached = contributorsCache.get('all');
                              if (cached) {
                                const updatedContributors = cached.contributors.map(c =>
                                  c.id === selectedContributor.id
                                    ? { ...c, role: newRole }
                                    : c
                                );
                                contributorsCache.set('all', {
                                  ...cached,
                                  contributors: updatedContributors
                                });
                              }
                            } catch (err) {
                              console.error("Error updating role:", err);
                              alert("Failed to update role");
                            }
                          }}
                          disabled={isCaptainKangaroo}
                          className={`px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9c9c9] ${
                            isCaptainKangaroo ? 'bg-[#f0f0f0] cursor-not-allowed' : ''
                          }`}
                        >
                          {isCaptainKangaroo ? (
                            <option value="admin">Admin</option>
                          ) : (
                            <>
                              <option value="contributor">Contributor</option>
                              <option value="admin">Admin</option>
                            </>
                          )}
                        </select>
                        {isCaptainKangaroo && (
                          <p className="text-xs text-black/60 mt-1">Captain Kangaroo is always an admin</p>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm bg-[#f0f0f0]">
                    {selectedContributor.role === 'admin' ? 'Admin' : 'Contributor'}
                  </div>
                )}
              </div>

              {/* Roles (array - for backward compatibility) */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Additional Roles</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={editRoles}
                    onChange={(e) => setEditRoles(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                    placeholder="e.g., Game Designer, Technical Artist"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedContributor.roles && selectedContributor.roles.length > 0 ? (
                      selectedContributor.roles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#dfdfdf] rounded text-sm"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-black/60">No additional roles</p>
                    )}
                  </div>
                )}
              </div>

              {/* Expertise */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Expertise</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={editExpertise}
                    onChange={(e) => setEditExpertise(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm"
                    placeholder="e.g., Game design, Animation, Rigging"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedContributor.expertise.length > 0 ? (
                      selectedContributor.expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#c9c9c9] rounded text-sm"
                        >
                          {exp}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-black/60">No expertise listed</p>
                    )}
                  </div>
                )}
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

            {/* Edit button at the bottom */}
            <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAll}
                    className="flex-1 px-4 py-2 bg-[#c9c9c9] hover:bg-[#b0b0b0] rounded-lg font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEditing}
                    className="flex-1 px-4 py-2 border border-[#e0e0e0] hover:bg-[#f9f9f9] rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditing}
                  className="w-full px-4 py-2 bg-[#c9c9c9] hover:bg-[#b0b0b0] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <img src="/pencil.svg" alt="Edit" className="w-4 h-4" />
                  Edit
                </button>
              )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    value={newContributorFirstName}
                    onChange={(e) => setNewContributorFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    value={newContributorLastName}
                    onChange={(e) => setNewContributorLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={newContributorRole}
                  onChange={(e) => setNewContributorRole(e.target.value as 'admin' | 'contributor')}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9c9c9]"
                >
                  <option value="contributor">Contributor</option>
                  <option value="admin">Admin</option>
                </select>
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

              <div>
                <label className="block text-sm font-medium mb-2">Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9c9c9] text-sm"
                />
                {newContributorImagePreview && (
                  <div className="mt-2">
                    <img
                      src={newContributorImagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#e0e0e0]"
                    />
                    {newContributorImage && (
                      <p className="text-xs text-black/60 mt-1">
                        {newContributorImage.name}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-black/60 mt-1">
                  Image will be saved as: {newContributorFirstName.trim() ? `${newContributorFirstName.trim().toLowerCase()}.png` : 'firstname.png'}
                </p>
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

