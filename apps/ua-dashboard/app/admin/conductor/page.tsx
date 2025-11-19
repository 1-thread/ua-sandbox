"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP } from "@/types/ip";

export default function ConductorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipSlug = searchParams.get('ip');
  
  const [ip, setIp] = useState<IP | null>(null);
  const [ipIconUrl, setIpIconUrl] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

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
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-semibold mb-8">Conductor</h1>
        </div>
      </main>
    </div>
  );
}

