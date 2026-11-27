#!/bin/bash
# scripts/release.sh
# Create and push a git tag for the current version
#
# Usage:
#   ./scripts/release.sh          # Tag current version
#   ./scripts/release.sh patch    # Bump patch (1.2.8 -> 1.2.9), then tag
#   ./scripts/release.sh minor    # Bump minor (1.2.9 -> 1.3.0), then tag
#   ./scripts/release.sh major    # Bump major (1.9.9 -> 2.0.0), then tag
#   ./scripts/release.sh --help   # Show help

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

BUMP_TYPE="$1"

if [[ "$BUMP_TYPE" == "--help" || "$BUMP_TYPE" == "-h" ]]; then
    echo "Usage:"
    echo "  ./scripts/release.sh          # Tag current version"
    echo "  ./scripts/release.sh patch    # Bump patch (1.2.8 -> 1.2.9), then tag"
    echo "  ./scripts/release.sh minor    # Bump minor (1.2.9 -> 1.3.0), then tag"
    echo "  ./scripts/release.sh major    # Bump major (1.9.9 -> 2.0.0), then tag"
    exit 0
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
    echo "Release must be created from main."
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Commit or stash all changes before creating a release."
    exit 1
fi

VERSION=$(jq -r .version < package.json)
if [[ "$(jq -r .version < plugin.json)" != "$VERSION" ]]; then
    echo "package.json and plugin.json versions must match."
    exit 1
fi

if [[ -n "$BUMP_TYPE" ]]; then
    VERSION=$(bash "$SCRIPT_DIR/update-version.sh" "$BUMP_TYPE" --print)
elif [[ ! "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(beta|rc)\.[1-9][0-9]*)?$ ]]; then
    echo "Invalid version: $VERSION"
    exit 1
fi
TAG="v$VERSION"

echo "🔍 Checking if tag $TAG exists..."

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "❌ Tag $TAG already exists!"
    echo "   Either bump version first or delete the existing tag."
    exit 1
fi

REMOTE_REFS=$(git ls-remote --exit-code origin refs/heads/main "refs/tags/$TAG")
REMOTE_MAIN=$(printf '%s\n' "$REMOTE_REFS" | awk '$2 == "refs/heads/main" {print $1}')
if [[ "$REMOTE_MAIN" != "$(git rev-parse HEAD)" ]]; then
    echo "Local main must match origin/main before creating a release."
    exit 1
fi
if printf '%s\n' "$REMOTE_REFS" | grep -q "refs/tags/$TAG$"; then
    echo "Tag $TAG already exists on origin."
    exit 1
fi

echo "🏷️  Creating tag: $TAG"

if [[ -n "$BUMP_TYPE" ]]; then
    bash "$SCRIPT_DIR/update-version.sh" "$BUMP_TYPE"
fi

# Stage and commit version changes if any
if [[ -n "$(git status --porcelain package.json plugin.json 2>/dev/null)" ]]; then
    git add package.json plugin.json
    git commit -m "chore: release $TAG"
fi

# Create and push tag
git tag "$TAG"
git push --atomic origin main "refs/tags/$TAG"

echo ""
echo "✅ Pushed $TAG. GitHub Actions will test and publish the release."
