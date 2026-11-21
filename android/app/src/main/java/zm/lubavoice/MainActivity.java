package zm.lubavoice;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * LubaVoice AI: a WebView shell around the offline web app (assets/index.html),
 * plus native Greek text-to-speech, microphone permission, file import and saving to Downloads.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_MIC = 11;
    private static final int REQ_FILE = 12;
    private static final Locale GREEK = new Locale("el", "GR");

    private WebView web;
    private TextToSpeech tts;
    private volatile String ttsState = "init"; // init | ok | missing | unsupported | error
    private PermissionRequest pendingPermission;
    private ValueCallback<Uri[]> fileCallback;

    private final Map<String, OutputStream> saves = new HashMap<>();
    private final Map<String, Uri> saveUris = new HashMap<>();
    private final Map<String, String> saveMimes = new HashMap<>();
    private Uri lastSaved;
    private String lastSavedMime;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "LubaAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = getAssets().open(path.substring(1));
                    WebResourceResponse r = new WebResourceResponse(mimeFor(path), "UTF-8", in);
                    Map<String, String> h = new HashMap<>();
                    h.put("Cache-Control", "no-cache");
                    r.setResponseHeaders(h);
                    return r;
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                            new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean audio = false;
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) audio = true;
                    }
                    if (!audio) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        if (pendingPermission != null) pendingPermission.deny();
                        pendingPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Choose a file"), REQ_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        startTts();
        web.loadUrl("https://" + HOST + "/index.html");
    }

    // ------------------------------------------------------------------ text-to-speech
    private void startTts() {
        ttsState = "init";
        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) {
                ttsState = "error";
                return;
            }
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String id) {
                }

                @Override
                public void onDone(String id) {
                    notifyDone(id);
                }

                @Override
                @SuppressWarnings("deprecation")
                public void onError(String id) {
                    notifyDone(id);
                }

                @Override
                public void onStop(String id, boolean interrupted) {
                    notifyDone(id);
                }
            });
            checkGreek();
        });
    }

    private void checkGreek() {
        if (tts == null) return;
        int r;
        try {
            r = tts.setLanguage(GREEK);
        } catch (Exception e) {
            ttsState = "error";
            return;
        }
        if (r == TextToSpeech.LANG_MISSING_DATA) ttsState = "missing";
        else if (r == TextToSpeech.LANG_NOT_SUPPORTED) ttsState = "unsupported";
        else ttsState = "ok";
    }

    private void notifyDone(String id) {
        final String js = "window.__lubaTtsDone&&window.__lubaTtsDone(" + JSONObject.quote(id) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void openTtsSettings() {
        try {
            Intent i = new Intent("com.android.settings.TTS_SETTINGS");
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            try {
                startActivity(new Intent(android.provider.Settings.ACTION_SETTINGS));
            } catch (Exception ignored) {
            }
        }
    }

    // ------------------------------------------------------------------ JavaScript bridge
    private class Bridge {
        @JavascriptInterface
        public String ttsStatus() {
            return ttsState;
        }

        @JavascriptInterface
        public void recheckVoice() {
            if (tts == null || "error".equals(ttsState)) {
                runOnUiThread(MainActivity.this::startTts);
            } else {
                checkGreek();
            }
        }

        @JavascriptInterface
        public void speak(String text, double rate, String id) {
            if (tts == null || !"ok".equals(ttsState)) {
                notifyDone(id);
                return;
            }
            tts.setLanguage(GREEK);
            tts.setSpeechRate((float) rate);
            int r = tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), id);
            if (r != TextToSpeech.SUCCESS) notifyDone(id);
        }

        @JavascriptInterface
        public void stopSpeaking() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void installGreekVoice() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                    i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception e) {
                    openTtsSettings();
                }
            });
        }

        @JavascriptInterface
        public void openTtsSettings() {
            runOnUiThread(MainActivity.this::openTtsSettings);
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
                return p.versionName;
            } catch (Exception e) {
                return "?";
            }
        }

        // Saving files: saveBegin → saveChunk (base64) … → saveEnd
        @JavascriptInterface
        public String saveBegin(String name, String mime) {
            try {
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                String tok = "s" + System.nanoTime();
                OutputStream os;
                Uri uri;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/LubaVoice");
                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) return "ERR could not create the file";
                    os = getContentResolver().openOutputStream(uri);
                    if (os == null) return "ERR could not open the file";
                } else {
                    File dir = new File(getExternalFilesDir(null), "LubaVoice");
                    if (!dir.exists() && !dir.mkdirs()) return "ERR could not create folder";
                    File f = new File(dir, safe);
                    os = new FileOutputStream(f);
                    uri = Uri.fromFile(f);
                }
                synchronized (saves) {
                    saves.put(tok, new BufferedOutputStream(os, 1 << 16));
                    saveUris.put(tok, uri);
                    saveMimes.put(tok, mime);
                }
                return tok;
            } catch (Exception e) {
                return "ERR " + e.getMessage();
            }
        }

        @JavascriptInterface
        public String saveChunk(String tok, String b64) {
            OutputStream os;
            synchronized (saves) {
                os = saves.get(tok);
            }
            if (os == null) return "ERR unknown file";
            try {
                os.write(Base64.decode(b64, Base64.DEFAULT));
                return "OK";
            } catch (Exception e) {
                return "ERR " + e.getMessage();
            }
        }

        @JavascriptInterface
        public String saveEnd(String tok) {
            OutputStream os;
            Uri uri;
            String mime;
            synchronized (saves) {
                os = saves.remove(tok);
                uri = saveUris.remove(tok);
                mime = saveMimes.remove(tok);
            }
            if (os == null) return "ERR unknown file";
            try {
                os.close();
                lastSaved = uri;
                lastSavedMime = mime;
                if (Build.VERSION.SDK_INT >= 29) return "OK|Downloads/LubaVoice";
                return "OK|" + (uri != null ? uri.getPath() : "app storage");
            } catch (Exception e) {
                return "ERR " + e.getMessage();
            }
        }

        @JavascriptInterface
        public void shareLast() {
            runOnUiThread(() -> {
                if (lastSaved == null || Build.VERSION.SDK_INT < 29) return;
                try {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType(lastSavedMime != null ? lastSavedMime : "application/octet-stream");
                    send.putExtra(Intent.EXTRA_STREAM, lastSaved);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "Share"));
                } catch (Exception ignored) {
                }
            });
        }
    }

    // ------------------------------------------------------------------ activity plumbing
    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code == REQ_MIC && pendingPermission != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingPermission.deny();
            }
            pendingPermission = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == REQ_FILE) {
            if (fileCallback != null) {
                Uri[] uris = null;
                if (result == RESULT_OK && data != null && data.getData() != null) uris = new Uri[]{data.getData()};
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(code, result, data);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.__lubaBack?window.__lubaBack():false)", v -> {
            if (!"true".equals(v)) finish();
        });
    }

    @Override
    protected void onPause() {
        // Stop any recording and free the microphone so FunCrowd (or any app) can use it.
        if (web != null) web.evaluateJavascript("window.__lubaPause&&window.__lubaPause()", null);
        if (tts != null) tts.stop();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (tts != null && !"ok".equals(ttsState) && !"init".equals(ttsState)) checkGreek();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".wav")) return "audio/wav";
        return "application/octet-stream";
    }
}
