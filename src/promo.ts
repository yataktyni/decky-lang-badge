import { fetchNoCors } from "@decky/api";
import { fetchWithTimeout } from "./utils";

const UNLOCKED = "decky_trophy_unlocked";
const CLAIM = "decky_trophy_claim";
const ENDPOINT = "https://decky-promo.hungryrabbitjam.workers.dev/redeem";

export function isTrophyUnlocked(): boolean {
    try { return localStorage.getItem(UNLOCKED) === "1"; } catch { return false; }
}

export async function redeemPromo(code: string): Promise<boolean> {
    const cleanCode = code.trim();
    if (!/^[A-Za-z0-9_-]{32}$/.test(cleanCode)) return false;
    let claim = localStorage.getItem(CLAIM);
    if (!claim) {
        const bytes = crypto.getRandomValues(new Uint8Array(24));
        claim = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
        localStorage.setItem(CLAIM, claim);
    }
    const response = await fetchWithTimeout(fetchNoCors(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, claim }),
    }), 10000);
    if (!response.ok || !(await response.json()).activated) return false;
    localStorage.setItem(UNLOCKED, "1");
    return true;
}
