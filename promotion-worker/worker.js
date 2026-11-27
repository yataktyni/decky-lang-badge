const CODE_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/redeem") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip || !env.REDEEM_RATE_LIMITER) {
      return Response.json({ error: "Service unavailable" }, { status: 503 });
    }
    try {
      if (!(await env.REDEEM_RATE_LIMITER.limit({ key: ip })).success) {
        return Response.json({ error: "Too many requests" }, { status: 429 });
      }
    } catch {
      return Response.json({ error: "Service unavailable" }, { status: 503 });
    }
    if (Number(request.headers.get("content-length")) > 1024) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    let code, claim;
    try {
      const body = await request.text();
      if (body.length > 1024) throw new Error("Request too large");
      ({ code, claim } = JSON.parse(body));
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (typeof code !== "string" || !CODE_PATTERN.test(code) || typeof claim !== "string" || !CODE_PATTERN.test(claim)) {
      return Response.json({ error: "Invalid code" }, { status: 400 });
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const masterHash = env.MASTER_CODE_HASH;
    if (typeof masterHash === "string" && /^[a-f0-9]{64}$/.test(masterHash)) {
      let difference = 0;
      for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ masterHash.charCodeAt(i);
      if (difference === 0) return Response.json({ activated: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const claimDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(claim));
    const claimHash = Array.from(new Uint8Array(claimDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    try {
      const result = await env.DB.prepare(
        "UPDATE codes SET redeemed_at = COALESCE(redeemed_at, unixepoch()), claim_hash = ? WHERE code_hash = ? AND (redeemed_at IS NULL OR claim_hash = ?) RETURNING code_hash"
      ).bind(claimHash, hash, claimHash).first();
      return result
        ? Response.json({ activated: true }, { headers: { "Cache-Control": "no-store" } })
        : Response.json({ error: "Invalid or already used code" }, { status: 400 });
    } catch {
      return Response.json({ error: "Service unavailable" }, { status: 503 });
    }
  },
};
