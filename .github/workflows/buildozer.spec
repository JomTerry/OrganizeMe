[app]
# Basic app metadata
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry

# Your app source is inside the OrganizeMe/ folder
source.dir = OrganizeMe
source.include_exts = py,kv,png,jpg,svg,xml,db,json,txt,ttf

# Version
version = 0.1

# Python requirements — update if you have extra packages.
# If you want me to merge your repo's requirements.txt exactly, paste it and I'll update this line.
requirements = python3,kivy,kivymd,plyer

# UI and orientation
orientation = portrait
fullscreen = 0

# Android permissions (adjust as needed)
android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE,VIBRATE,WAKE_LOCK

# Android build config
android.api = 33
android.ndk = 23b
android.arch = armeabi-v7a,arm64-v8a

# Logging
log_level = 2

[app]
title = OrganizeMe
package.name = organizeme
package.domain = org.jomterry
source.dir = OrganizeMe
source.include_exts = py,png,jpg,kv,atlas,db
version = 1.0
requirements = python3,kivy==2.1.0,kivymd==1.1.1,plyer==2.1.0,python-dateutil==2.8.2
# sqlite3 is part of Python stdlib, so no need to list separately
orientation = portrait
fullscreen = 0
android.permissions = INTERNET,WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE
android.api = 31
android.minapi = 21
android.sdk = 31
android.ndk = 23b
android.archs = arm64-v8a,armeabi-v7a
log_level = 2

[buildozer]
log_level = 2
warn_on_root = 1