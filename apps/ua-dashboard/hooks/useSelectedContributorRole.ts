"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Contributor } from "@/types/ip";

/**
 * Custom hook to get the role of the currently selected contributor
 * Returns 'admin' | 'contributor' | null
 */
export function useSelectedContributorRole(): 'admin' | 'contributor' | null {
  const [role, setRole] = useState<'admin' | 'contributor' | null>(null);

  useEffect(() => {
    async function loadContributorRole() {
      try {
        // Get selected contributor ID from sessionStorage
        const selectedId = typeof window !== 'undefined' 
          ? sessionStorage.getItem('selectedContributorId') 
          : null;

        if (!selectedId) {
          setRole(null);
          return;
        }

        // Fetch contributor from database
        const { data, error } = await supabase
          .from("contributors")
          .select("role")
          .eq("id", selectedId)
          .single();

        if (error) {
          console.error("Error loading contributor role:", error);
          setRole(null);
          return;
        }

        // Set role (default to 'contributor' if not set)
        setRole((data?.role as 'admin' | 'contributor') || 'contributor');
      } catch (err) {
        console.error("Error in loadContributorRole:", err);
        setRole(null);
      }
    }

    // Load initial role
    loadContributorRole();

    // Listen for contributor changes
    function handleContributorChange() {
      loadContributorRole();
    }

    window.addEventListener('contributorChanged', handleContributorChange);

    return () => {
      window.removeEventListener('contributorChanged', handleContributorChange);
    };
  }, []);

  return role;
}

