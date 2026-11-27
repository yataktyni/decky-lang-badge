// decky-lang-badge/src/hooks/useParams.ts
import { ReactRouter, useParams as deckyUseParams } from "@decky/ui";

const fallbackUseParams = (() => {
    if (!ReactRouter || typeof ReactRouter !== "object") {
        return undefined;
    }
    return Object.values(ReactRouter).find((val) =>
        /return (\w*)\?\1\.params:{}/.test(`${val}`)
    ) as (<T>() => T) | undefined;
})();

/**
 * Hook to get route parameters from React Router.
 * Prefers @decky/ui's native useParams (Steam ESModule compatible) with safe fallback.
 */
export function useParams<T = Record<string, string>>(): T {
    const hook = typeof deckyUseParams === "function" ? deckyUseParams : fallbackUseParams;
    if (typeof hook === "function") {
        return (hook<T>() ?? ({} as T));
    }
    return {} as T;
}
