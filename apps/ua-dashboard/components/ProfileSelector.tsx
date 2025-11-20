"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Contributor } from "@/types/ip";

interface ProfileSelectorProps {
  onContributorChange?: (contributorId: string) => void;
}

export default function ProfileSelector({ onContributorChange }: ProfileSelectorProps) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [selectedContributorId, setSelectedContributorId] = useState<string>("");
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [profileImageUrls, setProfileImageUrls] = useState<Map<string, string>>(new Map());
  const [showContributorSelector, setShowContributorSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  function getFirstName(fullName: string): string {
    return fullName.split(' ')[0].toLowerCase();
  }

  async function getProfileImageUrl(firstName: string, size: 'small' | 'medium' | 'original' = 'small', tryFallback: boolean = true): Promise<string | null> {
    try {
      const sizeSuffix = size === 'original' ? '' : `-${size}`;
      const filename = `${firstName}${sizeSuffix}.png`;
      
      // Check if we're in development mode
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      console.log(`[ProfileSelector] Loading ${size} image: ${filename}`);
      
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);
      
      if (error) {
        console.warn(`[ProfileSelector] Could not load ${filename}:`, error.message);
        
        // Try fallback sizes if requested
        if (tryFallback && size === 'small') {
          console.log(`[ProfileSelector] Trying fallback: medium size...`);
          const mediumUrl = await getProfileImageUrl(firstName, 'medium', false);
          if (mediumUrl) return mediumUrl;
          
          console.log(`[ProfileSelector] Trying fallback: original size...`);
          const originalUrl = await getProfileImageUrl(firstName, 'original', false);
          if (originalUrl) return originalUrl;
        }
        
        if (isDevelopment) {
          console.warn(`[ProfileSelector] Troubleshooting:`);
          console.warn(`   1. Check if ${filename} exists in Supabase Storage "profile-pics" bucket`);
          console.warn(`   2. Verify RLS policies allow read access`);
          console.warn(`   3. Check Supabase credentials in .env.local`);
        }
        return null;
      }
      
      if (signedUrl?.signedUrl) {
        console.log(`[ProfileSelector] ✅ Successfully loaded: ${filename}`);
        return signedUrl.signedUrl;
      }
      
      console.warn(`[ProfileSelector] ⚠️ No signed URL returned for: ${filename}`);
      return null;
    } catch (err) {
      console.error(`[ProfileSelector] Exception loading profile image for ${firstName} (${size}):`, err);
      return null;
    }
  }

  useEffect(() => {
    async function loadContributors() {
      try {
        const { data, error } = await supabase
          .from("contributors")
          .select("*")
          .order("name");

        if (error) throw error;
        setContributors(data || []);

        // Load profile images for all contributors
        const profileImageUrlMap = new Map<string, string>();
        if (data && data.length > 0) {
          console.log(`[ProfileSelector] Loading profile images for ${data.length} contributors...`);
          const results = await Promise.all(
            data.map(async (contributor) => {
              const firstName = getFirstName(contributor.name);
              const imageUrl = await getProfileImageUrl(firstName, 'small');
              if (imageUrl) {
                profileImageUrlMap.set(contributor.id, imageUrl);
                return { name: contributor.name, success: true };
              }
              return { name: contributor.name, success: false };
            })
          );
          const successCount = results.filter(r => r.success).length;
          console.log(`[ProfileSelector] Loaded ${successCount}/${data.length} profile images`);
        }
        setProfileImageUrls(profileImageUrlMap);

        // Load from sessionStorage or default to first contributor
        const storedId = typeof window !== 'undefined' ? sessionStorage.getItem('selectedContributorId') : null;
        const defaultId = storedId || data?.[0]?.id || '';
        if (defaultId) {
          setSelectedContributorId(defaultId);
          const contributor = data?.find(c => c.id === defaultId) || data?.[0];
          setSelectedContributor(contributor || null);
        }
      } catch (err) {
        console.error("Error loading contributors:", err);
      }
    }

    loadContributors();
  }, []);

  useEffect(() => {
    if (selectedContributorId && contributors.length > 0) {
      const contributor = contributors.find(c => c.id === selectedContributorId);
      setSelectedContributor(contributor || null);
      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('selectedContributorId', selectedContributorId);
        // Emit custom event for pages that need to listen
        window.dispatchEvent(new CustomEvent('contributorChanged', { detail: selectedContributorId }));
      }
      // Notify parent component
      if (onContributorChange) {
        onContributorChange(selectedContributorId);
      }
    }
  }, [selectedContributorId, contributors, onContributorChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowContributorSelector(false);
      }
    }

    if (showContributorSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContributorSelector]);

  function handleContributorSelect(contributorId: string) {
    setSelectedContributorId(contributorId);
    setShowContributorSelector(false);
  }

  if (!selectedContributor) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[1000] flex items-center gap-3" ref={selectorRef}>
      <div className="relative flex items-center gap-3">
        <span className="text-sm font-medium text-black">
          {selectedContributor.name}
        </span>
        <button
          onClick={() => setShowContributorSelector(!showContributorSelector)}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#e0e0e0] hover:border-[#c9c9c9] transition-colors cursor-pointer"
        >
          {profileImageUrls.get(selectedContributor.id) ? (
            <img
              src={profileImageUrls.get(selectedContributor.id)!}
              alt={selectedContributor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
              <span className="text-sm font-semibold text-black/60">
                {selectedContributor.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </button>

        {/* Contributor Dropdown */}
        {showContributorSelector && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              {contributors.map((contributor) => (
                <button
                  key={contributor.id}
                  onClick={() => handleContributorSelect(contributor.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#c9c9c9] transition-colors ${
                    contributor.id === selectedContributorId ? 'bg-[#dfdfdf]' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {profileImageUrls.get(contributor.id) ? (
                      <img
                        src={profileImageUrls.get(contributor.id)!}
                        alt={contributor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#dfdfdf] flex items-center justify-center">
                        <span className="text-xs font-semibold text-black/60">
                          {contributor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{contributor.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

