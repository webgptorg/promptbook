package io.ptbk.android;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/** Owns the one local preview engine independently of the dashboard Activity. */
public final class EngineService extends Service {
    static final String START = "io.ptbk.android.START";
    static final String STOP = "io.ptbk.android.STOP";
    static final String GEMINI_KEY = "geminiKey";
    private static final String CHANNEL = "promptbook_engine";
    private static final int NOTIFICATION = 1;

    /** In-process view state. The dashboard credential is never published in an Intent or notification. */
    static final class State {
        final String text;
        final boolean active;
        final String url;
        final String key;

        State(String text, boolean active, String url, String key) {
            this.text = text;
            this.active = active;
            this.url = url;
            this.key = key;
        }
    }

    static State state = new State("Engine stopped", false, null, null);
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile Process engine;
    private volatile boolean stopping;
    private boolean active;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (STOP.equals(action)) {
            stopEngine();
            return START_NOT_STICKY;
        }
        if (!START.equals(action) || active) return START_NOT_STICKY;

        getSystemService(NotificationManager.class).createNotificationChannel(
            new NotificationChannel(CHANNEL, "Promptbook engine", NotificationManager.IMPORTANCE_LOW)
        );
        startForeground(NOTIFICATION, notification("Starting local engine"));
        active = true;
        state = new State("Starting local engine…", true, null, null);
        String key = dashboardKey();
        String gemini = intent.getStringExtra(GEMINI_KEY);
        intent.removeExtra(GEMINI_KEY);
        new Thread(() -> runEngine(key, gemini == null ? "" : gemini), "Promptbook engine").start();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void runEngine(String key, String gemini) {
        String detail = "";
        try {
            Process child = EngineRuntime.start(this, key, gemini);
            engine = child;
            if (stopping) signalStop(child);
            try (BufferedReader output = new BufferedReader(new InputStreamReader(child.getInputStream(), StandardCharsets.UTF_8))) {
                for (String line; (line = output.readLine()) != null; ) {
                    if (line.startsWith("PTBK_ANDROID_READY ")) {
                        int port = Integer.parseInt(line.substring("PTBK_ANDROID_READY ".length()));
                        if (port < 1 || port > 65535) throw new IOException("Invalid dashboard port.");
                        main.post(() -> {
                            if (stopping || !active) return;
                            state = new State("Engine running", true, "http://127.0.0.1:" + port + "/", key);
                            getSystemService(NotificationManager.class).notify(NOTIFICATION, notification("Local engine running"));
                        });
                    } else if (!line.trim().isEmpty()) {
                        String safe = gemini.isEmpty() ? line : line.replace(gemini, "[redacted]");
                        detail = safe.replace(key, "[redacted]");
                    }
                }
            }
            int exit = child.waitFor();
            if (exit == 0) detail = "";
            else if (detail.isEmpty()) detail = "Engine exited with code " + exit;
        } catch (Exception error) {
            detail = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        } finally {
            Process child = engine;
            if (child != null && child.isAlive()) child.destroyForcibly();
            engine = null;
        }
        String result = detail.isEmpty() || stopping ? "Engine stopped" : detail.replaceFirst("^PTBK_ANDROID_ERROR ", "");
        main.post(() -> {
            if (!active) return;
            active = false;
            state = new State(result, false, null, null);
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
        });
    }

    private void stopEngine() {
        if (!active) {
            stopSelf();
            return;
        }
        if (stopping) return;
        stopping = true;
        state = new State("Stopping local engine…", true, null, null);
        Process child = engine;
        if (child != null) signalStop(child);
        // An unresponsive child cannot keep the service alive after an explicit stop.
        main.postDelayed(() -> {
            Process remaining = engine;
            if (remaining != null && remaining.isAlive()) remaining.destroyForcibly();
        }, 30_000);
    }

    private static void signalStop(Process child) {
        try {
            child.getOutputStream().close();
        } catch (IOException ignored) {
            child.destroy();
        }
    }

    @Override
    public void onDestroy() {
        stopping = true;
        Process child = engine;
        if (child != null) signalStop(child);
        if (active) state = new State("Engine stopped", false, null, null);
        active = false;
        super.onDestroy();
    }

    private Notification notification(String text) {
        int immutable = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), immutable);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, EngineService.class).setAction(STOP), immutable);
        return new Notification.Builder(this, CHANNEL)
            .setContentTitle("Promptbook")
            .setContentText(text)
            .setSmallIcon(R.drawable.promptbook)
            .setContentIntent(open)
            .addAction(new Notification.Action.Builder(null, "Stop", stop).build())
            .setOngoing(true)
            .build();
    }

    private static String dashboardKey() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        StringBuilder key = new StringBuilder(64);
        for (byte value : bytes) {
            key.append(Character.forDigit((value & 0xff) >>> 4, 16));
            key.append(Character.forDigit(value & 0xf, 16));
        }
        return key.toString();
    }
}
