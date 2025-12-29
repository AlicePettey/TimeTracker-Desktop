import { supabase } from "@/lib/supabase";

export async function generateSyncTokenLocal() {
  // Optional sanity check (helps debugging)
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  if (!sessionData.session) throw new Error("Not signed in");

  const { data, error } = await supabase.functions.invoke("generate-sync-token", {
    body: {},
  });

  if (error) throw error;

  // Your edge function returns { token, expires_at }
  return data as { token: string; expires_at: string };
}
