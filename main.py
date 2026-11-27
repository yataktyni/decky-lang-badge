# decky-lang-badge/main.py

import asyncio
import glob
import json
import os
import pwd
import shutil
import sqlite3
import ssl
import subprocess
import urllib.parse
import urllib.request
import urllib.error
import re
import time
from typing import Dict, Any, List, Optional, Tuple, TypedDict

import decky


# ============================================
# Types & Constants
# ============================================

class Settings(TypedDict):
    targetLanguage: str
    badgeType: str
    badgePosition: str
    offsetX: int
    offsetY: int
    showOnStore: bool
    storeOffsetX: int
    storeOffsetY: int
    enableLbkIntegration: bool
    showOnThumbnails: bool
    thumbnailPosition: str


DEFAULT_SETTINGS: Settings = {
    "targetLanguage": "auto",
    "badgeType": "full",
    "badgePosition": "top-right",
    "offsetX": 20,
    "offsetY": 90,
    "showOnStore": True,
    "storeOffsetX": 0,
    "storeOffsetY": 20,
    "enableLbkIntegration": True,
    "showOnThumbnails": True,
    "thumbnailPosition": "top-left",
}

LBK_FLATPAK_ID = "com.lbk.launcher"
LBK_FLATPAKREF_URL = "https://flatpak.lbklauncher.com/com.lbk.launcher.flatpakref"
LBK_APPIMAGE_RELEASES_API = "https://api.github.com/repos/Vadko/lbk-launcher/releases/latest"
LBK_APPIMAGE_FALLBACK_URL = "https://github.com/Vadko/lbk-launcher/releases/latest/download/LBK-Launcher-linux.AppImage"

HTTP_TIMEOUT = 10
HTTP_USER_AGENT = "decky-lang-badge/2.1"


# ============================================
# HTTP Helpers
# ============================================

SYSTEM_CA_BUNDLE_CANDIDATES = (
    "/etc/ssl/certs/ca-certificates.crt",
    "/etc/ssl/cert.pem",
    "/etc/pki/tls/certs/ca-bundle.crt",
    "/etc/ca-certificates/extracted/tls-ca-bundle.pem",
)


def _get_ssl_context() -> ssl.SSLContext:
    """Build an SSLContext that locates CA certificates even inside Decky's PyInstaller runtime."""
    env_ca = os.environ.get("SSL_CERT_FILE", "").strip()
    if env_ca and os.path.isfile(env_ca):
        return ssl.create_default_context(cafile=env_ca)

    try:
        import certifi  # type: ignore

        certifi_ca = certifi.where()
        if certifi_ca and os.path.isfile(certifi_ca):
            return ssl.create_default_context(cafile=certifi_ca)
    except Exception:
        pass

    for candidate in SYSTEM_CA_BUNDLE_CANDIDATES:
        if os.path.isfile(candidate):
            return ssl.create_default_context(cafile=candidate)

    return ssl.create_default_context()


def _sync_http_get(url: str, headers: Dict[str, str] | None = None) -> str:
    """Synchronous HTTP GET - to be called via asyncio.to_thread()."""
    headers = headers or {}
    if "User-Agent" not in headers:
        headers["User-Agent"] = HTTP_USER_AGENT
    req = urllib.request.Request(url)
    for key, value in headers.items():
        req.add_header(key, value)

    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT, context=_get_ssl_context()) as response:
        return response.read().decode("utf-8")


async def http_get(url: str, headers: Dict[str, str] | None = None) -> str | None:
    """Non-blocking HTTP GET using thread pool."""
    try:
        return await asyncio.to_thread(_sync_http_get, url, headers)
    except Exception as e:
        decky.logger.error(f"HTTP error for {url}: {e}")
        return None


def _sync_http_get_binary(url: str, headers: Dict[str, str] | None = None) -> bytes:
    """Synchronous HTTP GET returning raw bytes."""
    headers = headers or {}
    if "User-Agent" not in headers:
        headers["User-Agent"] = HTTP_USER_AGENT
    req = urllib.request.Request(url)
    for key, value in headers.items():
        req.add_header(key, value)

    with urllib.request.urlopen(req, timeout=30, context=_get_ssl_context()) as response:
        return response.read()


async def http_get_binary(url: str, headers: Dict[str, str] | None = None) -> bytes | None:
    """Non-blocking HTTP GET for binary data."""
    try:
        return await asyncio.to_thread(_sync_http_get_binary, url, headers)
    except Exception as e:
        decky.logger.error(f"Binary download error for {url}: {e}")
        return None


