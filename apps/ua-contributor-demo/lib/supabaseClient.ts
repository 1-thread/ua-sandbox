// lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client instance only if env vars are present
let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
  }
}

// Export client - create a getter that ensures client exists
export const supabase = (() => {
  if (!supabaseInstance) {
    // Return a proxy that throws helpful errors when accessed
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
        );
      },
    });
  }
  return supabaseInstance;
})();

