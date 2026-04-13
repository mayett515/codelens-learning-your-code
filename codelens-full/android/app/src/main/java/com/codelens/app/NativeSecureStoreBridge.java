package com.codelens.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;

public class NativeSecureStoreBridge {
    private static final String PREFS_NAME = "codelens_secure_store";
    private static final String API_KEYS_KEY = "api_keys_json";

    private final SharedPreferences prefs;

    public NativeSecureStoreBridge(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public String getApiKeys() {
        return prefs.getString(API_KEYS_KEY, "{}");
    }

    @JavascriptInterface
    public void setApiKeys(String json) {
        String safeJson = TextUtils.isEmpty(json) ? "{}" : json;
        prefs.edit().putString(API_KEYS_KEY, safeJson).apply();
    }

    @JavascriptInterface
    public void clearApiKeys() {
        prefs.edit().remove(API_KEYS_KEY).apply();
    }
}
