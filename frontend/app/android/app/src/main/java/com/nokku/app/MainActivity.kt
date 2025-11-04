package com.nokku.app // これはそのまま

import android.os.Bundle; // ← 追記
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  // ↓↓↓ このメソッドを丸ごと追記 ↓↓↓
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null) // ★重要★ "null" を渡す (Splash Screen対応のため)
  }
  // ↑↑↑ ここまで追記 ↑↑↑

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Nokku" // ← "app" から "Nokku" に変更（推奨）

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture (Fabric) with a single boolean flags (fabricEnabled)
   * and Eager Components (paperEnabled) with another boolean flag.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
      this,
      mainComponentName,
      fabricEnabled,
    )
  }
}