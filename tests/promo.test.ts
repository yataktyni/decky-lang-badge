import { beforeEach, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@decky/api", () => ({ fetchNoCors: fetchMock }));
vi.mock("@decky/ui", () => ({ Navigation: {} }));

import { isTrophyUnlocked, redeemPromo } from "../src/promo";
import { resolveTargetLanguage, isOfficialLanguageInStoreText } from "../src/languages";

beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); });

it("unlocks locally after redemption and reuses the same claim for retry", async () => {
  fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: true, json: async () => ({ activated: true }) });
  const code = "abcdefghijklmnopqrstuvwxyzABCDEF";
  await expect(redeemPromo(code)).rejects.toThrow();
  expect(isTrophyUnlocked()).toBe(false);
  const firstClaim = JSON.parse(fetchMock.mock.calls[0][1].body).claim;
  expect(await redeemPromo(code)).toBe(true);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).claim).toBe(firstClaim);
  expect(isTrophyUnlocked()).toBe(true);
  expect(isOfficialLanguageInStoreText("English, Russian", resolveTargetLanguage("ru"))).toBe(true);
});
