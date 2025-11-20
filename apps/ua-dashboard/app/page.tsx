// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/components/LogoutContext";

export default function LandingPage() {
  const router = useRouter();
  const { handleLogout } = useLogout();
  const [isIpOpen, setIsIpOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220); // px
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!isResizing) return;
      const minWidth = 180;
      const maxWidth = 320;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, event.clientX));
      setSidebarWidth(newWidth);
    }

    function handleMouseUp() {
      if (isResizing) {
        setIsResizing(false);
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar */}
      <aside
        className="relative shrink-0 border-r border-[#e0e0e0] bg-white flex flex-col"
        style={{ width: sidebarWidth }}
      >
        {/* Logo / brand */}
        <div className="h-24 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            {/* UA wordmark from Title.svg */}
            <img
              src="/Title.svg"
              alt="UA"
              className="block h-8 w-auto"
            />
            {/* Product name */}
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-semibold truncate">Universal</span>
              <span className="font-semibold truncate">Asset</span>
            </div>
          </div>
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

        {/* Main nav + IP list */}
        <nav className="flex-1 px-2 pt-4 space-y-3 text-sm font-medium">
          {/* IPs (section header) */}
          <div
            onMouseEnter={() => setIsIpOpen(true)}
            onMouseLeave={() => setIsIpOpen(false)}
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-transparent hover:bg-[#c9c9c9] transition-colors"
              onClick={() => setIsIpOpen((open) => !open)}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded">
                <img
                  src="/home.svg"
                  alt="Home"
                  className="block h-4 w-4"
                />
              </span>
              <span className="truncate">IPs</span>
            </button>

            {/* Segmented IP list */}
            {isIpOpen && (
              <div className="mt-1 rounded-lg bg-[#dfdfdf] px-1.5 py-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => router.push("/ip/doh-world")}
                  className="w-full flex items-center justify-between rounded border border-black/10 bg-transparent hover:bg-white px-3 h-8 text-left text-[14px] cursor-pointer"
                >
                  <span className="truncate">Doh World</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/ip/squid-ninja")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Squid Ninja</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/ip/trapdoor-city")}
                  className="w-full flex items-center justify-between rounded px-3 h-7 text-left text-[14px] hover:bg-white cursor-pointer"
                >
                  <span className="truncate">Trapdoor City</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom DW Chat pill */}
        <div className="px-2 pb-4 pt-2">
          <button className="w-full flex items-center gap-3 rounded-lg px-4 h-10 bg-[#c9c9c9] text-sm font-medium">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/60">
              <img
                src="/sticker.svg"
                alt="DW Chat"
                className="block h-4 w-4"
              />
            </span>
            <span className="truncate">DW Chat: 4 Online</span>
          </button>
        </div>
        {/* Resize handle on the right edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#e0e0e0]"
          onMouseDown={() => setIsResizing(true)}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 relative bg-white">
        {/* Prompt sits just inside the main area, right next to the sidebar/IPs row */}
        <div className="ip-horizontal-bounce absolute left-[12px] top-[112px] flex items-center gap-1.5">
          {/* Arrow left pointing at IPs menu */}
          <span className="inline-flex items-center justify-center">
            <span className="block border-l-2 border-b-2 border-black rotate-45 h-5 w-5" />
          </span>

          <h1 className="font-medium text-[18px] tracking-[-0.03em] leading-[1.3]">
            Select IP to begin.
          </h1>
        </div>
      </main>
    </div>
  );
}// Updated
