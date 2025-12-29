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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ttlHoursRaw = Deno.env.get("SYNC_TOKEN_TTL_HOURS") ?? "72";

    if (!supabaseUrl) {
      return json(500, { success: false, error: "Missing SUPABASE_URL" });
    }
    if (!serviceKey) {
      return json(500, {
        success: false,
        error: "Missing SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const ttlHours = Number(ttlHoursRaw);
    if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
      return json(500, { success: false, error: "Invalid SYNC_TOKEN_TTL_HOURS" });
    }

    // Require caller to be an authenticated user
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) {
      return json(401, { success: false, error: "Missing bearer token" });
    }

    // Admin client (service role) – validate user via JWT
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResp, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userResp?.user) {
      return json(401, { success: false, error: "Invalid session token" });
    }

    const userId = userResp.user.id;

    // Optional request body fields (nice to store for device list UI)
    let deviceId: string | null = null;
    let deviceName: string | null = null;
    let platform: string | null = null;

    try {
      const body = await req.json();
      deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
      deviceName = typeof body?.deviceName === "string" ? body.deviceName : null;
      platform = typeof body?.platform === "string" ? body.platform : null;
    } catch {
      // body is optional; ignore parse errors
    }

    const token = randomToken(32);
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from("sync_tokens").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      device_id: deviceId,
      device_name: deviceName,
      platform: platform,
      is_revoked: false,
      last_used_at: new Date().toISOString(),
    });

    if (insertErr) {
      return json(500, { success: false, error: insertErr.message });
    }

    return json(200, {
      success: true,
      token,
      expires_at: expiresAt,
    });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});
