package com.laundryman.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The old working APK's Capacitor enabled wide-viewport support, which
        // makes the WebView honor the packaged `width=480` viewport meta and
        // scale the 480px layout to fill the phone screen. Capacitor 8's Bridge
        // no longer sets this by default, so without it the WebView falls back
        // to the device's wide layout width and the whole app renders zoomed
        // out ("too wide"). Restore the same settings the old APK used.
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            // Never show the native overscroll glow / rubber-band stretch when
            // the user drags past the top or bottom of the page.
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        }

        // Ask for runtime permissions on first open (Android 6+). Only the
        // permissions that are still missing are requested, so this is a
        // one-time dialog batch on first launch and a no-op afterwards.
        requestAppPermissions();
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            // Pre-Marshmallow grants everything at install time.
            return;
        }

        List<String> permissions = new ArrayList<>();
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        permissions.add(Manifest.permission.CAMERA);
        permissions.add(Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+: granular media permissions replace READ_EXTERNAL_STORAGE.
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }

        List<String> needed = new ArrayList<>();
        for (String permission : permissions) {
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
                needed.add(permission);
            }
        }
        if (needed.isEmpty()) {
            return; // Everything already granted.
        }

        // Wait a moment so the web UI is up before the system dialogs appear.
        new Handler(Looper.getMainLooper()).postDelayed(() ->
                requestPermissions(needed.toArray(new String[0]), 41015), 700);
    }

    @Override
    public void onBackPressed() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            super.onBackPressed();
            return;
        }
        WebView webView = getBridge().getWebView();
        // Defer back handling to the JS layer (window.__lmBack in App.jsx), which
        // decides between 'KB' (keyboard closed), 'BACK' (in-app navigation) and
        // 'ROOT' (nothing left — the native side should exit the app).
        webView.evaluateJavascript(
            "(function(){ if (window.__lmBack) { return JSON.stringify({ r: window.__lmBack() }); }" +
            " return JSON.stringify({ r: 'ROOT' }); })();",
            value -> {
                String r = "ROOT";
                if (value != null && !value.equals("null") && value.startsWith("{")) {
                    try {
                        JSObject obj = new JSObject(value);
                        r = obj.getString("r", "ROOT");
                    } catch (Exception ignored) {
                        r = "ROOT";
                    }
                }
                if ("KB".equals(r) || "BACK".equals(r)) return;
                MainActivity.super.onBackPressed();
            });
    }
}
