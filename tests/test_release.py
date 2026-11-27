import json
import shutil
import subprocess
from pathlib import Path

import pytest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


def run(repo, *args, check=True):
    return subprocess.run(args, cwd=repo, text=True, capture_output=True, check=check)


@pytest.fixture
def release_repo(tmp_path):
    repo = tmp_path / "repo"
    remote = tmp_path / "remote.git"
    repo.mkdir()
    run(tmp_path, "git", "init", "--bare", str(remote))
    run(repo, "git", "init", "-b", "main")
    run(repo, "git", "config", "user.name", "Release test")
    run(repo, "git", "config", "user.email", "release@example.invalid")
    run(repo, "git", "config", "commit.gpgsign", "false")
    run(repo, "git", "remote", "add", "origin", str(remote))
    shutil.copytree(SCRIPTS, repo / "scripts")
    for name in ("package.json", "plugin.json"):
        (repo / name).write_text(json.dumps({"version": "1.2.3"}))
    run(repo, "git", "add", ".")
    run(repo, "git", "commit", "-m", "initial")
    run(repo, "git", "push", "-u", "origin", "main")
    return repo, remote


def version(repo, name="package.json"):
    return json.loads((repo / name).read_text())["version"]


def test_patch_release_updates_both_manifests_and_pushes_tag(release_repo):
    repo, remote = release_repo
    run(repo, "bash", "scripts/release.sh", "patch")
    assert version(repo) == version(repo, "plugin.json") == "1.2.4"
    assert run(repo, "git", "--git-dir", str(remote), "tag", "--list").stdout.strip() == "v1.2.4"
    assert run(repo, "git", "status", "--porcelain").stdout == ""


def test_dirty_tree_is_rejected_before_bumping(release_repo):
    repo, _ = release_repo
    (repo / "pending.txt").write_text("uncommitted")
    result = run(repo, "bash", "scripts/release.sh", "patch", check=False)
    assert result.returncode != 0
    assert version(repo) == "1.2.3"
    assert (repo / "pending.txt").read_text() == "uncommitted"


def test_existing_remote_tag_is_rejected_before_bumping(release_repo):
    repo, remote = release_repo
    commit = run(repo, "git", "rev-parse", "HEAD").stdout.strip()
    run(repo, "git", "--git-dir", str(remote), "tag", "v1.2.4", commit)
    result = run(repo, "bash", "scripts/release.sh", "patch", check=False)
    assert result.returncode != 0
    assert version(repo) == "1.2.3"
    assert run(repo, "git", "status", "--porcelain").stdout == ""


def test_unpushed_main_is_rejected(release_repo):
    repo, _ = release_repo
    run(repo, "git", "commit", "--allow-empty", "-m", "not pushed")
    result = run(repo, "bash", "scripts/release.sh", "patch", check=False)
    assert result.returncode != 0
    assert version(repo) == "1.2.3"


def test_mismatched_versions_are_rejected(release_repo):
    repo, _ = release_repo
    (repo / "plugin.json").write_text(json.dumps({"version": "1.2.2"}))
    run(repo, "git", "add", "plugin.json")
    run(repo, "git", "commit", "-m", "mismatched manifests")
    run(repo, "git", "push", "origin", "main")
    result = run(repo, "bash", "scripts/release.sh", check=False)
    assert result.returncode != 0
    assert run(repo, "git", "tag", "--list").stdout == ""


def test_release_without_bump_tags_current_version(release_repo):
    repo, remote = release_repo
    run(repo, "bash", "scripts/release.sh")
    assert version(repo) == version(repo, "plugin.json") == "1.2.3"
    assert run(repo, "git", "--git-dir", str(remote), "tag", "--list").stdout.strip() == "v1.2.3"


@pytest.mark.parametrize("prerelease", ["1.2.4-beta.1", "1.2.4-rc.1"])
def test_prerelease_tags_matching_version(release_repo, prerelease):
    repo, remote = release_repo
    for name in ("package.json", "plugin.json"):
        (repo / name).write_text(json.dumps({"version": prerelease}))
    run(repo, "git", "add", "package.json", "plugin.json")
    run(repo, "git", "commit", "-m", "prepare prerelease")
    run(repo, "git", "push", "origin", "main")
    run(repo, "bash", "scripts/release.sh")
    assert run(repo, "git", "--git-dir", str(remote), "tag", "--list").stdout.strip() == f"v{prerelease}"
