import { describe, it, expect } from "vitest";
import { SUPPORTED_LANGUAGES, resolveTargetLanguage } from "../src/languages";
import { resolveUiLanguage, t } from "../src/translations";

const REQUIRED_UI_KEYS = [
  "settings_title",
  "target_language",
  "target_language_auto",
  "tab_general",
  "tab_layout",
  "tab_info",
  "badge_type",
  "official",
  "community",
  "none",
  "support_title",
  "support_subtitle",
  "translation_guide_en",
  "version",
];

describe("translations", () => {
  it("provides full UI and badge status translations for all 29 supported languages", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const key of REQUIRED_UI_KEYS) {
        const value = t(key, lang.code);
        expect(value, `Missing key "${key}" for "${lang.code}"`).toBeTruthy();
        expect(value).not.toBe(key);
      }
    }

    expect(t("official", "pl")).toBe("Oficjalna");
    expect(t("community", "pl")).toBe("Społeczność");
    expect(t("none", "pl")).toBe("Brak");
    expect(t("official", "uk")).toBe("Офіційна");
    expect(t("official", "ja")).toBe("公式");
  });

  it("resolveUiLanguage follows explicit selection and auto-detects from Steam UI", () => {
    expect(resolveUiLanguage("pl", resolveTargetLanguage("pl"), "uk-UA")).toBe("pl");
    expect(resolveUiLanguage("de", resolveTargetLanguage("de"), "uk-UA")).toBe("de");
    expect(resolveUiLanguage("auto", resolveTargetLanguage("auto", "uk-UA"), "uk-UA")).toBe("uk");
    expect(resolveUiLanguage("auto", resolveTargetLanguage("auto", "pl-PL"), "pl-PL")).toBe("pl");
    expect(resolveUiLanguage("auto", resolveTargetLanguage("auto", "es-CO"), "es-CO")).toBe("es-419");
    expect(resolveUiLanguage("auto", resolveTargetLanguage("auto", "en-US"), "en-US")).toBe("en");
  });
});

