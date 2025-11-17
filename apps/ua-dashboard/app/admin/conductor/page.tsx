"use client";

import { useRouter } from "next/navigation";

export default function ConductorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Sidebar - same as landing page */}
      <aside className="w-64 shrink-0 border-r border-[#e0e0e0] bg-white flex flex-col">
        {/* Logo / brand */}
        <div className="h-24 flex items-center px-5">
          <div className="flex items-center gap-3">
            <img
              src="/Title.svg"
              alt="UA"
              className="block h-8 w-auto"
            />
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-semibold truncate">Universal</span>
              <span className="font-semibold truncate">Asset</span>
            </div>
          </div>
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

