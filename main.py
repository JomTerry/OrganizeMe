from kivy.app import App
from kivy.uix.label import Label
from kivy.utils import platform

if platform == "android":
    try:
        from android.runnable import run_on_ui_thread
        from jnius import autoclass
    except Exception:
        run_on_ui_thread = None
        autoclass = None

class WebViewApp(App):
    def build(self):
        if platform == "android" and autoclass is not None:
            self._create_webview()
            return Label(text="")  # placeholder; native WebView becomes visible
        else:
            return Label(text="This app is intended to run on Android. Open index.html in a browser to preview.")

    def _create_webview(self):
        if run_on_ui_thread is None:
            return

        @run_on_ui_thread
        def _make():
            try:
                PythonActivity = autoclass("org.kivy.android.PythonActivity")
                activity = PythonActivity.mActivity

                WebView = autoclass("android.webkit.WebView")
                WebViewClient = autoclass("android.webkit.WebViewClient")
                WebSettings = autoclass("android.webkit.WebSettings")

                webview = WebView(activity)

                # Enable debugging for chrome://inspect
                try:
                    WebView.setWebContentsDebuggingEnabled(True)
                except Exception:
                    pass

                settings = webview.getSettings()
                settings.setJavaScriptEnabled(True)
                settings.setDomStorageEnabled(True)
                settings.setAllowFileAccess(True)
                try:
                    settings.setAllowUniversalAccessFromFileURLs(True)
                except Exception:
                    pass
                try:
                    MIXED = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    settings.setMixedContentMode(MIXED)
                except Exception:
                    pass

                webview.setWebViewClient(WebViewClient())
                webview.loadUrl("https://jomterryy417-c0c.web.app/") 

                activity.setContentView(webview)

            except Exception as e:
                try:
                    Log = autoclass("android.util.Log")
                    Log.e("OrganizeMe", "WebView setup failed: %s" % str(e))
                except Exception:
                    print("WebView setup failed:", e)

        _make()

if __name__ == "__main__":
    WebViewApp().run()
