import fs from "node:fs";
import deckyPlugin from "@decky/rollup";

const isAdminBuild =
  process.env.ADMIN_BUILD === "1" || process.env.ADMIN_BUILD === "true";

let pluginVersion = "0.0.0";
try {
  const manifest = JSON.parse(fs.readFileSync(new URL("./plugin.json", import.meta.url), "utf8"));
  if (manifest?.version) pluginVersion = String(manifest.version);
} catch {
  // ignore
}

export default deckyPlugin({
  plugins: [
    {
      name: "build-constants",
      transform(code) {
        let out = code;
        let changed = false;
        if (out.includes("__ADMIN_BUILD__")) {
          out = out.replace(/\b__ADMIN_BUILD__\b/g, JSON.stringify(isAdminBuild));
          changed = true;
        }
        if (out.includes("__PLUGIN_VERSION__")) {
          out = out.replace(/\b__PLUGIN_VERSION__\b/g, JSON.stringify(pluginVersion));
          changed = true;
        }
        return changed ? { code: out, map: null } : null;
      },
    },
  ],
});
