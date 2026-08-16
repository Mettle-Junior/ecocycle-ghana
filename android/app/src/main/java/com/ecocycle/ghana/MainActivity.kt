package com.ecocycle.ghana

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.*
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var loadingLayout: LinearLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Permission launcher for Location & Storage
    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Handle permission results if needed
    }

    // File Chooser launcher for Waste Photo Uploads
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results = if (result.resultCode == RESULT_OK) {
                result.data?.let { intent ->
                    intent.data?.let { uri -> arrayOf(uri) }
                }
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    // Configure live cloud domain URL here (e.g., "https://ecocycle-ghana.onrender.com")
    // Set to empty string "" to fall back to local Chaquopy embedded Python backend
    private val LIVE_SERVER_URL: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        loadingLayout = findViewById(R.id.loadingLayout)

        requestRequiredPermissions()
        setupWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        if (LIVE_SERVER_URL.isNotEmpty()) {
            webView.loadUrl(LIVE_SERVER_URL)
        } else {
            // Start Local Python Flask Backend via Chaquopy
            startPythonBackend()
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        } else {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
        }

        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            requestPermissionsLauncher.launch(missingPermissions.toTypedArray())
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Custom WebViewClient for internal navigation & page load events
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("http://127.0.0.1:5000") || url.startsWith("http://localhost:5000") ||
                    (LIVE_SERVER_URL.isNotEmpty() && url.startsWith(LIVE_SERVER_URL))) {
                    return false
                }
                // Open external links in device browser
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefresh.isRefreshing = false
                // Hide splash loader once Flask page renders
                if (loadingLayout.visibility == View.VISIBLE) {
                    loadingLayout.visibility = View.GONE
                }
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                swipeRefresh.isRefreshing = false
            }
        }

        // Custom WebChromeClient for File Uploads (waste photos) & GPS Location
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(this@MainActivity, "Cannot open file picker", Toast.LENGTH_SHORT).show()
                    return false
                }
                return true
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.emerald_500, R.color.green_700)
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun startPythonBackend() {
        thread {
            try {
                if (!Python.isStarted()) {
                    Python.start(AndroidPlatform(applicationContext))
                }

                val py = Python.getInstance()
                val module = py.getModule("android_server")
                val filesDir = filesDir.absolutePath

                // Launch Flask server thread
                module.callAttr("start_flask_app", filesDir)

                // Poll local port 5000 until server is ready
                waitForServerReady("http://127.0.0.1:5000/")

            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this, "Failed to start EcoCycle Python backend: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun waitForServerReady(targetUrl: String) {
        val maxRetries = 30
        var attempts = 0
        var isReady = false

        while (attempts < maxRetries && !isReady) {
            try {
                val url = URL(targetUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 500
                connection.readTimeout = 500
                connection.requestMethod = "GET"
                val responseCode = connection.responseCode
                if (responseCode in 200..404) {
                    isReady = true
                }
                connection.disconnect()
            } catch (e: IOException) {
                attempts++
                Thread.sleep(300)
            }
        }

        Handler(Looper.getMainLooper()).post {
            if (isReady) {
                webView.loadUrl(targetUrl)
            } else {
                Toast.makeText(this, "Server startup timed out. Retrying load...", Toast.LENGTH_SHORT).show()
                webView.loadUrl(targetUrl)
            }
        }
    }
}
