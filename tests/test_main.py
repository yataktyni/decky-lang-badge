import io
import json
import os
import sys
import types
import zipfile
from pathlib import Path

sys.path.insert(0, os.getcwd())

import pytest


# ---- Stub decky before importing main ----
class _DummyLogger:
    def info(self, *args, **kwargs):
        pass

    def error(self, *args, **kwargs):
        pass

    def warn(self, *args, **kwargs):
        pass


decky_stub = types.SimpleNamespace(
    logger=_DummyLogger(),
    DECKY_PLUGIN_SETTINGS_DIR="/tmp"
)
sys.modules["decky"] = decky_stub

import main  # noqa: E402


@pytest.mark.asyncio
async def test_get_current_version_reads_plugin_json(tmp_path, monkeypatch):
    plugin_json = tmp_path / "plugin.json"
    plugin_json.write_text(json.dumps({"version": "1.6.5"}), encoding="utf-8")

    monkeypatch.setattr(main.os.path, "abspath", lambda _: str(tmp_path / "main.py"))

    plugin = main.Plugin()
    version = await plugin.get_current_version()
    assert version == "1.6.5"


@pytest.mark.asyncio
async def test_get_latest_version_update_available(monkeypatch):
    plugin = main.Plugin()

    async def fake_current():
        return "1.0.0"

    async def fake_http_get(url, headers=None):
        return json.dumps([
            {"tag_name": "v0.9.0", "draft": False, "prerelease": False},
            {"tag_name": "v1.2.0", "draft": False, "prerelease": False},
            {"tag_name": "v1.1.5", "draft": False, "prerelease": False},
        ])

    monkeypatch.setattr(plugin, "get_current_version", fake_current)
    monkeypatch.setattr(main, "http_get", fake_http_get)

    info = await plugin.get_latest_version()
    assert info["current"] == "1.0.0"
    assert info["latest"] == "1.2.0"
    assert info["latest_tag"] == "v1.2.0"
    assert info["update_available"] is True


@pytest.mark.asyncio
async def test_get_latest_version_handles_suffixed_tags(monkeypatch):
    plugin = main.Plugin()

    async def fake_current():
        return "1.6.4"

    async def fake_http_get(url, headers=None):
        return json.dumps([
            {"tag_name": "v1.6.5-node24fix", "draft": False, "prerelease": False},
            {"tag_name": "v1.6.4", "draft": False, "prerelease": False},
        ])

    monkeypatch.setattr(plugin, "get_current_version", fake_current)
    monkeypatch.setattr(main, "http_get", fake_http_get)

    info = await plugin.get_latest_version()
    assert info["current"] == "1.6.4"
    assert info["latest"] == "1.6.5"
    assert info["latest_tag"] == "v1.6.5-node24fix"
    assert info["update_available"] is True


@pytest.mark.asyncio
async def test_get_latest_version_http_failure(monkeypatch):
    plugin = main.Plugin()

    async def fake_current():
        return "1.0.0"

    async def fake_http_get(url, headers=None):
        return None

    monkeypatch.setattr(plugin, "get_current_version", fake_current)
    monkeypatch.setattr(main, "http_get", fake_http_get)

    info = await plugin.get_latest_version()
    assert info["current"] == "1.0.0"
    assert info["latest"] is None
    assert info["update_available"] is False


@pytest.mark.asyncio
async def test_get_latest_version_ignores_draft_and_prerelease(monkeypatch):
    plugin = main.Plugin()

    async def fake_current():
        return "1.0.0"

    async def fake_http_get(url, headers=None):
        return json.dumps([
            {"tag_name": "v9.9.9", "draft": True, "prerelease": False},
            {"tag_name": "v8.8.8", "draft": False, "prerelease": True},
            {"tag_name": "v1.2.3", "draft": False, "prerelease": False},
        ])

    monkeypatch.setattr(plugin, "get_current_version", fake_current)
    monkeypatch.setattr(main, "http_get", fake_http_get)

    info = await plugin.get_latest_version()
    assert info["latest"] == "1.2.3"
    assert info["latest_tag"] == "v1.2.3"
    assert info["update_available"] is True


@pytest.mark.asyncio
async def test_update_plugin_already_current(monkeypatch):
    plugin = main.Plugin()

    async def fake_latest():
        return {"update_available": False, "current": "1.0.0", "latest": "1.0.0"}

    monkeypatch.setattr(plugin, "get_latest_version", fake_latest)

    result = await plugin.update_plugin()
    assert result["success"] is True
    assert result.get("already_current") is True


def _make_release_zip(with_root=True):
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as z:
        files = {
            "plugin.json": json.dumps({"version": "9.9.9"}),
            "main.py": "# updated backend\n",
            "dist/index.js": "// updated frontend\n",
        }
        for rel, content in files.items():
            name = f"decky-lang-badge/{rel}" if with_root else rel
            z.writestr(name, content)
    return bio.getvalue()


