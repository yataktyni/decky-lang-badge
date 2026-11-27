// src/languages.ts
// Multi-language registry for Steam ELanguage bitfields & Store API matching

export type TargetLanguageCode =
    | "uk"
    | "pl"
    | "cs"
    | "tr"
    | "pt-BR"
    | "pt"
    | "es"
    | "es-419"
    | "de"
    | "fr"
    | "it"
    | "ja"
    | "ko"
    | "zh-CN"
    | "zh-TW"
    | "nl"
    | "sv"
    | "da"
    | "fi"
    | "no"
    | "hu"
    | "ro"
    | "bg"
    | "el"
    | "ar"
    | "th"
    | "vi"
    | "id"
    | "en";

export type TargetLanguageSetting = "auto" | TargetLanguageCode;

export interface CommunityLink {
    label: string;
    url: string;
    kind?: "portal" | "video" | "guide";
}

export interface LanguageConfig {
    code: TargetLanguageCode;
    /** Bit position in Steam appStore `bitfield_supported_languages` (ELanguage enum). */
    steamBit: number;
    flag: string;
    nativeName: string;
    englishName: string;
    /** Whether Kuli.com.ua / LBK Launcher community integration applies. */
    hasUkrainianCommunity?: boolean;
    /** Language-specific community translation portals / guides shown in LinksSection. */
    communityLinks?: readonly CommunityLink[];
    /** Matches Steam Store API `supported_languages` HTML string (lowercase). */
    storeMatch: (supportedLanguagesLower: string) => boolean;
    /** Short native labels rendered on game page & Store badges. */
    badgeLabels: {
        official: string;
        none: string;
    };
}

const includesToken = (token: string) => (langs: string) => langs.includes(token);

