package com.twagirumukiza.radar;

import android.app.*;
import android.os.*;
import android.provider.MediaStore;
import android.widget.Toast;
import android.content.*;
import android.content.ContentValues;
import android.net.Uri;
import android.webkit.*;
import android.view.*;
import android.graphics.Color;
import android.content.pm.ActivityInfo;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
  private WebView web;
  private boolean pageReady=false;
  @Override public void onCreate(Bundle b){super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    immersive();
    web=new WebView(this); web.setOverScrollMode(View.OVER_SCROLL_NEVER); web.setVerticalScrollBarEnabled(false); web.setHorizontalScrollBarEnabled(false); setContentView(web);
    WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(true); s.setMediaPlaybackRequiresUserGesture(false);
    web.setBackgroundColor(0xff020804); web.setWebViewClient(new WebViewClient(){ @Override public void onPageFinished(WebView v,String url){pageReady=true; immersive();} }); web.setWebChromeClient(new WebChromeClient());
    web.addJavascriptInterface(new Bridge(),"AndroidBridge");
    web.loadUrl("file:///android_asset/game/index.html");
  }
  private void immersive(){
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);
    if(Build.VERSION.SDK_INT>=30){
      getWindow().setStatusBarColor(Color.TRANSPARENT); getWindow().setNavigationBarColor(Color.TRANSPARENT);
      getWindow().getInsetsController().hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());
      getWindow().getInsetsController().setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }else getWindow().getDecorView().setSystemUiVisibility(5894|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }
  @Override public void onWindowFocusChanged(boolean h){super.onWindowFocusChanged(h);if(h)immersive();}
  @Override public void onBackPressed(){
    web.evaluateJavascript("(window.radarAndroidBack?window.radarAndroidBack():'exit')", v->{ if(v==null||v.contains("exit")) super.onBackPressed(); });
  }
  @Override protected void onPause(){ if(web!=null){web.evaluateJavascript("try{persistGame(true)}catch(e){}",null);web.onPause();} super.onPause(); }
  @Override protected void onResume(){ super.onResume(); if(web!=null)web.onResume(); immersive(); }
  public class Bridge {
    @JavascriptInterface public void haptic(String kind){ runOnUiThread(()->{
      Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE); if(v==null||!v.hasVibrator())return;
      long[] pattern; int amp;
      if("impact".equals(kind)){pattern=new long[]{0,70,45,120};amp=220;}
      else if("hit".equals(kind)){pattern=new long[]{0,28,22,45};amp=170;}
      else if("shot".equals(kind)){pattern=new long[]{0,16};amp=105;}
      else {pattern=new long[]{0,10};amp=80;}
      if(Build.VERSION.SDK_INT>=26)v.vibrate(VibrationEffect.createWaveform(pattern,-1)); else v.vibrate(pattern,-1);
    }); }
    @JavascriptInterface public void toast(String text){runOnUiThread(()->Toast.makeText(MainActivity.this,text,Toast.LENGTH_SHORT).show());}
    @JavascriptInterface public String deviceInfo(){return Build.MANUFACTURER+" "+Build.MODEL+" / Android "+Build.VERSION.RELEASE;}
    @JavascriptInterface public void saveJson(String filename,String content){
      try{
        ContentValues cv=new ContentValues(); cv.put(MediaStore.Downloads.DISPLAY_NAME,filename); cv.put(MediaStore.Downloads.MIME_TYPE,"application/json"); cv.put(MediaStore.Downloads.RELATIVE_PATH,"Download/Radar");
        Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,cv); if(uri==null)return;
        try(OutputStream out=getContentResolver().openOutputStream(uri)){out.write(content.getBytes(StandardCharsets.UTF_8));}
        runOnUiThread(()->Toast.makeText(MainActivity.this,"Export enregistré dans Téléchargements/Radar",Toast.LENGTH_LONG).show());
      }catch(Exception e){runOnUiThread(()->Toast.makeText(MainActivity.this,"Échec de l’export",Toast.LENGTH_SHORT).show());}
    }
  }
}
