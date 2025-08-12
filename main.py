# main.py
# Kivy app that launches an Android WebView and loads file:///android_asset/index.html
# Designed to be packaged with Buildozer. Place this at repo root.

from kivy.app import App
from kivy.uix.label import Label
from kivy.utils import platform

# If running on Android, use pyjnius to create a native WebView on the UI thread
if platform == "android":
    try:
        from android.runnable import run_on_ui_thread
        from jnius import autoclass, cast
    except Exception as e:
        # If pyjnius isn't available (local dev), fallback later
        run_on_ui_thread = None
        autoclass = None

class WebViewApp(App):
    def build(self):
        if platform == "android" and autoclass is not None:
            # Create webview on UI thread
            self._create_and_attach_webview()
            # Return a placeholder widget for Kivy; actual view is the native WebView
            return Label(text="")
        else:
            # Non-Android fallback (useful for testing in desktop)
            return Label(text="This app is intended to run on Android. Open index.html in a browser to preview.")

    def _create_and_attach_webview(self):
        # Called in Python main thread; ensure UI changes happen on Android UI thread
        if run_on_ui_thread is None:
            return

        @run_on_ui_thread
        def _make():
            try:
                PythonActivity = autoclass("org.kivy.android.PythonActivity")
                activity = PythonActivity.mActivity

                # Android WebView classes
                WebView = autoclass("android.webkit.WebView")
                WebViewClient = autoclass("android.webkit.WebViewClient")
                WebSettings = autoclass("android.webkit.WebSettings")

                # Create WebView instance
                webview = WebView(activity)

                # Enable debugging so you can inspect via chrome://inspect (useful for debugging)
                try:
                    WebView.setWebContentsDebuggingEnabled(True)
                except Exception:
                    pass

                settings = webview.getSettings()
                settings.setJavaScriptEnabled(True)
                # Enable DOM storage / localStorage
                settings.setDomStorageEnabled(True)
                # Allow file access (so file:///android_asset can be used)
                settings.setAllowFileAccess(True)
                # Allow file URLs to load resources from other origins (needed when loading remote Firebase scripts)
                try:
                    settings.setAllowUniversalAccessFromFileURLs(True)
                except Exception:
                    # older devices may not have it; ignore
                    pass

                # Allow mixed content (HTTP/HTTPS) if available (API >= 21)
                try:
                    MIXED = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    settings.setMixedContentMode(MIXED)
                except Exception:
                    pass

                # Use a basic WebViewClient so links stay inside the view
                webview.setWebViewClient(WebViewClient())

                # Load the local index.html packaged in android_asset
                webview.loadUrl("file:///android_asset/index.html")

                # Set the WebView as the Activity content view (replaces Kivy surface)
                activity.setContentView(webview)

            except Exception as e:
                # If anything goes wrong, print to logcat via android.util.Log (if available)
                try:
                    Log = autoclass("android.util.Log")
                    Log.e("OrganizeMe", "WebView setup failed: %s" % str(e))
                except Exception:
                    print("WebView setup failed:", e)

        _make()

if __name__ == "__main__":
    WebViewApp().run()