import { createClient } from "@supabase/supabase-js";

// Your Supabase project URL + anon key (SAFE to use in frontend)
export const supabaseUrl = "https://mfkvbauiirxvrsgkiztz.supabase.co";
export const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma3ZiYXVpaXJ4dnJzZ2tpenR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzUxNTAsImV4cCI6MjA4MjUxMTE1MH0.2H-8kPyZ1GVSBbvF8Ua8if1cdGTQSrTVTZm_PnPROEw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "timetracker-auth",
  },
});