export const SUPPORTED_LANGUAGES: readonly LanguageConfig[] = [
    {
        code: "uk",
        steamBit: 26,
        flag: "🇺🇦",
        nativeName: "Українська",
        englishName: "Ukrainian",
        hasUkrainianCommunity: true,
        storeMatch: includesToken("ukrainian"),
        badgeLabels: { official: "Офіційна", none: "Відсутня" },
    },
    {
        code: "pl",
        steamBit: 12,
        flag: "🇵🇱",
        nativeName: "Polski",
        englishName: "Polish",
        communityLinks: [
            { label: "Graj Po Polsku", url: "https://grajpopolsku.pl/", kind: "portal" },
        ],
        storeMatch: includesToken("polish"),
        badgeLabels: { official: "Oficjalna", none: "Brak" },
    },
    {
        code: "cs",
        steamBit: 19,
        flag: "🇨🇿",
        nativeName: "Čeština",
        englishName: "Czech",
        communityLinks: [
            { label: "Lokalizace.net", url: "https://lokalizace.net/", kind: "portal" },
            { label: "Herní Překlady", url: "https://hernipreklady.cz/", kind: "portal" },
        ],
        storeMatch: includesToken("czech"),
        badgeLabels: { official: "Oficiální", none: "Chybí" },
    },
    {
        code: "tr",
        steamBit: 21,
        flag: "🇹🇷",
        nativeName: "Türkçe",
        englishName: "Turkish",
        communityLinks: [
            { label: "Sirius Çeviri", url: "https://siriusceviri.com/", kind: "portal" },
            { label: "Steam Deck Türkçe Yama Rehberi", url: "https://www.youtube.com/watch?v=lgaaOG7Avw8", kind: "video" },
        ],
        storeMatch: includesToken("turkish"),
        badgeLabels: { official: "Resmi", none: "Yok" },
    },
    {
        code: "pt-BR",
        steamBit: 22,
        flag: "🇧🇷",
        nativeName: "Português (Brasil)",
        englishName: "Portuguese (Brazil)",
        communityLinks: [
            { label: "Tribo Gamer", url: "https://tribogamer.com/", kind: "portal" },
            { label: "Traduções e mods no Steam Deck", url: "https://www.youtube.com/watch?v=Gcs0ZD4eaWU", kind: "video" },
        ],
        storeMatch: includesToken("portuguese - brazil"),
        badgeLabels: { official: "Oficial", none: "Nenhuma" },
    },
    {
        code: "pt",
        steamBit: 11,
        flag: "🇵🇹",
        nativeName: "Português",
        englishName: "Portuguese",
        storeMatch: (langs) =>
            langs.includes("portuguese - portugal") || /\bportuguese(?!\s*-\s*brazil)/i.test(langs),
        badgeLabels: { official: "Oficial", none: "Nenhuma" },
    },
    {
        code: "es",
        steamBit: 5,
        flag: "🇪🇸",
        nativeName: "Español",
        englishName: "Spanish (Spain)",
        communityLinks: [
            { label: "TraduSquare", url: "https://tradusquare.es/", kind: "portal" },
        ],
        storeMatch: (langs) =>
            langs.includes("spanish - spain") || /\bspanish(?!\s*-\s*latin america)/i.test(langs),
        badgeLabels: { official: "Oficial", none: "Ninguna" },
    },
    {
        code: "es-419",
        steamBit: 27,
        flag: "🌎",
        nativeName: "Español (LatAm)",
        englishName: "Spanish (Latin America)",
        communityLinks: [
            { label: "TraduSquare", url: "https://tradusquare.es/", kind: "portal" },
        ],
        storeMatch: includesToken("spanish - latin america"),
        badgeLabels: { official: "Oficial", none: "Ninguna" },
    },
    {
        code: "de",
        steamBit: 1,
        flag: "🇩🇪",
        nativeName: "Deutsch",
        englishName: "German",
        storeMatch: includesToken("german"),
        badgeLabels: { official: "Offiziell", none: "Keine" },
    },
    {
        code: "fr",
        steamBit: 2,
        flag: "🇫🇷",
        nativeName: "Français",
        englishName: "French",
        storeMatch: includesToken("french"),
        badgeLabels: { official: "Officielle", none: "Aucune" },
    },
    {
        code: "it",
        steamBit: 3,
        flag: "🇮🇹",
        nativeName: "Italiano",
        englishName: "Italian",
        storeMatch: includesToken("italian"),
        badgeLabels: { official: "Ufficiale", none: "Nessuna" },
    },
    {
        code: "ja",
        steamBit: 10,
        flag: "🇯🇵",
        nativeName: "日本語",
        englishName: "Japanese",
        storeMatch: includesToken("japanese"),
        badgeLabels: { official: "公式", none: "なし" },
    },
    {
        code: "ko",
        steamBit: 4,
        flag: "🇰🇷",
        nativeName: "한국어",
        englishName: "Korean",
        storeMatch: includesToken("korean"),
        badgeLabels: { official: "공식", none: "없음" },
    },
    {
        code: "zh-CN",
        steamBit: 6,
        flag: "🇨🇳",
        nativeName: "简体中文",
        englishName: "Simplified Chinese",
        storeMatch: includesToken("simplified chinese"),
        badgeLabels: { official: "官方", none: "无" },
    },
    {
        code: "zh-TW",
        steamBit: 7,
        flag: "🇹🇼",
        nativeName: "繁體中文",
        englishName: "Traditional Chinese",
        storeMatch: includesToken("traditional chinese"),
        badgeLabels: { official: "官方", none: "無" },
    },
    {
        code: "nl",
        steamBit: 14,
        flag: "🇳🇱",
        nativeName: "Nederlands",
        englishName: "Dutch",
        storeMatch: includesToken("dutch"),
        badgeLabels: { official: "Officieel", none: "Geen" },
    },
    {
        code: "sv",
        steamBit: 17,
        flag: "🇸🇪",
        nativeName: "Svenska",
        englishName: "Swedish",
        storeMatch: includesToken("swedish"),
        badgeLabels: { official: "Officiell", none: "Saknas" },
    },
    {
        code: "da",
        steamBit: 13,
        flag: "🇩🇰",
        nativeName: "Dansk",
        englishName: "Danish",
        storeMatch: includesToken("danish"),
        badgeLabels: { official: "Officiel", none: "Ingen" },
    },
    {
        code: "fi",
        steamBit: 15,
        flag: "🇫🇮",
        nativeName: "Suomi",
        englishName: "Finnish",
        storeMatch: includesToken("finnish"),
        badgeLabels: { official: "Virallinen", none: "Ei ole" },
    },
    {
        code: "no",
        steamBit: 16,
        flag: "🇳🇴",
        nativeName: "Norsk",
        englishName: "Norwegian",
        storeMatch: includesToken("norwegian"),
        badgeLabels: { official: "Offisiell", none: "Ingen" },
    },
    {
        code: "hu",
        steamBit: 18,
        flag: "🇭🇺",
        nativeName: "Magyar",
        englishName: "Hungarian",
        communityLinks: [
            { label: "Magyarítások Portál", url: "https://magyaritasok.hu/", kind: "portal" },
        ],
        storeMatch: includesToken("hungarian"),
        badgeLabels: { official: "Hivatalos", none: "Nincs" },
    },
    {
        code: "ro",
        steamBit: 20,
        flag: "🇷🇴",
        nativeName: "Română",
        englishName: "Romanian",
        storeMatch: includesToken("romanian"),
        badgeLabels: { official: "Oficială", none: "Lipsă" },
    },
    {
        code: "bg",
        steamBit: 23,
        flag: "🇧🇬",
        nativeName: "Български",
        englishName: "Bulgarian",
        storeMatch: includesToken("bulgarian"),
        badgeLabels: { official: "Официална", none: "Липсва" },
    },
    {
        code: "el",
        steamBit: 24,
        flag: "🇬🇷",
        nativeName: "Ελληνικά",
        englishName: "Greek",
        storeMatch: includesToken("greek"),
        badgeLabels: { official: "Επίσημη", none: "Καμία" },
    },
    {
        code: "ar",
        steamBit: 25,
        flag: "🇸🇦",
        nativeName: "العربية",
        englishName: "Arabic",
        storeMatch: includesToken("arabic"),
        badgeLabels: { official: "رسمي", none: "لا يوجد" },
    },
    {
        code: "th",
        steamBit: 9,
        flag: "🇹🇭",
        nativeName: "ไทย",
        englishName: "Thai",
        storeMatch: includesToken("thai"),
        badgeLabels: { official: "ทางการ", none: "ไม่มี" },
    },
    {
        code: "vi",
        steamBit: 28,
        flag: "🇻🇳",
        nativeName: "Tiếng Việt",
        englishName: "Vietnamese",
        storeMatch: includesToken("vietnamese"),
        badgeLabels: { official: "Chính thức", none: "Không" },
    },
    {
        code: "id",
        steamBit: 30,
        flag: "🇮🇩",
        nativeName: "Bahasa Indonesia",
        englishName: "Indonesian",
        storeMatch: includesToken("indonesian"),
        badgeLabels: { official: "Resmi", none: "Tidak ada" },
    },
    {
        code: "en",
        steamBit: 0,
        flag: "🇬🇧",
        nativeName: "English",
        englishName: "English",
        storeMatch: includesToken("english"),
        badgeLabels: { official: "Official", none: "None" },
    },
];

