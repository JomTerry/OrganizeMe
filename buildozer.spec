[app]
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry
version = 0.1

source.dir = OrganizeMe
source.include_exts = py,kv,html,css,js,png,jpg,jpeg,ttf,db,json

requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer==2.1.0,python-dateutil==2.8.2,pyjnius

orientation = portrait
fullscreen = 0

android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE,VIBRATE,WAKE_LOCK

android.add_assets = OrganizeMe/index.html
android.add_assets = OrganizeMe/index.js
android.add_assets = OrganizeMe/style.css

log_level = 2

[buildozer]
warn_on_root = 1

[android]
android.api = 33
android.minapi = 21
android.ndk = 23b
android.archs = arm64-v8a,armeabi-v7a
