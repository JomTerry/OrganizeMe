[app]
# App metadata
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry
version = 0.1

# Source settings - main.py is in the OrganizeMe folder
source.dir = OrganizeMe
# include common asset file extensions (html/js/css for the WebView fallback)
source.include_exts = py,kv,html,css,js,png,jpg,jpeg,ttf,db,json

# Requirements - pin the versions you specified
requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer==2.1.0,python-dateutil==2.8.2,pyjnius

# Orientation / UI
orientation = portrait
fullscreen = 0

# Android permissions (adjust if you need fewer)
android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE,VIBRATE,WAKE_LOCK

# Copy your web assets into APK assets so the WebView can load them
# (comma-separated or use multiple android.add_assets lines)
android.add_assets = index.html,style.css,index.js

# Logging & packaging options
log_level = 2
presplash.filename =
icon.filename =

[buildozer]
# warn when run as root
warn_on_root = 1

[appium]
# (none)

[android]
# Android API / NDK settings -- safe defaults for Play Store
android.api = 33
android.minapi = 21
android.ndk = 23b
# include 64-bit soon-to-be-required by Play Console
android.archs = arm64-v8a,armeabi-v7a

# Misc flags (uncomment if you need them)
# android.release_artifact = aab