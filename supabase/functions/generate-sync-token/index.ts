import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ttlHoursRaw = Deno.env.get("SYNC_TOKEN_TTL_HOURS") ?? "72";

    if (!supabaseUrl) return json(500, { error: "Missing SUPABASE_URL" });
    if (!serviceKey) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

    const ttlHours = Number(ttlHoursRaw);
    if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
      return json(500, { error: "Invalid SYNC_TOKEN_TTL_HOURS" });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json(401, { error: "Missing bearer token" });

    // Service-role client; validate the caller via their JWT
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResp, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userResp?.user) {
      return json(401, { error: userErr?.message ?? "Invalid session token" });
    }

    const userId = userResp.user.id;

    const token = randomToken(32);
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from("sync_tokens").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    if (insertErr) return json(500, { error: insertErr.message });

    return json(200, { token, expires_at: expiresAt });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
