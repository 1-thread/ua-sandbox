"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { IP, IPVertical } from "@/types/ip";

export default function IPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [ip, setIp] = useState<IP | null>(null);
  const [verticals, setVerticals] = useState<IPVertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<{
    iconUrl: string | null;
    heroUrl: string | null;
  }>({ iconUrl: null, heroUrl: null });

  useEffect(() => {
    async function fetchIPData() {
      try {
        setLoading(true);
        setError(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
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
        <div className="h-24 flex items-center px-5">
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

          {/* Admin (section header) */}
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
                  onClick={() => router.push("/admin/conductor")}
                  className="w-full flex items-center justify-between rounded border border-black/10 bg-transparent hover:bg-white px-3 h-8 text-left text-[14px] cursor-pointer"
                >
                  <span className="truncate">Conductor</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/function-editor")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Function Editor</span>
                </button>
              </div>
            )}
          </div>
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
              <h1 className="text-3xl font-semibold tracking-tight">{ip.name}</h1>
            </div>
            {imageUrls.heroUrl && (
              <div className="w-full max-w-2xl rounded-lg overflow-hidden mb-6">
                <img
                  src={imageUrls.heroUrl}
                  alt={`${ip.name} representative image`}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          {ip.description && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-3 tracking-tight">Description</h2>
              <p className="text-[15px] leading-relaxed text-black/80 max-w-2xl">{ip.description}</p>
            </div>
          )}

          {/* Health Summary */}
          {ip.health_summary && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-3 tracking-tight">Health Summary</h2>
              <p className="text-[15px] leading-relaxed text-black/80 max-w-2xl">{ip.health_summary}</p>
            </div>
          )}

          {/* Pipeline Status */}
          {verticals.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4 tracking-tight">Pipeline Status</h2>
              <div className="space-y-3 max-w-2xl">
                {verticals.map((vertical) => (
                  <div key={vertical.id} className="border border-[#e0e0e0] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[15px] font-medium capitalize text-black">{vertical.vertical_name}</span>
                      <span className="text-[14px] text-black/60">
                        {vertical.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#e0e0e0] rounded-full h-2">
                      <div
                        className="bg-[#c9c9c9] h-2 rounded-full transition-all"
                        style={{ width: `${vertical.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder for Function Graph */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 tracking-tight">Core Functions</h2>
            <div className="border border-[#e0e0e0] rounded-lg p-8 text-center text-black/40 max-w-2xl">
              Function graph visualization coming soon
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

