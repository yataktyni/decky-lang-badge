import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  detectLanguageFromLocale,
  resolveTargetLanguage,
  hasOfficialLanguageInAppStore,
  isOfficialLanguageInStoreText,
} from "../src/languages";

describe("languages registry", () => {
  it("excludes Russian and includes 29 supported Steam languages", () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(29);
    expect(SUPPORTED_LANGUAGES.some((l) => (l.code as string) === "ru")).toBe(false);
  });

  it("auto-detects locale from Steam UI and falls back to Ukrainian for English/unsupported", () => {
    expect(detectLanguageFromLocale("uk-UA").code).toBe("uk");
    expect(detectLanguageFromLocale("pl-PL").code).toBe("pl");
    expect(detectLanguageFromLocale("cs-CZ").code).toBe("cs");
    expect(detectLanguageFromLocale("tr-TR").code).toBe("tr");
    expect(detectLanguageFromLocale("pt-BR").code).toBe("pt-BR");
    expect(detectLanguageFromLocale("pt-PT").code).toBe("pt");
    expect(detectLanguageFromLocale("es-MX").code).toBe("es-419");
    expect(detectLanguageFromLocale("es-ES").code).toBe("es");
    expect(detectLanguageFromLocale("zh-TW").code).toBe("zh-TW");
    expect(detectLanguageFromLocale("zh-CN").code).toBe("zh-CN");
    expect(detectLanguageFromLocale("en-US").code).toBe("uk");
    expect(detectLanguageFromLocale("ru-RU").code).toBe("uk");
  });

  it("respects explicit targetLanguage override", () => {
    const tr = resolveTargetLanguage("tr", "uk-UA");
    expect(tr.code).toBe("tr");
    expect(tr.flag).toBe("🇹🇷");
    expect(tr.badgeLabels.official).toBe("Resmi");
    expect(tr.hasUkrainianCommunity).toBeFalsy();

    const en = resolveTargetLanguage("en", "uk-UA");
    expect(en.code).toBe("en");
    expect(en.flag).toBe("🇬🇧");
  });

  it("matches Steam Store supported_languages accurately including regional variants", () => {
    const ptBr = resolveTargetLanguage("pt-BR");
    const pt = resolveTargetLanguage("pt");
    const esLatam = resolveTargetLanguage("es-419");
    const es = resolveTargetLanguage("es");

    expect(isOfficialLanguageInStoreText("English, Portuguese - Brazil", ptBr)).toBe(true);
    expect(isOfficialLanguageInStoreText("English, Portuguese - Brazil", pt)).toBe(false);
    expect(isOfficialLanguageInStoreText("English, Portuguese - Portugal", pt)).toBe(true);
    expect(isOfficialLanguageInStoreText("English, Spanish - Latin America", esLatam)).toBe(true);
    expect(isOfficialLanguageInStoreText("English, Spanish - Latin America", es)).toBe(false);
    expect(isOfficialLanguageInStoreText("English, Spanish - Spain", es)).toBe(true);
  });

  it("checks Steam ELanguage bitfield_supported_languages across languages", () => {
    const map = new Map<number, { bitfield_supported_languages: string }>([
      [1091500, { bitfield_supported_languages: "241965055" }], // Cyberpunk 2077
      [108600, { bitfield_supported_languages: "1282277375" }], // Project Zomboid
      [1145360, { bitfield_supported_languages: "4199807" }], // Hades
      [33320, { bitfield_supported_languages: "47" }], // Prince of Persia
    ]);
    (window as any).appStore = {
      GetAppOverviewByAppID: (id: number) => map.get(id),
    };

    expect(hasOfficialLanguageInAppStore("1091500", resolveTargetLanguage("uk"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("1091500", resolveTargetLanguage("pl"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("1091500", resolveTargetLanguage("cs"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("1091500", resolveTargetLanguage("tr"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("108600", resolveTargetLanguage("id"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("1145360", resolveTargetLanguage("uk"))).toBe(false);
    expect(hasOfficialLanguageInAppStore("1145360", resolveTargetLanguage("pl"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("33320", resolveTargetLanguage("de"))).toBe(true);
    expect(hasOfficialLanguageInAppStore("33320", resolveTargetLanguage("pl"))).toBe(false);

    delete (window as any).appStore;
  });
});

