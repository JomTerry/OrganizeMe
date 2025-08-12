[app]
# Basic metadata
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry
version = 0.1

# Source settings -- main.py will be inside OrganizeMe/
source.dir = OrganizeMe
# include HTML/CSS/JS so Buildozer copies them into android_asset
source.include_exts = py,kv,html,css,js,png,jpg,jpeg,ttf,db,json

# Requirements (must include pyjnius for Java bridge / WebView)
requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer==2.1.0,python-dateutil==2.8.2,pyjnius

# Orientation / UI
orientation = portrait
fullscreen = 0

# Android permissions (allow networking + optional storage if you need it)
android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE,VIBRATE,WAKE_LOCK

# Assets to bundle (paths relative to repo root)
# Source.dir is OrganizeMe, but android.add_assets expects repo-relative paths
android.add_assets = OrganizeMe/index.html
android.add_assets = OrganizeMe/index.js
android.add_assets = OrganizeMe/style.css

# (Optional) app icon / presplash - uncomment and set paths if you have them
# icon.filename = OrganizeMe/assets/icon.png
# presplash.filename = OrganizeMe/assets/presplash.png

# Build options
log_level = 2

[buildozer]
warn_on_root = 1

[android]
# Android SDK/NDK settings - sensible defaults
android.api = 33
android.minapi = 21
android.ndk = 23b
# Architectures (include 64-bit for Play Store)
android.archs = arm64-v8a,armeabi-v7a