@pytest.mark.asyncio
@pytest.mark.parametrize("with_root", [True, False])
async def test_update_plugin_extracts_release_zip(tmp_path, monkeypatch, with_root):
    plugin = main.Plugin()

    async def fake_latest():
        return {"update_available": True, "current": "1.0.0", "latest": "9.9.9"}

    async def fake_binary(url, headers=None):
        return _make_release_zip(with_root=with_root)

    monkeypatch.setattr(plugin, "get_latest_version", fake_latest)
    monkeypatch.setattr(main, "http_get_binary", fake_binary)
    monkeypatch.setattr(main.os.path, "abspath", lambda _: str(tmp_path / "main.py"))

    # seed existing files to ensure overwrite
    (tmp_path / "plugin.json").write_text(json.dumps({"version": "1.0.0"}), encoding="utf-8")
    (tmp_path / "main.py").write_text("# old backend\n", encoding="utf-8")
    (tmp_path / "dist").mkdir(parents=True, exist_ok=True)
    (tmp_path / "dist" / "index.js").write_text("// old frontend\n", encoding="utf-8")

    result = await plugin.update_plugin()
    assert result["success"] is True
    assert result.get("needs_restart") is True

    new_ver = json.loads((tmp_path / "plugin.json").read_text(encoding="utf-8"))["version"]
    assert new_ver == "9.9.9"
    assert (tmp_path / "main.py").read_text(encoding="utf-8") == "# updated backend\n"
    assert (tmp_path / "dist" / "index.js").read_text(encoding="utf-8") == "// updated frontend\n"


@pytest.mark.asyncio
async def test_update_plugin_invalid_zip(tmp_path, monkeypatch):
    plugin = main.Plugin()

    async def fake_latest():
        return {"update_available": True, "current": "1.0.0", "latest": "9.9.9"}

    async def fake_binary(url, headers=None):
        return b"not-a-valid-zip"

    monkeypatch.setattr(plugin, "get_latest_version", fake_latest)
    monkeypatch.setattr(main, "http_get_binary", fake_binary)
    monkeypatch.setattr(main.os.path, "abspath", lambda _: str(tmp_path / "main.py"))

    result = await plugin.update_plugin()
    assert result["success"] is False
    assert result["error"] == "Invalid zip file"


def test_settings_load_save_merge_defaults(tmp_path, monkeypatch):
    decky_stub.DECKY_PLUGIN_SETTINGS_DIR = str(tmp_path)

    plugin = main.Plugin()
    plugin.settings_file = str(tmp_path / "settings.json")

    # Write partial settings and ensure defaults merge
    partial = {"badgeType": "icon-only", "offsetX": 42}
    Path(plugin.settings_file).write_text(json.dumps(partial), encoding="utf-8")

    loaded = plugin._load_settings()
    assert loaded["badgeType"] == "icon-only"
    assert loaded["offsetX"] == 42
    # default still present
    assert loaded["offsetY"] == main.DEFAULT_SETTINGS["offsetY"]

    # Save flow
    plugin.settings["offsetY"] = 123
    assert plugin._save_settings() is True

    reloaded = json.loads(Path(plugin.settings_file).read_text(encoding="utf-8"))
    assert reloaded["offsetY"] == 123


def _create_mock_lbk_db(db_path: Path):
    import sqlite3

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE games (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            version TEXT,
            status TEXT NOT NULL,
            approved INTEGER NOT NULL DEFAULT 0,
            hide INTEGER NOT NULL DEFAULT 0,
            user_unlocked INTEGER NOT NULL DEFAULT 0,
            translation_progress INTEGER NOT NULL DEFAULT 0,
            voice_progress INTEGER,
            voice_archive_path TEXT,
            achievements_archive_path TEXT,
            ai TEXT,
            downloads INTEGER DEFAULT 0,
            steam_app_id INTEGER
        )
        """
    )
    conn.executemany(
        """
        INSERT INTO games (
            id, slug, name, team, version, status, approved, hide, user_unlocked,
            translation_progress, voice_progress, voice_archive_path,
            achievements_archive_path, ai, downloads, steam_app_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            ("g1", "hollow-knight", "Hollow Knight", "Команда А", "1.5", "released", 1, 0, 0, 100, 50, "v.zip", "a.zip", None, 500, 367520),
            ("g2", "hollow-knight", "Hollow Knight", "Team B", "0.9", "in_progress", 1, 0, 0, 60, None, None, None, "edited", 100, 367520),
            ("g3", "hollow-knight", "Hollow Knight", "Hidden Team", "1.0", "released", 1, 1, 0, 100, None, None, None, None, 999, 367520),
            ("g4", "hollow-knight", "Hollow Knight", "Unapproved", "1.0", "released", 0, 0, 0, 100, None, None, None, None, 999, 367520),
        ],
    )
    conn.commit()
    conn.close()


