package app.doisoudez;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle estadoSalvo) {
        registerPlugin(CronometroPlugin.class); // cronômetro na notificação e apito do fim (app minimizado)
        super.onCreate(estadoSalvo);
    }
}
