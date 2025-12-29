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
    // Support multiple env var names (because your project has both URL + SUPABASE_URL, etc.)
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("URL") ??
      Deno.env.get("SUPABASE_FUNCTIONS_URL");

    const serviceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");

    const ttlHoursRaw = Deno.env.get("SYNC_TOKEN_TTL_HOURS") ?? "72";

    if (!supabaseUrl) return json(500, { error: "Missing SUPABASE_URL (or URL)" });
    if (!serviceKey) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)" });

    const ttlHours = Number(ttlHoursRaw);
    if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
      return json(500, { error: "Invalid SYNC_TOKEN_TTL_HOURS" });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const hasBearer = authHeader.toLowerCase().startsWith("bearer ");
    if (!hasBearer) {
      // This is the most important “is the header arriving?” check
      return json(401, {
        error: "Missing bearer token",
        debug: {
          receivedAuthorizationHeader: authHeader ? "present-but-not-bearer" : "missing",
        },
      });
    }

    // Create admin client for DB insert.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Validate the user's JWT by asking Supabase Auth (using the JWT as the Authorization header)
    const jwt = authHeader.slice(7); // remove "Bearer "
    const { data: userResp, error: userErr } = await admin.auth.getUser(jwt);

    if (userErr || !userResp?.user) {
      return json(401, {
        error: "Invalid session token",
        debug: {
          message: userErr?.message ?? null,
        },
      });
    }

    const userId = userResp.user.id;

    const body = await req.json().catch(() => ({}));
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    const deviceName = typeof body?.deviceName === "string" ? body.deviceName : "Desktop App";
    const platform = typeof body?.platform === "string" ? body.platform : "unknown";

    const token = randomToken(32);
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    };

    // Only include these if your table has the columns (safe to try; if it errors, you'll see message)
    if (deviceId) insertPayload.device_id = deviceId;
    insertPayload.device_name = deviceName;
    insertPayload.platform = platform;

    const { error: insertErr } = await admin.from("sync_tokens").insert(insertPayload);

    if (insertErr) {
      return json(500, {
        error: "Insert failed",
        debug: { message: insertErr.message },
      });
    }

    return json(200, { success: true, token, expires_at: expiresAt });
  } catch (e) {
    return json(500, { error: "Unhandled error", debug: { message: String(e) } });
  }
});
