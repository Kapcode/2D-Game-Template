package com.kapcode.composebrowsertemplate // Changed package name case

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ApplicationInfo
import android.graphics.Color as AndroidColor // Alias Android Graphics Color
import android.os.Build
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.RequiresApi
import androidx.annotation.RequiresPermission
import androidx.compose.ui.platform.LocalContext
import com.kapcode.composebrowsertemplate.ui.theme.LearnWithAiTheme // Corrected import
import java.io.IOException
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableIntStateOf 
import androidx.compose.ui.graphics.Color // Compose Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader

@SuppressLint("StaticFieldLeak")//I am setting null on dispose
private var internalWebView: WebView? = null
@SuppressLint("StaticFieldLeak")
private var androidBridge: Any = Any()
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
            Log.d("MainActivityWebViewDebug", "Enabling WebView debugging.")
            WebView.setWebContentsDebuggingEnabled(true)
        } else {
            Log.d("MainActivityWebViewDebug", "WebView debugging NOT enabled (release build).")
        }

        setContent {
            LearnWithAiTheme {
                HtmlViewer(mainActivityInstance = this)
            }
        }
    }

    inner class WebAppInterface(private val context: Context) {
        @RequiresPermission(Manifest.permission.VIBRATE)
        @JavascriptInterface
        fun vibrateWithPattern(patternMillisCsv: String) {
            Log.d("WebAppInterface", "JS called vibrateWithPattern with: $patternMillisCsv")
            val patternArray: LongArray = try {
                patternMillisCsv.split(',')
                    .mapNotNull { it.trim().toLongOrNull() }
                    .toLongArray()
            } catch (e: NumberFormatException) {
                Log.e("WebAppInterface", "Invalid number format in pattern: $patternMillisCsv", e)
                return
            }
            if (patternArray.isEmpty()) {
                Log.w("WebAppInterface", "Pattern array is empty after parsing: $patternMillisCsv")
                return
            }
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = this.context.getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                this.context.getSystemService(VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrationEffect = VibrationEffect.createWaveform(patternArray, -1)
                vibrator.vibrate(vibrationEffect)
                Log.d("WebAppInterface", "Vibrating with effect (API 26+)")
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(patternArray, -1)
                Log.d("WebAppInterface", "Vibrating with pattern (API < 26)")
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            Toast.makeText(this.context, message, Toast.LENGTH_SHORT).show()
        }

        fun sendDataToJavaScript(message: String, count: Int) {
            internalWebView?.let { webView ->
                val escapedMessage = message
                    .replace("\\", "\\\\") 
                    .replace("'", "\\'")  
                    .replace("\n", "\\n")   
                val script = "updateDisplayFromAndroid('$escapedMessage', $count);"
                Log.d("KotlinToJs", "Evaluating script: $script")
                webView.post {
                    webView.evaluateJavascript(script) { result ->
                        Log.d("KotlinToJs", "JavaScript execution result: $result")
                    }
                }
            } ?: run {
                Log.w("KotlinToJs", "WebView instance is null. Cannot send data to JavaScript.")
            }
        }
    }
}

@RequiresApi(Build.VERSION_CODES.O)
@SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
@Composable
fun HtmlAssetView(
    assetFileName: String,
    webViewClient: WebViewClient, 
    mainActivityInstance: MainActivity,
    modifier: Modifier = Modifier
) {
    val initialUrl = "https://appassets.androidplatform.net/$assetFileName"

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                this.webViewClient = webViewClient 
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false 
                settings.allowContentAccess = false 
                settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
                settings.setSupportMultipleWindows(false) 
                settings.safeBrowsingEnabled = true 

                // Make WebView background transparent
                setBackgroundColor(AndroidColor.TRANSPARENT)
                // For some complex HTML/CSS, layer type might be needed, but try without first
                // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
                //     setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                // }

                Log.d("WebViewSetup", "WebView instance created. Transparent BG set.")
                
                androidBridge = mainActivityInstance.WebAppInterface(this.context)
                addJavascriptInterface(androidBridge, "AndroidBridge")
                Log.d("WebViewSetup", "AndroidBridge interface added to WebView.")
                
                internalWebView = this 

                loadUrl(initialUrl) 
            }
        },
        update = { webView ->
            val newUrl = "https://appassets.androidplatform.net/$assetFileName"
            if (webView.url != newUrl) {
                 Log.d("HtmlAssetView", "AndroidView update: Loading URL: $newUrl")
                 webView.loadUrl(newUrl)
            }
        },
        onRelease = { webView ->
            Log.d("WebViewSetup", "WebView instance released from AndroidView.")
            if (internalWebView == webView) { 
                internalWebView = null
            }
        },
        modifier = modifier.background(Color.Green) // Compose Color used here
    )
}

@SuppressLint("NewApi")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HtmlViewer(mainActivityInstance: MainActivity) {
    val context = LocalContext.current
    val htmlFiles = remember {
        try {
            val allAssetFiles = context.assets.list("") ?: emptyArray()
            val htmlFileNames = allAssetFiles
                .filter { it.endsWith(".html", ignoreCase = true) }
                .sorted()
                .toList()
            Log.d("HtmlFiles", "Found HTML files: $htmlFileNames")
            htmlFileNames
        } catch (e: IOException) {
            Log.e("HtmlFiles", "Error listing assets", e)
            emptyList<String>()
        }
    }
    var currentFileIndex by rememberSaveable { mutableIntStateOf(0) } 

    val assetLoader = remember {
        WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()
    }

    val customWebViewClient = remember(assetLoader) {
        object : WebViewClient() { 
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url 
                return if (view != null && url != null &&
                    url.scheme == "https" &&
                    url.host == "appassets.androidplatform.net") {
                    Log.d("WebViewIntercept", "AssetLoader handling: $url") 
                    assetLoader.shouldInterceptRequest(request.url)
                } else {
                    Log.d("WebViewIntercept", "Super handling: $url") 
                    super.shouldInterceptRequest(view, request)
                }
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                Log.d("WebViewLoading", "Page finished in custom client: $url")
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url
                if (url != null && url.host == "appassets.androidplatform.net") {
                     Log.d("WebViewOverride", "Not overriding (false): $url") 
                    return false 
                }
                Log.d("WebViewOverride", "Super handling (shouldOverrideUrlLoading): $url") 
                return super.shouldOverrideUrlLoading(view, request)
            }
        }
    }

    Scaffold(
        modifier = Modifier.background(Color.Cyan), // Compose Color
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color.Blue) // Compose Color
        ) {
            if (htmlFiles.isNotEmpty() && currentFileIndex in htmlFiles.indices) {
                val currentFileName = htmlFiles[currentFileIndex]
                HtmlAssetView(
                    assetFileName = currentFileName,
                    webViewClient = customWebViewClient,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxSize(),
                    mainActivityInstance = mainActivityInstance
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No HTML file selected or available.")
                }
            }
        }
    }
}
