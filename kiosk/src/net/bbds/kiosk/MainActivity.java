package net.bbds.kiosk;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

// Kiosco BBDS: WebView a pantalla completa que actúa como pantalla de inicio.
// URL: adb shell am start -n net.bbds.kiosk/.MainActivity --es url https://...
// Salida: mantener 3 dedos quietos 2 s abre los Ajustes de Android.
public class MainActivity extends Activity {
    static final String DEFAULT_URL = "https://bbds-dashboard.manuelpablomr1.workers.dev/";
    static final long EXIT_HOLD_MS = 2000;
    static final long RETRY_MS = 15000;

    private WebView web;
    private final Handler handler = new Handler();
    private final Runnable retry = new Runnable() {
        @Override public void run() { if (web != null) web.loadUrl(savedUrl()); }
    };
    private final Runnable openSettings = new Runnable() {
        @Override public void run() {
            startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyIntent(getIntent());

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                // Sin red al arrancar: reintenta hasta que el Wi-Fi esté listo.
                if (req.isForMainFrame()) scheduleRetry();
            }
        });
        setContentView(web);
        if (state != null) web.restoreState(state);
        else web.loadUrl(savedUrl());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (applyIntent(intent)) web.loadUrl(savedUrl());
    }

    private boolean applyIntent(Intent intent) {
        if (intent == null) return false;
        WebView.setWebContentsDebuggingEnabled(intent.getBooleanExtra("debug", false));
        String url = intent.getStringExtra("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return false;
        prefs().edit().putString("url", url).apply();
        return true;
    }

    private SharedPreferences prefs() { return getSharedPreferences("kiosk", MODE_PRIVATE); }
    private String savedUrl() { return prefs().getString("url", DEFAULT_URL); }

    private void scheduleRetry() {
        handler.removeCallbacks(retry);
        handler.postDelayed(retry, RETRY_MS);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        if (e.getPointerCount() >= 3 && e.getActionMasked() == MotionEvent.ACTION_POINTER_DOWN) {
            handler.postDelayed(openSettings, EXIT_HOLD_MS);
        } else if (e.getPointerCount() < 3 || e.getActionMasked() == MotionEvent.ACTION_UP
                || e.getActionMasked() == MotionEvent.ACTION_CANCEL
                || e.getActionMasked() == MotionEvent.ACTION_POINTER_UP) {
            handler.removeCallbacks(openSettings);
        }
        return super.dispatchTouchEvent(e);
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onBackPressed() {
        // Como pantalla de inicio no hay a dónde volver.
        if (web.canGoBack()) web.goBack();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onPause() { web.onPause(); super.onPause(); }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        web.destroy();
        super.onDestroy();
    }
}
