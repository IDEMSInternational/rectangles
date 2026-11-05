package international.idems.games.rectangles;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // The app is laid out for one screen size and scaled to fit (see
        // puzzle-stage in games-common-core): the phone's text size setting
        // would break that layout, so it's ignored.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
