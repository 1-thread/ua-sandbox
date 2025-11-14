// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  created_at: string;
};

const sortOptions = [
  { value: "name", label: "Name (A–Z)" },
  { value: "role", label: "Role (A–Z)" },
  { value: "created_desc", label: "Newest" },
  { value: "created_asc", label: "Oldest" },
];

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("profiles_demo")
        .select("*");

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setProfiles((data ?? []) as Profile[]);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    // text filter
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q) ||
          (p.bio ?? "").toLowerCase().includes(q)
      );
    }

    // sort
    result.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "role":
          return a.role.localeCompare(b.role);
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [profiles, query, sort]);

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px",
        background: "#0f172a",
        color: "#f9fafb",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>UA Contributors (demo)</h1>
          <p style={{ color: "#9ca3af" }}>
            Powered by Supabase & Next.js. Search, sort, and browse your fake
            contributor profiles.
          </p>
        </header>

        {/* Controls */}
        <section
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search by name, role, or bio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: "1 1 260px",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #1f2937",
              background: "#020617",
              color: "#f9fafb",
              outline: "none",
            }}
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #1f2937",
              background: "#020617",
              color: "#f9fafb",
            }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        {/* Status */}
        {loading && <p>Loading contributors…</p>}
        {error && (
          <p style={{ color: "#f97373" }}>Error loading data: {error}</p>
        )}

        {/* Cards */}
        {!loading && !error && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {filteredProfiles.map((p) => (
              <article
                key={p.id}
                style={{
                  borderRadius: 16,
                  padding: 16,
                  background:
                    "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.35))",
                  border: "1px solid #1f2937",
                  boxShadow:
                    "0 12px 30px rgba(15,23,42,0.7), 0 0 0 1px rgba(148,163,184,0.1)",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>{p.role}</div>
                </div>
                {p.bio && (
                  <p style={{ fontSize: 14, color: "#e5e7eb", marginBottom: 8 }}>
                    {p.bio}
                  </p>
                )}
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "#6b7280",
                  }}
                >
                  Created {new Date(p.created_at).toLocaleDateString()}
                </div>
              </article>
            ))}

            {filteredProfiles.length === 0 && (
              <p style={{ gridColumn: "1 / -1", color: "#9ca3af" }}>
                No contributors match your search.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

