[app]
# Basic metadata
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry
version = 0.1

# Source settings -- main.py should be at repo root (or change source.dir)
source.dir = .
source.include_exts = py,kv,html,css,js,png,jpg,jpeg,ttf,db,json

# Requirements (pinned where you supplied versions)
requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer==2.1.0,python-dateutil==2.8.2,pyjnius

# Orientation / UI
orientation = portrait
fullscreen = 0

# Android permissions
android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE,VIBRATE,WAKE_LOCK

# Make sure your HTML/CSS/JS are included in assets
# Use android.add_assets to copy them into APK assets
android.add_assets = index.html
android.add_assets = index.js
android.add_assets = style.css

# Build options
log_level = 2

[buildozer]
warn_on_root = 1

[android]
# Adjust if Play Console requires newer API; these are sensible defaults
android.api = 33
android.minapi = 21
# NDK version that works commonly; change if Buildozer/p4a complains
android.ndk = 23b
# Architectures (include 64-bit for Play Store)
android.archs = arm64-v8a,armeabi-v7a

# In your workflow (.github/workflows/build-apk.yml)
- name: Install Buildozer
  run: pip install buildozer==1.3.0