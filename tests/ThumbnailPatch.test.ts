import { describe, it, expect, vi } from "vitest";

vi.mock("@decky/api", () => ({
  call: vi.fn(),
  routerHook: { addPatch: vi.fn(), removePatch: vi.fn() },
}));

vi.mock("../src/hooks/useBadgeStatus", () => ({
  getCachedBadgeStatus: (id: string) => (id === "1091500" ? "OFFICIAL" : null),
}));

import {
  extractCapsuleAppId,
  hasOfficialUkrainianInAppStore,
  resolveThumbnailBadge,
} from "../src/patches/ThumbnailPatch";

describe("ThumbnailPatch helpers", () => {
  it("extractCapsuleAppId reads data-id and Steam asset img URLs", () => {
    const el1 = document.createElement("div");
    el1.setAttribute("data-id", "1284410");
    expect(extractCapsuleAppId(el1)).toBe("1284410");

    const el2 = document.createElement("div");
    const img = document.createElement("img");
    img.src = "https://shared.steamstatic.com/store_item_assets/steam/apps/assets/464060/library_600x900.jpg";
    el2.appendChild(img);
    expect(extractCapsuleAppId(el2)).toBe("464060");
  });

  it("hasOfficialUkrainianInAppStore detects Steam ELanguage bit 26", () => {
    const map = new Map<number, { bitfield_supported_languages: string }>([
      [1091500, { bitfield_supported_languages: "241965055" }], // Cyberpunk 2077 (official UK)
      [108600, { bitfield_supported_languages: "1282277375" }], // Project Zomboid (official UK)
      [1284410, { bitfield_supported_languages: "138417535" }], // GWENT (no official UK)
      [1145360, { bitfield_supported_languages: "4199807" }], // Hades (no official UK)
    ]);
    (window as any).appStore = {
      GetAppOverviewByAppID: (id: number) => map.get(id),
    };

    expect(hasOfficialUkrainianInAppStore("1091500")).toBe(true);
    expect(hasOfficialUkrainianInAppStore("108600")).toBe(true);
    expect(hasOfficialUkrainianInAppStore("1284410")).toBe(false);
    expect(hasOfficialUkrainianInAppStore("1145360")).toBe(false);

    delete (window as any).appStore;
  });

  it("resolveThumbnailBadge returns installed, update, official, and available specs", () => {
    const map = {
      "1284410": { installed: true, has_update: false, count: 1 },
      "383870": { installed: true, has_update: true, count: 1 },
      "464060": { installed: false, has_update: false, count: 1 },
    };

    expect(resolveThumbnailBadge("1284410", true, map)?.text).toBe("🇺🇦 ✓");
    expect(resolveThumbnailBadge("383870", true, map)?.text).toBe("🇺🇦 ⬆");
    expect(resolveThumbnailBadge("464060", true, map)?.text).toBe("🇺🇦 LBK");
    expect(resolveThumbnailBadge("1091500", true, map)?.text).toBe("🇺🇦");
    expect(resolveThumbnailBadge("999999", true, map)).toBeNull();
  });
});