@pytest.mark.asyncio
async def test_get_lbk_status_and_translations(tmp_path, monkeypatch):
    fake_home = tmp_path / "deck"
    db_path = fake_home / ".var" / "app" / "com.lbk.launcher" / "config" / "lbk-launcher" / "lbk.db"
    _create_mock_lbk_db(db_path)

    cache_dir = db_path.parent / "installation-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "g1.json").write_text(json.dumps({"gameId": "g1", "version": "1.5"}), encoding="utf-8")

    monkeypatch.setattr(main, "_get_decky_user_home", lambda: str(fake_home))

    plugin = main.Plugin()
    status = await plugin.get_lbk_status()
    assert status["installed"] is True
    assert status["db_found"] is True
    assert status["db_path"] == str(db_path)

    result = await plugin.get_lbk_translations("367520")
    assert result["available"] is True
    assert result["installed_any"] is True
    assert len(result["translations"]) == 2
    assert result["translations"][0]["id"] == "g1"
    assert result["translations"][0]["installed"] is True
    assert result["translations"][0]["has_voice"] is True
    assert result["translations"][0]["has_achievements"] is True
    assert result["translations"][0]["deep_link"].startswith("lbk://games/hollow-knight/")
    assert result["translations"][1]["id"] == "g2"
    assert result["translations"][1]["installed"] is False


@pytest.mark.asyncio
async def test_open_in_lbk_launches_detached(tmp_path, monkeypatch):
    launched = {}

    def fake_popen(cmd, **kwargs):
        launched["cmd"] = cmd
        launched["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(main, "_get_decky_user_home", lambda: str(tmp_path))
    monkeypatch.setattr(main, "_get_decky_user", lambda: "deck")
    monkeypatch.setattr(main, "_find_lbk_launcher", lambda _: ("flatpak", "com.lbk.launcher"))
    monkeypatch.setattr(main.subprocess, "Popen", fake_popen)

    plugin = main.Plugin()
    res = await plugin.open_in_lbk("hollow-knight", "Команда А")
    assert res["success"] is True
    assert res["method"] == "flatpak"
    assert launched["cmd"][0:3] == ["flatpak", "run", "com.lbk.launcher"]
    assert launched["cmd"][3] == "lbk://games/hollow-knight/%D0%9A%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0%20%D0%90"
    assert launched["kwargs"]["start_new_session"] is True

    spec = await plugin.get_lbk_launch_spec("hollow-knight", "Команда А")
    assert spec["success"] is True
    assert spec["method"] == "flatpak"
    assert "com.lbk.launcher" in spec["args"]
    assert "lbk://games/hollow-knight/%D0%9A%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0%20%D0%90" in spec["args"]


@pytest.mark.asyncio
async def test_get_lbk_catalog_map_and_update_flag(tmp_path, monkeypatch):
    fake_home = tmp_path / "deck"
    db_path = fake_home / ".var" / "app" / "com.lbk.launcher" / "config" / "lbk-launcher" / "lbk.db"
    _create_mock_lbk_db(db_path)

    cache_dir = db_path.parent / "installation-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    # Installed older version 1.4 while DB has 1.5 -> has_update=True
    (cache_dir / "g1.json").write_text(json.dumps({"gameId": "g1", "version": "1.4"}), encoding="utf-8")

    monkeypatch.setattr(main, "_get_decky_user_home", lambda: str(fake_home))

    plugin = main.Plugin()
    catalog = await plugin.get_lbk_catalog_map()
    assert catalog["available"] is True
    assert "367520" in catalog["games"]
    assert catalog["games"]["367520"]["installed"] is True
    assert catalog["games"]["367520"]["has_update"] is True
    assert catalog["games"]["367520"]["count"] == 2


@pytest.mark.asyncio
async def test_install_lbk_launcher_runs_flatpak_install(tmp_path, monkeypatch):
    captured = {}

    class FakeProc:
        returncode = 0
        stdout = "Installed com.lbk.launcher"
        stderr = ""

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return FakeProc()

    monkeypatch.setattr(main.shutil, "which", lambda name: "/usr/bin/flatpak" if name == "flatpak" else None)
    monkeypatch.setattr(main, "_get_decky_user_home", lambda: str(tmp_path))
    monkeypatch.setattr(main, "_get_decky_user", lambda: "deck")
    monkeypatch.setattr(main.subprocess, "run", fake_run)

    plugin = main.Plugin()
    res = await plugin.install_lbk_launcher()
    assert res["success"] is True
    assert captured["cmd"][0:2] == ["/usr/bin/flatpak", "install"]
    assert main.LBK_FLATPAKREF_URL in captured["cmd"]
