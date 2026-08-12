package com.twagirumukiza.radar;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.widget.Toast;
import android.content.ContentValues;
import android.graphics.Color;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {

    private WebView web;
    private boolean pageReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setBackgroundColor(0xff020804);

        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                immersive();
            }
        });

        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        // Appel aprÃ¨s la crÃ©ation et l'attachement de la vue :
        // Ã©vite un WindowInsetsController indisponible pendant le dÃ©marrage.
        web.post(this::immersive);

        web.loadUrl("file:///android_asset/game/index.html");
    }

    private void immersive() {
        if (isFinishing() || isDestroyed()) {
            return;
        }

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);

            WindowInsetsController controller = getWindow().getInsetsController();

            if (controller != null) {
                controller.hide(
                        WindowInsets.Type.statusBars()
                                | WindowInsets.Type.navigationBars()
                );

                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus && web != null) {
            web.post(this::immersive);
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null || !pageReady) {
            super.onBackPressed();
            return;
        }

        web.evaluateJavascript(
                "(function(){try{" +
                        "if(typeof window.radarAndroidBack==='function'){" +
                        "return window.radarAndroidBack();" +
                        "}" +
                        "return 'exit';" +
                        "}catch(e){return 'exit';}})();",
                value -> {
                    if (value == null
                            || "null".equals(value)
                            || value.contains("exit")) {
                        MainActivity.super.onBackPressed();
                    }
                }
        );
    }

    @Override
    protected void onPause() {
        if (web != null) {
            if (pageReady) {
                web.evaluateJavascript(
                        "try{if(typeof persistGame==='function')persistGame(true)}catch(e){}",
                        null
                );
            }
            web.onPause();
        }

        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (web != null) {
            web.onResume();
            web.post(this::immersive);
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidBridge");
            web.stopLoading();
            web.setWebChromeClient(null);
            web.setWebViewClient(null);
            web.destroy();
            web = null;
        }

        super.onDestroy();
    }

    public class Bridge {

        @JavascriptInterface
        public void haptic(String kind) {
            runOnUiThread(() -> {
                Vibrator vibrator =
                        (Vibrator) getSystemService(VIBRATOR_SERVICE);

                if (vibrator == null || !vibrator.hasVibrator()) {
                    return;
                }

                long[] pattern;

                if ("impact".equals(kind)) {
                    pattern = new long[]{0, 70, 45, 120};
                } else if ("hit".equals(kind)) {
                    pattern = new long[]{0, 28, 22, 45};
                } else if ("shot".equals(kind)) {
                    pattern = new long[]{0, 16};
                } else {
                    pattern = new long[]{0, 10};
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(
                            VibrationEffect.createWaveform(pattern, -1)
                    );
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            });
        }

        @JavascriptInterface
        public void toast(String text) {
            final String safeText = text == null ? "" : text;

            runOnUiThread(() ->
                    Toast.makeText(
                            MainActivity.this,
                            safeText,
                            Toast.LENGTH_SHORT
                    ).show()
            );
        }

        @JavascriptInterface
        public String deviceInfo() {
            return Build.MANUFACTURER
                    + " "
                    + Build.MODEL
                    + " / Android "
                    + Build.VERSION.RELEASE;
        }

        @JavascriptInterface
        public void saveJson(String filename, String content) {
            try {
                String safeFilename =
                        (filename == null || filename.trim().isEmpty())
                                ? "radar-export.json"
                                : filename;

                String safeContent = content == null ? "" : content;

                ContentValues values = new ContentValues();
                values.put(
                        MediaStore.Downloads.DISPLAY_NAME,
                        safeFilename
                );
                values.put(
                        MediaStore.Downloads.MIME_TYPE,
                        "application/json"
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(
                            MediaStore.Downloads.RELATIVE_PATH,
                            "Download/Radar"
                    );
                }

                Uri uri = getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        values
                );

                if (uri == null) {
                    throw new IllegalStateException(
                            "Impossible de crÃ©er le fichier d'export."
                    );
                }

                try (OutputStream out =
                             getContentResolver().openOutputStream(uri)) {
                    if (out == null) {
                        throw new IllegalStateException(
                                "Impossible d'ouvrir le fichier d'export."
                        );
                    }

                    out.write(
                            safeContent.getBytes(StandardCharsets.UTF_8)
                    );
                    out.flush();
                }

                runOnUiThread(() ->
                        Toast.makeText(
                                MainActivity.this,
                                "Export enregistrÃ© dans TÃ©lÃ©chargements/Radar",
                                Toast.LENGTH_LONG
                        ).show()
                );

            } catch (Exception exception) {
                runOnUiThread(() ->
                        Toast.makeText(
                                MainActivity.this,
                                "Ãchec de lâexport",
                                Toast.LENGTH_SHORT
                        ).show()
                );
            }
        }
    }
}
