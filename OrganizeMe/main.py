from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.widget import Widget
from kivy.utils import platform

# Only load WebView on Android
if platform == 'android':
    from android.runnable import run_on_ui_thread
    from jnius import autoclass, cast

class WebViewApp(App):
    def build(self):
        if platform == 'android':
            self.load_webview()
            return Widget()  # Empty placeholder
        else:
            return Label(text="This app is designed for Android only.")

    @run_on_ui_thread
    def load_webview(self):
        PythonActivity = autoclass('org.kivy.android.PythonActivity')
        WebView = autoclass('android.webkit.WebView')
        WebViewClient = autoclass('android.webkit.WebViewClient')

        activity = PythonActivity.mActivity
        webview = WebView(activity)
        webview.getSettings().setJavaScriptEnabled(True)
        webview.setWebViewClient(WebViewClient())

        # Load local file from assets
        webview.loadUrl("file:///android_asset/index.html")

        activity.setContentView(webview)

if __name__ == '__main__':
    WebViewApp().run()