def _sync_resolve_latest_release_tag_via_redirect(url: str) -> str | None:
    """Resolve latest stable GitHub release tag via web redirect (not subject to 60/hr API rate limit)."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": HTTP_USER_AGENT})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT, context=_get_ssl_context()) as response:
        final_url = response.geturl() or ""
    match = re.search(r"/releases/tag/([^/?#]+)$", final_url)
    if not match:
        return None
    return urllib.parse.unquote(match.group(1)).strip()


async def resolve_latest_release_tag_via_redirect(url: str) -> str | None:
    """Non-blocking redirect check for latest stable GitHub release tag."""
    try:
        return await asyncio.to_thread(_sync_resolve_latest_release_tag_via_redirect, url)
    except Exception as e:
        decky.logger.error(f"Redirect tag lookup error for {url}: {e}")
        return None


# ============================================
# Plugin Class (Required by Decky)
# ============================================

class Plugin:
    settings: Settings = DEFAULT_SETTINGS.copy()
    settings_file: str = ""

    # Lifecycle Methods
    async def _main(self):
        """Called when plugin loads."""
        decky.logger.info("decky-lang-badge: _main called")
        self.settings_file = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
        self._load_settings()

    async def _unload(self):
        """Called when plugin unloads."""
        decky.logger.info("decky-lang-badge: _unload called")

    # Settings Management
    def _load_settings(self) -> Settings:
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.settings = {**DEFAULT_SETTINGS, **data}
                    decky.logger.info(f"Settings loaded: {self.settings}")
                    return self.settings
            except Exception as e:
                decky.logger.error(f"Settings load failed: {e}")
        return self.settings

    def _save_settings(self) -> bool:
        try:
            os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump(self.settings, f, indent=2)
            return True
        except Exception as e:
            decky.logger.error(f"Settings save failed: {e}")
            return False

    # Public API Methods (called from frontend)
    async def get_settings(self) -> Settings:
        decky.logger.info("get_settings called")
        return self._load_settings()

    async def set_settings(self, key: str, value: Any) -> bool:
        decky.logger.info(f"set_settings: {key}={value}")
        if key in DEFAULT_SETTINGS:
            self.settings[key] = value  # type: ignore
            return self._save_settings()
        return False

    async def get_current_version(self) -> str:
        """Get current plugin version from plugin.json."""
        try:
            plugin_dir = os.path.dirname(os.path.abspath(__file__))
            plugin_json_path = os.path.join(plugin_dir, "plugin.json")
            decky.logger.info(f"[VERSION] Looking for: {plugin_json_path}")

            if os.path.exists(plugin_json_path):
                with open(plugin_json_path, "r", encoding="utf-8") as f:
                    plugin_data = json.load(f)
                    version = plugin_data.get("version", "0.0.0")
                    decky.logger.info(f"[VERSION] Read: {version}")
                    return version
            else:
                decky.logger.error("[VERSION] plugin.json not found!")
            return "0.0.0"
        except Exception as e:
            decky.logger.error(f"get_current_version failed: {e}")
            return "unknown"

    async def get_latest_version(self) -> Dict[str, Any]:
        """Check GitHub for latest version based on highest valid semver tag in recent releases."""
        return await self._check_latest_version_internal(include_debug=False)

    async def debug_version_check(self) -> Dict[str, Any]:
        """Temporary diagnostics endpoint for Steam Deck runtime troubleshooting."""
        return await self._check_latest_version_internal(include_debug=True)

    async def _check_latest_version_internal(self, include_debug: bool = False) -> Dict[str, Any]:
        def normalize_semver_core(value: str) -> str:
            raw = (value or "").strip().lstrip("v")
            m = re.match(r"^(\d+)\.(\d+)\.(\d+)", raw)
            if not m:
                return "0.0.0"
            return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"

        def parse_version_tuple(value: str) -> tuple[int, int, int]:
            core = normalize_semver_core(value)
            try:
                major, minor, patch = core.split(".")
                return (int(major), int(minor), int(patch))
            except Exception:
                return (0, 0, 0)

        current_version_raw = await self.get_current_version()
        current_version = normalize_semver_core(current_version_raw)
        current_tuple = parse_version_tuple(current_version)
        github_api = "https://api.github.com/repos/yataktyni/decky-lang-badge/releases?per_page=20"

        # Defensive sanitization in case runtime/plugin files accidentally mutate value
        github_api = (github_api or "").strip().split()[0]

        base_result: Dict[str, Any] = {
            "current": current_version_raw,
            "latest": None,
            "latest_tag": None,
            "update_available": False,
            "source_ok": False,
            "error": None,
            "checked_at": int(time.time())
        }

        if include_debug:
            plugin_dir = os.path.dirname(os.path.abspath(__file__))
            base_result["plugin_json_path"] = os.path.join(plugin_dir, "plugin.json")
            base_result["current_raw"] = current_version_raw
            base_result["github_api"] = github_api

        try:
            if not github_api.startswith("https://api.github.com/repos/yataktyni/decky-lang-badge/releases"):
                base_result["error"] = f"Misconfigured GitHub API URL: {github_api}"
                return base_result

            best_tag = ""
            best_version = "0.0.0"
            best_tuple = (0, 0, 0)

            response = await http_get(github_api)
            if response:
                releases = json.loads(response)
                if not isinstance(releases, list):
                    base_result["error"] = "GitHub releases API returned non-list JSON"
                    return base_result

                for release in releases:
                    if not isinstance(release, dict):
                        continue
                    if release.get("draft") is True:
                        continue
                    if release.get("prerelease") is True:
                        continue

                    tag_name = str(release.get("tag_name", "")).strip()
                    version = normalize_semver_core(tag_name)
                    version_tuple = parse_version_tuple(version)
                    if version_tuple > best_tuple:
                        best_tuple = version_tuple
                        best_version = version
                        best_tag = tag_name
            else:
                # Fallback to GitHub web redirect when api.github.com is rate-limited (HTTP 403)
                redirect_tag = await resolve_latest_release_tag_via_redirect(
                    "https://github.com/yataktyni/decky-lang-badge/releases/latest"
                )
                if not redirect_tag:
                    base_result["error"] = "GitHub releases request failed or returned empty response"
                    return base_result
                best_tag = redirect_tag
                best_version = normalize_semver_core(redirect_tag)
                best_tuple = parse_version_tuple(best_version)

            if best_tag == "":
                base_result["source_ok"] = True
                base_result["error"] = "No stable releases found"
                return base_result

            update_available = best_tuple > current_tuple or (best_tuple == current_tuple and "-" in current_version_raw)
            base_result["source_ok"] = True
            base_result["latest"] = best_version
            base_result["latest_tag"] = best_tag
            base_result["update_available"] = update_available

            decky.logger.info(
                f"Version check: current={current_version_raw} ({current_version}), "
                f"selected_tag={best_tag} ({best_version}), update={update_available}"
            )

            if include_debug:
                base_result["selected_tuple"] = list(best_tuple)
                base_result["current_tuple"] = list(current_tuple)

            return base_result

        except Exception as e:
            err = f"Version check failed: {e}"
            decky.logger.error(err)
            base_result["error"] = err
            return base_result

    async def _download_and_extract_latest_release(self) -> Dict[str, Any]:
        """Download and install latest release.zip from GitHub."""
        import zipfile
        import io

        release_url = "https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip"
        plugin_dir = os.path.dirname(os.path.abspath(__file__))

        try:
            decky.logger.info("[UPDATE] Downloading release.zip...")
            zip_data = await http_get_binary(release_url)
            if not zip_data:
                return {"success": False, "error": "Download failed"}

            decky.logger.info(f"[UPDATE] Downloaded {len(zip_data)} bytes")

            def extract_zip(data: bytes, target_dir: str) -> int:
                with zipfile.ZipFile(io.BytesIO(data)) as zf:
                    # check if all files share a common root directory
                    paths = [info.filename for info in zf.infolist() if not info.is_dir()]
                    if not paths:
                        return 0

                    first_parts = [p.split('/')[0] for p in paths if '/' in p]
                    has_root_dir = (
                        len(set(first_parts)) == 1
                        and first_parts[0] not in ("", ".", "..")
                        and all('/' in p for p in paths)
                    )

                    # First pass: validate all entries before writing anything (prevents partial writes)
                    validated_entries: List[Tuple[zipfile.ZipInfo, str]] = []
                    base_norm = os.path.normpath(target_dir)
                    for info in zf.infolist():
                        if info.is_dir():
                            continue

                        raw_norm = os.path.normpath(info.filename.replace("\\", "/"))
                        if (
                            os.path.isabs(raw_norm)
                            or raw_norm == ".."
                            or raw_norm.startswith(".." + os.sep)
                        ):
                            raise ValueError(f"Unsafe zip entry path: {info.filename}")

                        target_name = info.filename
                        if has_root_dir:
                            # Strip the root directory safely
                            parts = target_name.split("/", 1)
                            target_name = parts[1] if len(parts) > 1 else parts[0]

                        if not target_name:
                            continue

                        # Guard against Zip Slip (path traversal outside target_dir)
                        norm_rel = os.path.normpath(target_name.replace("\\", "/"))
                        if (
                            os.path.isabs(norm_rel)
                            or norm_rel == ".."
                            or norm_rel.startswith(".." + os.sep)
                        ):
                            raise ValueError(f"Unsafe zip entry path: {info.filename}")

                        target_path = os.path.normpath(os.path.join(base_norm, norm_rel))
                        if os.path.commonpath([base_norm, target_path]) != base_norm:
                            raise ValueError(f"Unsafe zip entry path: {info.filename}")

                        validated_entries.append((info, target_path))

                    # Second pass: extract validated entries
                    count = 0
                    for info, target_path in validated_entries:
                        os.makedirs(os.path.dirname(target_path), exist_ok=True)
                        with zf.open(info) as src, open(target_path, 'wb') as dst:
                            dst.write(src.read())
                        count += 1
                    return count

            decky.logger.info("[UPDATE] Extracting...")
            file_count = await asyncio.to_thread(extract_zip, zip_data, plugin_dir)
            installed_version = await self.get_current_version()

            decky.logger.info(f"[UPDATE] Complete! Extracted {file_count} files (version={installed_version})")
            return {
                "success": True,
                "message": "Update complete. Restart Decky.",
                "needs_restart": True,
                "version": installed_version,
            }

        except zipfile.BadZipFile:
            return {"success": False, "error": "Invalid zip file"}
        except Exception as e:
            decky.logger.error(f"Update failed: {e}")
            return {"success": False, "error": str(e)}

    async def update_plugin(self) -> Dict[str, Any]:
        """Download and install latest release from GitHub (with version check)."""
        # Check if update is needed
        decky.logger.info("[UPDATE] Checking if update is needed...")
        version_info = await self.get_latest_version()

        if not version_info.get("update_available"):
            decky.logger.info("[UPDATE] Already up to date")
            return {"success": True, "message": "Already up to date", "already_current": True}

        return await self._download_and_extract_latest_release()

    async def force_update_plugin(self) -> Dict[str, Any]:
        """Force update by downloading latest release.zip without version check."""
        decky.logger.info("[FORCE_UPDATE] Starting forced update without version check...")
        return await self._download_and_extract_latest_release()

    # ============================================
    # LBK Launcher Integration
    # ============================================

    async def get_lbk_status(self) -> Dict[str, Any]:
        """Detect LBK Launcher installation and local catalog database."""
        return await asyncio.to_thread(_get_lbk_status_sync)

    async def get_lbk_translations(self, app_id: str) -> Dict[str, Any]:
        """Query local LBK Launcher SQLite DB for translations matching Steam AppID."""
        return await asyncio.to_thread(_get_lbk_translations_sync, str(app_id or "").strip())

    async def get_lbk_catalog_map(self) -> Dict[str, Any]:
        """Return compact map of all Steam AppIDs in local lbk.db for fast library thumbnail badges."""
        return await asyncio.to_thread(_get_lbk_catalog_map_sync)

    async def install_lbk_launcher(self) -> Dict[str, Any]:
        """Install LBK Launcher automatically via official Flatpak ref."""
        return await asyncio.to_thread(_install_lbk_launcher_sync)

    async def get_lbk_launch_spec(self, slug: str = "", team: str = "") -> Dict[str, Any]:
        """Return executable + launch options for starting LBK Launcher via Steam in Gaming Mode."""
        return await asyncio.to_thread(_get_lbk_launch_spec_sync, str(slug or "").strip(), str(team or "").strip())

    async def open_in_lbk(self, slug: str, team: str) -> Dict[str, Any]:
        """Open a specific translation in LBK Launcher via lbk:// deep link."""
        return await asyncio.to_thread(_open_in_lbk_sync, str(slug or "").strip(), str(team or "").strip())