const LANGUAGE_MAP: Record<string, LanguageConfig> = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((l) => [l.code, l])
);

const LATAM_REGIONS = new Set([
    "419", "mx", "ar", "co", "cl", "pe", "ve", "ec", "gt", "cu", "bo", "do",
    "hn", "py", "sv", "ni", "cr", "pa", "uy", "pr",
]);

export function getLanguageByCode(code: string | undefined): LanguageConfig | null {
    if (!code) return null;
    return LANGUAGE_MAP[code] ?? null;
}

/**
 * Maps Steam Deck UI locale (navigator.language) to a target localization language.
 * Defaults to Ukrainian ("uk") when UI language is English or unsupported.
 */
export function detectLanguageFromLocale(rawLocale?: string): LanguageConfig {
    const locale = (
        rawLocale ??
        (typeof navigator !== "undefined" ? navigator.language : "") ??
        ""
    )
        .trim()
        .replace(/_/g, "-")
        .toLowerCase();

    if (!locale) return LANGUAGE_MAP["uk"];

    // Specific regional variants first
    if (locale === "pt-br") return LANGUAGE_MAP["pt-BR"];
    if (locale.startsWith("zh-tw") || locale.startsWith("zh-hk") || locale.startsWith("zh-mo") || locale.includes("hant")) {
        return LANGUAGE_MAP["zh-TW"];
    }
    if (locale.startsWith("zh")) {
        return LANGUAGE_MAP["zh-CN"];
    }
    if (locale.startsWith("es-")) {
        const region = locale.split("-")[1] || "";
        if (LATAM_REGIONS.has(region)) return LANGUAGE_MAP["es-419"];
        return LANGUAGE_MAP["es"];
    }
    if (locale === "nb" || locale.startsWith("nb-") || locale === "nn" || locale.startsWith("nn-")) {
        return LANGUAGE_MAP["no"];
    }

    const base = locale.split("-")[0];
    // For English or Russian/unsupported UI locales, default to Ukrainian in auto mode
    if (base === "en" || base === "ru") {
        return LANGUAGE_MAP["uk"];
    }

    return LANGUAGE_MAP[base] ?? LANGUAGE_MAP["uk"];
}

export function resolveTargetLanguage(
    setting: TargetLanguageSetting | string | undefined,
    rawLocale?: string
): LanguageConfig {
    if (setting && setting !== "auto") {
        const explicit = getLanguageByCode(setting);
        if (explicit) return explicit;
    }
    return detectLanguageFromLocale(rawLocale);
}

export function isOfficialLanguageInStoreText(
    supportedLanguages: string | undefined | null,
    lang: LanguageConfig
): boolean {
    if (!supportedLanguages) return false;
    return lang.storeMatch(supportedLanguages.toLowerCase());
}

export function hasOfficialLanguageInAppStore(appId: string, lang: LanguageConfig): boolean {
    try {
        const store = (window as any)?.appStore;
        if (!store) return false;
        const numId = Number(appId);
        if (!Number.isFinite(numId) || numId <= 0) return false;

        const overview =
            store.GetAppOverviewByAppID?.(numId) ??
            store.GetAppOverviewByGameID?.(numId) ??
            store.m_mapApps?.get?.(numId);

        const bf = overview?.bitfield_supported_languages;
        if (bf === undefined || bf === null || bf === "") return false;

        if (typeof BigInt === "function") {
            const mask = BigInt(1) << BigInt(lang.steamBit);
            return (BigInt(bf) & mask) !== BigInt(0);
        }
        const divisor = Math.pow(2, lang.steamBit);
        return Math.floor(Number(bf) / divisor) % 2 === 1;
    } catch {
        return false;
    }
}
