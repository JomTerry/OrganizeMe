[app]
title = OrganizeMe
package.name = organizeme
package.domain = org.organizeme
source.dir = .
source.include_exts = py,kv,html,js,css,png,jpg,jpeg
version = 0.1
requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer,pyjnius
orientation = portrait
fullscreen = 0

# Include all your HTML/JS/CSS
presplash.filename = assets/presplash.png
icon.filename = assets/icon.png

# Permissions for Android WebView
android.permissions = INTERNET,READ_EXTERNAL_STORAGE,WRITE_EXTERNAL_STORAGE

# This ensures HTML files are copied
android.add_assets = ./index.html, ./index.js, ./style.css

[buildozer]
log_level = 2
warn_on_root = 1

[android]
# Minimum SDK that supports modern WebView
android.minapi = 21
android.sdk = 33