#!/usr/bin/env bash

#custom npm free buld pipeline
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="Gmail"
APP_ID="com.emilavara.gmailwrapper"
VERSION="$(node -p "require('./package.json').version")"

DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/build"
APP_PATH="$BUILD_DIR/$APP_NAME.app"
ELECTRON_APP_PATH="$ROOT_DIR/node_modules/electron/dist/Electron.app"
PLIST_PATH="$APP_PATH/Contents/Info.plist"
APP_RESOURCES_DIR="$APP_PATH/Contents/Resources/app"
DMG_PATH="$DIST_DIR/${APP_NAME}-${VERSION}-mac.dmg"
TXZ_PATH="$DIST_DIR/${APP_NAME}-${VERSION}-mac.tar.xz"

if [[ ! -d "$ELECTRON_APP_PATH" ]]; then
  echo "Electron.app not found at $ELECTRON_APP_PATH"
  echo "Run: npm install"
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp -R "$ELECTRON_APP_PATH" "$APP_PATH"

set_plist_string() {
  local key="$1"
  local value="$2"
  /usr/libexec/PlistBuddy -c "Set :$key $value" "$PLIST_PATH" >/dev/null 2>&1 || \
    /usr/libexec/PlistBuddy -c "Add :$key string $value" "$PLIST_PATH" >/dev/null
}

set_plist_string "CFBundleDisplayName" "$APP_NAME"
set_plist_string "CFBundleName" "$APP_NAME"
set_plist_string "CFBundleIdentifier" "$APP_ID"
set_plist_string "CFBundleShortVersionString" "$VERSION"
set_plist_string "CFBundleVersion" "$VERSION"
set_plist_string "NSHumanReadableCopyright" "copyright google, wrapped by @emilavara"
set_plist_string "LSApplicationCategoryType" "public.app-category.productivity"

if [[ -f "$ROOT_DIR/assets/icon.icns" ]]; then
  cp "$ROOT_DIR/assets/icon.icns" "$APP_PATH/Contents/Resources/icon.icns"
  set_plist_string "CFBundleIconFile" "icon.icns"
fi

rm -rf "$APP_RESOURCES_DIR"
mkdir -p "$APP_RESOURCES_DIR"
cp "$ROOT_DIR/package.json" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/main.js" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/preload.js" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/webview-preload.js" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/index.html" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/renderer.js" "$APP_RESOURCES_DIR/"
cp "$ROOT_DIR/styles.css" "$APP_RESOURCES_DIR/"
cp -R "$ROOT_DIR/assets" "$APP_RESOURCES_DIR/"

rm -f "$DMG_PATH" "$TXZ_PATH"

hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$APP_PATH" \
  -ov \
  -format UDBZ \
  "$DMG_PATH" >/dev/null

XZ_OPT=-9e tar -C "$BUILD_DIR" -cJf "$TXZ_PATH" "$APP_NAME.app"

echo "Build complete:"
ls -lh "$DMG_PATH" "$TXZ_PATH"
