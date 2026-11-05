package io.ptbk.android;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Collections;
import java.util.Objects;

/** Small native start/stop shell around Reborn's project dashboard. */
public final class MainActivity extends Activity {
    private final Handler main = new Handler(Looper.getMainLooper());
    private LinearLayout layout;
    private TextView status;
    private EditText geminiKey;
    private Button start;
    private Button stop;
    private WebView dashboard;
    private String dashboardUrl;
    private EngineService.State renderedState;

    private final Runnable refresh = new Runnable() {
        @Override
        public void run() {
            showEngine();
            main.postDelayed(this, 500);
        }
    };

    @Override
    public void onCreate(Bundle saved) {
        super.onCreate(saved);
        layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });

        status = new TextView(this);
        status.setTextIsSelectable(true);
        int padding = Math.round(12 * getResources().getDisplayMetrics().density);
        status.setPadding(padding, padding, padding, 0);
        layout.addView(status);

        geminiKey = new EditText(this);
        geminiKey.setHint("Gemini API key (optional, this session only)");
        geminiKey.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        geminiKey.setSingleLine();
        geminiKey.setSaveEnabled(false);
        layout.addView(geminiKey);

        LinearLayout buttons = new LinearLayout(this);
        start = new Button(this);
        start.setText("Start engine");
        start.setOnClickListener(view -> startEngine());
        buttons.addView(start, new LinearLayout.LayoutParams(0, -2, 1));
        stop = new Button(this);
        stop.setText("Stop engine");
        stop.setOnClickListener(view -> startService(new Intent(this, EngineService.class).setAction(EngineService.STOP)));
        buttons.addView(stop, new LinearLayout.LayoutParams(0, -2, 1));
        layout.addView(buttons);
        setContentView(layout);
        showEngine();
    }

    private void startEngine() {
        start.setEnabled(false);
        String key = geminiKey.getText().toString().trim();
        try {
            startForegroundService(new Intent(this, EngineService.class).setAction(EngineService.START)
                .putExtra(EngineService.GEMINI_KEY, key));
            geminiKey.setText("");
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !getPreferences(MODE_PRIVATE).getBoolean("notificationsAsked", false)) {
                getPreferences(MODE_PRIVATE).edit().putBoolean("notificationsAsked", true).apply();
                requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, 1);
            }
        } catch (RuntimeException error) {
            start.setEnabled(true);
            EngineService.state = new EngineService.State("Could not start the local engine: " + error.getMessage(), false, null, null);
            showEngine();
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        main.post(refresh);
    }

    @Override
    protected void onStop() {
        main.removeCallbacks(refresh);
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        closeDashboard();
        super.onDestroy();
    }

    private void showEngine() {
        EngineService.State state = EngineService.state;
        if (renderedState == state) return;
        renderedState = state;
        status.setText("Promptbook " + BuildVersion.NAME + " · " + state.text);
        geminiKey.setVisibility(state.active ? View.GONE : View.VISIBLE);
        start.setVisibility(state.active ? View.GONE : View.VISIBLE);
        start.setEnabled(!state.active);
        stop.setVisibility(state.active ? View.VISIBLE : View.GONE);
        if (Objects.equals(dashboardUrl, state.url)) return;
        closeDashboard();
        if (state.url != null) openDashboard(state.url, state.key);
    }

    private void openDashboard(String url, String key) {
        dashboardUrl = url;
        Uri origin = Uri.parse(url);
        dashboard = new WebView(this);
        WebSettings settings = dashboard.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(dashboard, false);
        dashboard.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri next = request.getUrl();
                return !"http".equals(next.getScheme()) || !"127.0.0.1".equals(next.getHost()) || next.getPort() != origin.getPort();
            }
        });
        layout.addView(dashboard, new LinearLayout.LayoutParams(-1, 0, 1));
        dashboard.loadUrl(url, Collections.singletonMap("X-PTBK-App", key));
    }

    private void closeDashboard() {
        if (dashboard == null) return;
        layout.removeView(dashboard);
        dashboard.destroy();
        dashboard = null;
        dashboardUrl = null;
    }
}
