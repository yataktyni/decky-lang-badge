import { describe, expect, it } from "vitest";
import worker from "../promotion-worker/worker.js";

describe("promotion worker", () => {
  const limiter = { limit: async () => ({ success: true }) };
  it("accepts the master code on multiple devices without accessing the promo database", async () => {
    const code = "abcdefghijklmnopqrstuvwxyzABCDEF";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const db = { prepare: () => { throw new Error("must not access promo codes"); } };
    const request = (claim: string) => new Request("https://example.test/redeem", {
      method: "POST", headers: { "CF-Connecting-IP": "192.0.2.1" }, body: JSON.stringify({ code, claim }),
    });
    const env = { DB: db, REDEEM_RATE_LIMITER: limiter, MASTER_CODE_HASH: hash };
    expect((await worker.fetch(request("12345678901234567890123456789012"), env)).status).toBe(200);
    expect((await worker.fetch(request("12345678901234567890123456789013"), env)).status).toBe(200);
  });
  it("redeems a valid code only once and stores only its hash", async () => {
    let storedHash = "";
    let claimedBy = "";
    const db = { prepare: () => ({ bind: (claimHash: string, hash: string) => ({ first: async () => {
      if (storedHash && claimedBy !== claimHash) return null;
      storedHash = hash;
      claimedBy = claimHash;
      return { code_hash: hash };
    } }) }) };
    const code = "abcdefghijklmnopqrstuvwxyzABCDEF";
    const request = (claim = "12345678901234567890123456789012") => new Request("https://example.test/redeem", {
      method: "POST", headers: { "CF-Connecting-IP": "192.0.2.1" }, body: JSON.stringify({ code, claim }),
    });
    expect((await worker.fetch(request(), { DB: db, REDEEM_RATE_LIMITER: limiter })).status).toBe(200);
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedHash).not.toContain(code);
    expect((await worker.fetch(request(), { DB: db, REDEEM_RATE_LIMITER: limiter })).status).toBe(200);
    expect((await worker.fetch(request("12345678901234567890123456789013"), { DB: db, REDEEM_RATE_LIMITER: limiter })).status).toBe(400);
  });

  it("rejects malformed codes and reports database failures", async () => {
    const db = { prepare: () => { throw new Error("offline"); } };
    const request = (code: string) => new Request("https://example.test/redeem", {
      method: "POST", headers: { "CF-Connecting-IP": "192.0.2.1" }, body: JSON.stringify({ code, claim: "12345678901234567890123456789012" }),
    });
    expect((await worker.fetch(request("short"), { DB: db, REDEEM_RATE_LIMITER: limiter })).status).toBe(400);
    expect((await worker.fetch(request("abcdefghijklmnopqrstuvwxyzABCDEF"), { DB: db, REDEEM_RATE_LIMITER: limiter })).status).toBe(503);
  });

  it("rejects requests when rate limited or the limiter is missing", async () => {
    const request = new Request("https://example.test/redeem", { method: "POST", headers: { "CF-Connecting-IP": "192.0.2.1" } });
    expect((await worker.fetch(request.clone(), { DB: {} })).status).toBe(503);
    expect((await worker.fetch(request, { DB: {}, REDEEM_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status).toBe(429);
  });
});
