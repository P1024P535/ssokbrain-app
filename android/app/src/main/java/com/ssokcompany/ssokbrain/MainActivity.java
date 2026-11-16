package com.ssokcompany.ssokbrain;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 기기의 글자 크기 설정과 상관없이 화면 배치가 같게 보이도록 고정합니다.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
