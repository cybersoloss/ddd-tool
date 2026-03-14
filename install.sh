#!/usr/bin/env bash
# install.sh — Build and install DDD Tool to /Applications on macOS
set -euo pipefail

APP_NAME="DDD Tool"
APP_BUNDLE="DDD Tool.app"
INSTALL_DIR="/Applications"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_DIR="$REPO_ROOT/src-tauri/target/release/bundle"
APP_SRC="$BUNDLE_DIR/macos/$APP_BUNDLE"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${BOLD}==> $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

# ── Platform check ─────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || error "This script is macOS only."

# ── Parse flags ────────────────────────────────────────────────────────────────
BUILD=true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build) BUILD=false; shift ;;
    --help|-h)
      echo "Usage: $0 [--no-build]"
      echo ""
      echo "  Builds DDD Tool and installs it to $INSTALL_DIR."
      echo "  --no-build   Skip the build step; install from existing artifacts."
      exit 0
      ;;
    *) error "Unknown option: $1" ;;
  esac
done

# ── Dependency checks ──────────────────────────────────────────────────────────
if $BUILD; then
  command -v node  >/dev/null 2>&1 || error "Node.js is required. Install via: brew install node"
  command -v cargo >/dev/null 2>&1 || error "Rust/Cargo is required. Install via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  command -v npm   >/dev/null 2>&1 || error "npm is required (comes with Node.js)."
fi

# ── Build ──────────────────────────────────────────────────────────────────────
if $BUILD; then
  info "Installing npm dependencies..."
  cd "$REPO_ROOT"
  npm install --prefer-offline 2>&1 | tail -3

  info "Building $APP_NAME (this takes a few minutes)..."
  # Run build with full output — do NOT suppress errors
  npm run tauri build -- --bundles app

  # Confirm the artifact was actually updated
  [[ -d "$APP_SRC" ]] || error "Build finished but artifact not found at: $APP_SRC"
  BUILD_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$APP_SRC")
  success "Build complete — artifact: $BUILD_DATE"
fi

# ── Verify build artifact ──────────────────────────────────────────────────────
[[ -d "$APP_SRC" ]] || error "Artifact not found: $APP_SRC\n       Run without --no-build to build first."

# ── Kill running instance ──────────────────────────────────────────────────────
if pgrep -f "DDD Tool" >/dev/null 2>&1 || pgrep -f "ddd-tool" >/dev/null 2>&1; then
  warn "Stopping running instance of $APP_NAME..."
  killall "DDD Tool" 2>/dev/null || true
  pkill -f "ddd-tool" 2>/dev/null || true
  sleep 2
fi

# ── Remove quarantine attribute ────────────────────────────────────────────────
xattr -cr "$APP_SRC" 2>/dev/null || true

# ── Install ────────────────────────────────────────────────────────────────────
DEST="$INSTALL_DIR/$APP_BUNDLE"

if [[ -d "$DEST" ]]; then
  warn "Replacing existing install..."
  rm -rf "$DEST"
fi

info "Installing to $INSTALL_DIR..."
cp -R "$APP_SRC" "$INSTALL_DIR/"

# Confirm installed version
INSTALLED_VERSION=$(defaults read "$DEST/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo "unknown")
success "$APP_NAME v$INSTALLED_VERSION installed to $DEST"

# ── Optional: launch ───────────────────────────────────────────────────────────
echo ""
read -r -p "Launch $APP_NAME now? [y/N] " LAUNCH
if [[ "$(echo "$LAUNCH" | tr '[:upper:]' '[:lower:]')" == "y" ]]; then
  # Force a new instance — don't bring an old cached process to front
  killall "DDD Tool" 2>/dev/null || true
  sleep 1
  open -n "$DEST"
fi
