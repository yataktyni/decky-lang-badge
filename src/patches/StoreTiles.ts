interface TileConfig {
    flag: string;
    languages: string[];
    position: string;
    catalog: Record<string, { installed: boolean; has_update: boolean }>;
    cached: Record<string, "OFFICIAL" | "COMMUNITY" | "NONE">;
    labels: { official: string; community: string; installed: string };
}

// This function is serialized into the Steam Store's separate browser context.
export function installStoreTiles(config: TileConfig): void {
    const page = window as any;
    page.__localizationTilesCleanup?.();
    const badgeClass = "decky-localization-tile-badge";
    const attached = new Map<HTMLElement, string>();
    const results = new Map<string, boolean>();
    const pending = new Set<string>();
    const queue: string[] = [];
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scanTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let running = false;

    const apply = (tile: HTMLElement, appId: string) => {
        if (!tile.isConnected || attached.get(tile) !== appId) return;
        const entry = config.catalog[appId];
        const official = results.get(appId) ?? (config.cached[appId] === "OFFICIAL");
        const text = entry?.installed ? `${config.flag} ${entry.has_update ? "⬆" : "✓"}`
            : official ? config.flag : entry ? `${config.flag} LBK` : config.cached[appId] === "COMMUNITY" ? config.flag : "";
        tile.querySelector(`.${badgeClass}`)?.remove();
        if (!text) return;
        const badge = document.createElement("span");
        badge.className = badgeClass;
        badge.textContent = text;
        badge.setAttribute("aria-label", entry?.installed ? config.labels.installed : official ? config.labels.official : config.labels.community);
        badge.title = badge.getAttribute("aria-label") || "";
        const [vertical, horizontal] = config.position.split("-");
        badge.style.cssText = `position:absolute;${vertical === "bottom" ? "bottom" : "top"}:6px;${horizontal === "right" ? "right" : "left"}:6px;z-index:10;pointer-events:none;border-radius:6px;padding:2px 6px;font-size:11px;font-weight:bold;background:${entry?.installed ? "#10b981" : official ? "#28a745" : "#ffc107"};color:${!official && !entry?.installed ? "#000" : "#fff"}`;
        tile.appendChild(badge);
    };

    const processQueue = async () => {
        timer = undefined;
        if (disposed || running || !queue.length) return;
        running = true;
        const appId = queue.shift()!;
        controller = new AbortController();
        const requestTimer = setTimeout(() => controller?.abort(), 10000);
        try {
            const response = await fetch(`/api/appdetails?appids=${appId}&l=en&filters=basic`, { signal: controller.signal });
            if (disposed) return;
            if (response.status === 429) {
                queue.unshift(appId);
                running = false;
                timer = setTimeout(processQueue, 60000);
                return;
            }
            if (response.ok) {
                const data = await response.json();
                if (data[appId]?.success && typeof data[appId].data?.supported_languages === "string") {
                    const languages = data[appId].data.supported_languages.toLowerCase()
                        .replace(/<br\s*\/?\s*>/g, ",")
                        .replace(/<[^>]*>/g, "")
                        .split(",").map((value: string) => value.replace(/\*/g, "").trim());
                    results.set(appId, config.languages.some((language) => languages.includes(language)));
                }
            }
        } catch {
            // A failed request leaves the community badge intact and can be retried on a later visit.
        } finally {
            clearTimeout(requestTimer);
            controller = undefined;
        }
        running = false;
        pending.delete(appId);
        if (disposed) return;
        attached.forEach((id, tile) => { if (id === appId) apply(tile, id); });
        timer = setTimeout(processQueue, 1600);
    };

    const visible = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const tile = entry.target as HTMLElement;
            const appId = attached.get(tile);
            if (!appId) continue;
            apply(tile, appId);
            if (!results.has(appId) && !pending.has(appId) && !config.catalog[appId]?.installed && !config.cached[appId]) {
                pending.add(appId);
                queue.push(appId);
                if (!timer && !running) void processQueue();
            }
        }
    });

    const restore = (tile: HTMLElement) => {
        tile.querySelector(`.${badgeClass}`)?.remove();
        if (tile.dataset.localizationOriginalPosition !== undefined) {
            tile.style.position = tile.dataset.localizationOriginalPosition;
            delete tile.dataset.localizationOriginalPosition;
        }
    };
    const scan = () => {
        if (disposed) return;
        for (const [tile, id] of attached) {
            const match = tile.getAttribute("href")?.match(/\/app\/(\d+)(?:\/|\?|$)/);
            if (!tile.isConnected || match?.[1] !== id) {
                visible.unobserve(tile);
                attached.delete(tile);
                restore(tile);
            }
        }
        document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]').forEach((tile) => {
            if (attached.has(tile) || !tile.querySelector("img, [data-background-image2x-url]")) return;
            let url: URL;
            try { url = new URL(tile.href, location.href); } catch { return; }
            const appId = url.hostname === "store.steampowered.com" ? url.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1] : undefined;
            if (!appId) return;
            const rect = tile.getBoundingClientRect();
            if ((rect.width > 0 && rect.width < 90) || (rect.height > 0 && rect.height < 35)) return;
            if (getComputedStyle(tile).position === "static") {
                tile.dataset.localizationOriginalPosition = tile.style.position;
                tile.style.position = "relative";
            }
            attached.set(tile, appId);
            visible.observe(tile);
        });
    };
    const observer = new MutationObserver((mutations) => {
        if (mutations.some((mutation) => mutation.type === "attributes" || Array.from(mutation.addedNodes).some((node) =>
            node.nodeType === 1 && !(node as Element).classList.contains(badgeClass)))) {
            if (scanTimer) clearTimeout(scanTimer);
            scanTimer = setTimeout(scan, 120);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    scan();
    page.__localizationTilesCleanup = () => {
        disposed = true;
        controller?.abort();
        if (timer) clearTimeout(timer);
        if (scanTimer) clearTimeout(scanTimer);
        observer.disconnect();
        visible.disconnect();
        attached.forEach((_id, tile) => restore(tile));
        delete page.__localizationTilesCleanup;
    };
}
