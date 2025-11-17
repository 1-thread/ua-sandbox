"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestDB() {
  const [result, setResult] = useState("Testing connection...");
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    async function test() {
      const logs: string[] = [];
      
      try {
        // Test 1: Check env vars
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        logs.push(`URL exists: ${!!url}`);
        logs.push(`Key exists: ${!!key}`);
        logs.push(`URL: ${url?.substring(0, 30)}...`);
        
        if (!url || !key) {
          setResult("❌ Missing environment variables!");
          setDetails(logs);
          return;
        }

        // Test 2: Try to query ips table
        logs.push("Attempting to query 'ips' table...");
        const { data, error } = await supabase
          .from("ips")
          .select("slug, name")
          .limit(5);

        if (error) {
          logs.push(`Error: ${error.message}`);
          logs.push(`Error code: ${error.code}`);
          logs.push(`Error details: ${JSON.stringify(error)}`);
          setResult(`❌ Query failed: ${error.message}`);
          setDetails(logs);
          return;
        }

        logs.push(`✅ Success! Found ${data?.length || 0} IPs`);
        if (data && data.length > 0) {
          logs.push(`IPs: ${data.map(ip => ip.name).join(", ")}`);
        }

        setResult(`✅ Connected! Found ${data?.length || 0} IPs`);
        setDetails(logs);
      } catch (err) {
        logs.push(`Exception: ${err}`);
        logs.push(`Error type: ${err instanceof Error ? err.constructor.name : typeof err}`);
        setResult(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
        setDetails(logs);
      }
    }

    test();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-white text-black">
      <h1 className="text-2xl font-semibold mb-4">Database Connection Test</h1>
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="font-semibold">{result}</p>
      </div>
      <div className="space-y-1 text-sm font-mono">
        {details.map((log, i) => (
          <div key={i} className="text-gray-600">{log}</div>
        ))}
      </div>
    </div>
  );
}

