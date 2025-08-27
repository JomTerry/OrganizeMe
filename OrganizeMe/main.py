from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.utils import platform

if platform == "android":
    from jnius import autoclass

class WebViewApp(App):
    def build(self):
        if platform == "android":
            # Android classes
            WebView = autoclass('android.webkit.WebView')
            WebViewClient = autoclass('android.webkit.WebViewClient')
            activity = autoclass('org.kivy.android.PythonActivity').mActivity

            # Create WebView
            webview = WebView(activity)
            webview.getSettings().setJavaScriptEnabled(True)
            webview.setWebViewClient(WebViewClient())

            # Load local HTML file from assets
            webview.loadUrl("https://jomterryy417-c0c.web.app/")

            activity.setContentView(webview)
            return Label(text="")  # Kivy needs to return a widget
        else:
            # Non-Android fallback
            return BoxLayout(orientation='vertical', children=[
                Label(text="WebView works only on Android build.\nOpen index.html in your browser.")
            ])

if __name__ == '__main__':
    WebViewApp().run()