# ============================================
# LBK Launcher Helpers
# ============================================

def _get_decky_user_home() -> str:
    home = getattr(decky, "DECKY_USER_HOME", "") or os.environ.get("DECKY_USER_HOME", "")
    if home and os.path.isdir(home):
        return home
    return os.path.expanduser("~")


def _get_decky_user() -> str:
    user = getattr(decky, "DECKY_USER", "") or os.environ.get("DECKY_USER", "")
    if user:
        return user
    return os.environ.get("USER", "deck")


def _find_lbk_db(user_home: str) -> Optional[str]:
    candidates = [
        os.path.join(user_home, ".var", "app", LBK_FLATPAK_ID, "config", "lbk-launcher", "lbk.db"),
        os.path.join(user_home, ".var", "app", LBK_FLATPAK_ID, "config", "LBK Launcher", "lbk.db"),
        os.path.join(user_home, ".config", "lbk-launcher", "lbk.db"),
        os.path.join(user_home, ".config", "LBK Launcher", "lbk.db"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


def _find_lbk_launcher(user_home: str) -> Tuple[Optional[str], Optional[str]]:
    """Detect how LBK Launcher can be invoked on this system."""
    # 1. Flatpak installation (system or user)
    flatpak_dirs = [
        os.path.join("/var/lib/flatpak/app", LBK_FLATPAK_ID),
        os.path.join(user_home, ".local", "share", "flatpak", "app", LBK_FLATPAK_ID),
    ]
    if any(os.path.isdir(d) for d in flatpak_dirs) and shutil.which("flatpak"):
        return ("flatpak", LBK_FLATPAK_ID)

    # 2. AppImage in common Steam Deck / Linux locations
    search_dirs = [
        os.path.join(user_home, "Applications"),
        os.path.join(user_home, "Desktop"),
        os.path.join(user_home, "Downloads"),
        os.path.join(user_home, ".local", "bin"),
        user_home,
    ]
    for base_dir in search_dirs:
        if not os.path.isdir(base_dir):
            continue
        for entry in sorted(glob.glob(os.path.join(base_dir, "*")), reverse=True):
            lower_name = os.path.basename(entry).lower()
            if "lbk" in lower_name and lower_name.endswith(".appimage") and os.path.isfile(entry):
                return ("appimage", entry)

    # 3. Native binary
    for bin_candidate in [
        shutil.which("lbk-launcher"),
        os.path.join(user_home, ".local", "bin", "lbk-launcher"),
        "/usr/bin/lbk-launcher",
    ]:
        if bin_candidate and os.path.isfile(bin_candidate):
            return ("binary", bin_candidate)

    # 4. Registered desktop URL handler fallback
    xdg_open = shutil.which("xdg-open")
    if xdg_open:
        return ("xdg-open", xdg_open)

    return (None, None)


def _build_lbk_deep_link(slug: str, team: str) -> str:
    return f"lbk://games/{urllib.parse.quote(slug, safe='')}/{urllib.parse.quote(team, safe='')}"


def _get_lbk_status_sync() -> Dict[str, Any]:
    user_home = _get_decky_user_home()
    db_path = _find_lbk_db(user_home)
    method, launcher_path = _find_lbk_launcher(user_home)
    has_direct_launcher = method in ("flatpak", "appimage", "binary")
    return {
        "installed": bool(db_path or has_direct_launcher),
        "db_found": bool(db_path),
        "db_path": db_path,
        "launch_method": method,
        "launcher_path": launcher_path,
    }


def _read_installed_cache_ids(db_path: str) -> Dict[str, Dict[str, Any]]:
    cache_dir = os.path.join(os.path.dirname(db_path), "installation-cache")
    installed: Dict[str, Dict[str, Any]] = {}
    if not os.path.isdir(cache_dir):
        return installed
    for entry in os.listdir(cache_dir):
        if not entry.endswith(".json"):
            continue
        file_path = os.path.join(cache_dir, entry)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            game_path = data.get("gamePath")
            if isinstance(game_path, str) and game_path.strip() and not os.path.isdir(game_path):
                continue
            game_id = str(data.get("gameId") or entry[:-5])
            installed[game_id] = data
        except Exception:
            continue
    return installed


def _get_lbk_translations_sync(app_id: str) -> Dict[str, Any]:
    if not app_id or not app_id.isdigit():
        return {"available": False, "installed_any": False, "translations": []}

    user_home = _get_decky_user_home()
    db_path = _find_lbk_db(user_home)
    if not db_path:
        return {"available": False, "installed_any": False, "translations": []}

    steam_app_id = int(app_id)
    installed_map = _read_installed_cache_ids(db_path)

    conn: Optional[sqlite3.Connection] = None
    try:
        db_uri = f"file:{urllib.parse.quote(db_path, safe='/')}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True, timeout=3.0)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cols = {row[1] for row in cur.execute("PRAGMA table_info(games)").fetchall()}
        if not cols or "steam_app_id" not in cols:
            return {"available": False, "installed_any": False, "translations": []}

        select_fields = [
            "id",
            "slug" if "slug" in cols else "id AS slug",
            "name" if "name" in cols else "'' AS name",
            "team" if "team" in cols else "'' AS team",
            "version" if "version" in cols else "NULL AS version",
            "status" if "status" in cols else "'' AS status",
            "translation_progress" if "translation_progress" in cols else "0 AS translation_progress",
            "voice_progress" if "voice_progress" in cols else "NULL AS voice_progress",
            "voice_archive_path" if "voice_archive_path" in cols else "NULL AS voice_archive_path",
            "achievements_archive_path" if "achievements_archive_path" in cols else "NULL AS achievements_archive_path",
            "ai" if "ai" in cols else "NULL AS ai",
            "downloads" if "downloads" in cols else "0 AS downloads",
        ]

        where_clauses = ["steam_app_id = ?"]
        if "approved" in cols:
            where_clauses.append("approved = 1")
        if "hide" in cols and "user_unlocked" in cols:
            where_clauses.append("(hide = 0 OR user_unlocked = 1)")
        elif "hide" in cols:
            where_clauses.append("hide = 0")

        sql = (
            f"SELECT {', '.join(select_fields)} FROM games "
            f"WHERE {' AND '.join(where_clauses)} "
            f"ORDER BY COALESCE(translation_progress, 0) DESC, COALESCE(downloads, 0) DESC"
        )
        rows = cur.execute(sql, (steam_app_id,)).fetchall()

        translations: List[Dict[str, Any]] = []
        installed_any = False

        for row in rows:
            game_id = str(row["id"])
            slug = str(row["slug"] or game_id)
            team = str(row["team"] or "")
            install_record = installed_map.get(game_id)
            is_installed = install_record is not None
            if is_installed:
                installed_any = True

            voice_prog = row["voice_progress"]
            has_voice = bool(row["voice_archive_path"]) or (isinstance(voice_prog, int) and voice_prog > 0)
            has_achievements = bool(row["achievements_archive_path"])

            installed_ver = install_record.get("version") if install_record else None
            latest_ver = row["version"]
            has_update = bool(
                is_installed
                and latest_ver
                and installed_ver
                and str(latest_ver).strip() != str(installed_ver).strip()
            )

            translations.append({
                "id": game_id,
                "slug": slug,
                "name": str(row["name"] or ""),
                "team": team,
                "version": latest_ver,
                "status": str(row["status"] or ""),
                "translation_progress": int(row["translation_progress"] or 0),
                "voice_progress": int(voice_prog) if voice_prog is not None else None,
                "has_voice": has_voice,
                "has_achievements": has_achievements,
                "ai": row["ai"],
                "installed": is_installed,
                "installed_version": installed_ver,
                "has_update": has_update,
                "deep_link": _build_lbk_deep_link(slug, team),
            })

        return {
            "available": True,
            "installed_any": installed_any,
            "has_update_any": any(item["has_update"] for item in translations),
            "translations": translations,
        }
    except Exception as e:
        decky.logger.error(f"[LBK] Failed to query lbk.db for app_id={app_id}: {e}")
        return {"available": False, "installed_any": False, "translations": [], "error": str(e)}
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def _build_user_session_env(user: str, user_home: str) -> Tuple[Dict[str, str], Optional[int], Optional[int]]:
    env = os.environ.copy()
    env["HOME"] = user_home
    env["USER"] = user
    env["LOGNAME"] = user

    uid: Optional[int] = None
    gid: Optional[int] = None
    try:
        pw = pwd.getpwnam(user)
        uid = pw.pw_uid
        gid = pw.pw_gid
    except KeyError:
        pass

    if uid is not None:
        runtime_dir = f"/run/user/{uid}"
        if os.path.isdir(runtime_dir):
            env.setdefault("XDG_RUNTIME_DIR", runtime_dir)
            bus_path = os.path.join(runtime_dir, "bus")
            if os.path.exists(bus_path):
                env.setdefault("DBUS_SESSION_BUS_ADDRESS", f"unix:path={bus_path}")
            if "WAYLAND_DISPLAY" not in env:
                for sock in ("gamescope-0", "wayland-0"):
                    if os.path.exists(os.path.join(runtime_dir, sock)):
                        env["WAYLAND_DISPLAY"] = sock
                        break
    env.setdefault("DISPLAY", ":0")
    return env, uid, gid


def _get_lbk_catalog_map_sync() -> Dict[str, Any]:
    user_home = _get_decky_user_home()
    db_path = _find_lbk_db(user_home)
    if not db_path:
        return {"available": False, "games": {}}

    installed_map = _read_installed_cache_ids(db_path)
    conn: Optional[sqlite3.Connection] = None
    try:
        db_uri = f"file:{urllib.parse.quote(db_path, safe='/')}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True, timeout=3.0)
        cur = conn.cursor()

        cols = {row[1] for row in cur.execute("PRAGMA table_info(games)").fetchall()}
        if not cols or "steam_app_id" not in cols:
            return {"available": False, "games": {}}

        where_clauses = ["steam_app_id IS NOT NULL"]
        if "approved" in cols:
            where_clauses.append("approved = 1")
        if "hide" in cols and "user_unlocked" in cols:
            where_clauses.append("(hide = 0 OR user_unlocked = 1)")
        elif "hide" in cols:
            where_clauses.append("hide = 0")

        ver_col = "version" if "version" in cols else "NULL"
        sql = f"SELECT id, steam_app_id, {ver_col} FROM games WHERE {' AND '.join(where_clauses)}"
        rows = cur.execute(sql).fetchall()

        games: Dict[str, Dict[str, Any]] = {}
        for game_id, steam_app_id, latest_ver in rows:
            if steam_app_id is None:
                continue
            key = str(steam_app_id)
            entry = games.get(key)
            if entry is None:
                entry = {"installed": False, "has_update": False, "count": 0}
                games[key] = entry
            entry["count"] += 1

            install_record = installed_map.get(str(game_id))
            if install_record is not None:
                entry["installed"] = True
                installed_ver = install_record.get("version")
                if latest_ver and installed_ver and str(latest_ver).strip() != str(installed_ver).strip():
                    entry["has_update"] = True

        return {"available": True, "games": games}
    except Exception as e:
        decky.logger.error(f"[LBK] Failed to build catalog map: {e}")
        return {"available": False, "games": {}, "error": str(e)}
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def _resolve_lbk_appimage_url() -> Tuple[str, str]:
    """Resolve official Linux AppImage asset URL and filename from Vadko/lbk-launcher releases."""
    try:
        raw = _sync_http_get(LBK_APPIMAGE_RELEASES_API)
        data = json.loads(raw)
        for asset in data.get("assets", []):
            name = str(asset.get("name") or "")
            dl_url = str(asset.get("browser_download_url") or "")
            if (
                name.lower().endswith(".appimage")
                and dl_url.startswith("https://github.com/Vadko/lbk-launcher/releases/")
            ):
                safe_name = os.path.basename(name)
                if "lbk" not in safe_name.lower():
                    safe_name = f"LBK-{safe_name}"
                return dl_url, safe_name
    except Exception as e:
        decky.logger.warn(f"[LBK] Could not query latest AppImage asset, using fallback URL: {e}")
    return LBK_APPIMAGE_FALLBACK_URL, "LBK-Launcher-linux.AppImage"


def _install_lbk_appimage_sync(
    user_home: str,
    uid: Optional[int],
    gid: Optional[int],
) -> Dict[str, Any]:
    """Download official universal Linux AppImage for LBK Launcher into ~/Applications."""
    apps_dir = os.path.join(user_home, "Applications")
    is_root = hasattr(os, "geteuid") and os.geteuid() == 0
    url, filename = _resolve_lbk_appimage_url()
    target_path = os.path.join(apps_dir, filename)
    tmp_path = os.path.join(apps_dir, f".{filename}.tmp")

    try:
        os.makedirs(apps_dir, exist_ok=True)
        if is_root and uid is not None and gid is not None:
            try:
                os.chown(apps_dir, uid, gid)
            except OSError:
                pass

        decky.logger.info(f"[LBK] Downloading universal Linux AppImage from {url} -> {target_path}")
        req = urllib.request.Request(url, headers={"User-Agent": HTTP_USER_AGENT})
        with urllib.request.urlopen(req, timeout=300, context=_get_ssl_context()) as response:
            with open(tmp_path, "wb") as out:
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    out.write(chunk)

        if not os.path.isfile(tmp_path) or os.path.getsize(tmp_path) == 0:
            raise ValueError("Downloaded AppImage is empty")

        os.chmod(tmp_path, 0o755)
        if is_root and uid is not None and gid is not None:
            try:
                os.chown(tmp_path, uid, gid)
            except OSError:
                pass
        os.replace(tmp_path, target_path)

        status = _get_lbk_status_sync()
        decky.logger.info(f"[LBK] AppImage install complete: {target_path}, status={status}")
        return {"success": True, "method": "appimage", "path": target_path, "status": status}
    except Exception as e:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        decky.logger.error(f"[LBK] AppImage install failed: {e}")
        return {"success": False, "error": str(e)}


def _install_lbk_launcher_sync() -> Dict[str, Any]:
    user_home = _get_decky_user_home()
    user = _get_decky_user()
    env, uid, gid = _build_user_session_env(user, user_home)

    flatpak_bin = shutil.which("flatpak")
    flatpak_error: Optional[str] = None

    if flatpak_bin:
        # Reuse SteamOS system runtimes when running as root (Decky plugin_loader), otherwise --user
        is_root = hasattr(os, "geteuid") and os.geteuid() == 0
        scope_flag = "--system" if is_root else "--user"
        cmd = [flatpak_bin, "install", scope_flag, "--noninteractive", "-y", LBK_FLATPAKREF_URL]

        try:
            decky.logger.info(f"[LBK] Installing LBK Launcher via Flatpak: {' '.join(cmd)}")
            run_kwargs: Dict[str, Any] = {
                "capture_output": True,
                "text": True,
                "timeout": 300,
            }
            if not is_root:
                run_kwargs["env"] = env

            proc = subprocess.run(cmd, **run_kwargs)
            if proc.returncode == 0:
                status = _get_lbk_status_sync()
                decky.logger.info(f"[LBK] Flatpak install complete, status={status}")
                return {"success": True, "method": "flatpak", "status": status}

            flatpak_error = (proc.stderr or proc.stdout or f"Exit code {proc.returncode}").strip()[-300:]
            decky.logger.warn(f"[LBK] Flatpak install failed, falling back to Linux AppImage: {flatpak_error}")
        except subprocess.TimeoutExpired:
            flatpak_error = "Flatpak installation timed out"
            decky.logger.warn(f"[LBK] {flatpak_error}, falling back to Linux AppImage")
        except Exception as e:
            flatpak_error = str(e)
            decky.logger.warn(f"[LBK] Flatpak install exception ({e}), falling back to Linux AppImage")
    else:
        decky.logger.info("[LBK] Flatpak not found; installing universal Linux AppImage instead")

    appimage_res = _install_lbk_appimage_sync(user_home, uid, gid)
    if appimage_res.get("success"):
        return appimage_res

    err_parts = [p for p in (flatpak_error, appimage_res.get("error")) if p]
    return {"success": False, "error": " | ".join(err_parts) or "LBK Launcher installation failed"}


def _get_lbk_launch_spec_sync(slug: str = "", team: str = "") -> Dict[str, Any]:
    user_home = _get_decky_user_home()
    has_target = bool(slug and team)
    deep_link = _build_lbk_deep_link(slug, team) if has_target else ""
    method, launcher_path = _find_lbk_launcher(user_home)

    if not method or not launcher_path:
        return {"success": False, "error": "LBK Launcher not found", "deep_link": deep_link}

    if method == "flatpak":
        flatpak_bin = shutil.which("flatpak") or "/usr/bin/flatpak"
        args = f'run {launcher_path} "{deep_link}"' if has_target else f"run {launcher_path}"
        return {
            "success": True,
            "method": "flatpak",
            "bin": flatpak_bin,
            "args": args,
            "workdir": user_home,
            "deep_link": deep_link,
        }

    if method in ("appimage", "binary"):
        return {
            "success": True,
            "method": method,
            "bin": launcher_path,
            "args": f'"{deep_link}"' if has_target else "",
            "workdir": os.path.dirname(launcher_path) or user_home,
            "deep_link": deep_link,
        }

    return {
        "success": False,
        "method": method,
        "error": "No direct LBK executable found",
        "deep_link": deep_link,
    }


def _open_in_lbk_sync(slug: str, team: str) -> Dict[str, Any]:
    if not slug or not team:
        return {"success": False, "error": "Missing slug or team"}

    user_home = _get_decky_user_home()
    user = _get_decky_user()
    deep_link = _build_lbk_deep_link(slug, team)
    method, launcher_path = _find_lbk_launcher(user_home)

    if not method or not launcher_path:
        return {"success": False, "error": "LBK Launcher not found", "deep_link": deep_link}

    if method == "flatpak":
        cmd = ["flatpak", "run", launcher_path, deep_link]
    elif method == "appimage":
        cmd = [launcher_path, deep_link]
    elif method == "binary":
        cmd = [launcher_path, deep_link]
    else:
        cmd = [launcher_path, deep_link]

    try:
        env, uid, gid = _build_user_session_env(user, user_home)
        popen_kwargs: Dict[str, Any] = {
            "env": env,
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "start_new_session": True,
        }
        if hasattr(os, "geteuid") and os.geteuid() == 0 and uid is not None and uid != 0:
            popen_kwargs["user"] = uid
            if gid is not None:
                popen_kwargs["group"] = gid

        decky.logger.info(f"[LBK] Launching via {method}: {cmd}")
        subprocess.Popen(cmd, **popen_kwargs)
        return {"success": True, "method": method, "deep_link": deep_link}
    except Exception as e:
        decky.logger.error(f"[LBK] Failed to launch {cmd}: {e}")
        return {"success": False, "error": str(e), "deep_link": deep_link}
