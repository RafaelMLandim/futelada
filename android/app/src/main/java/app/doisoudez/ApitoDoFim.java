package app.doisoudez;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Alarme agendado para a hora do fim do tempo: toca o apito mesmo com o app minimizado, fechado ou a tela bloqueada. */
public class ApitoDoFim extends BroadcastReceiver {
    private static final String TITULO = "titulo";
    private static final String TEXTO = "texto";

    @Override
    public void onReceive(Context contexto, Intent pedido) {
        NotificacaoDaPartida.fimDoTempo(contexto, pedido.getStringExtra(TITULO), pedido.getStringExtra(TEXTO));
    }

    private static PendingIntent alarme(Context contexto, String titulo, String texto) {
        Intent pedido = new Intent(contexto, ApitoDoFim.class);
        if (titulo != null) pedido.putExtra(TITULO, titulo);
        if (texto != null) pedido.putExtra(TEXTO, texto);
        return PendingIntent.getBroadcast(contexto, 0, pedido, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void agendar(Context contexto, long fimEm, String titulo, String texto) {
        AlarmManager relogio = contexto.getSystemService(AlarmManager.class);
        PendingIntent quando = alarme(contexto, titulo, texto);
        boolean exato = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || relogio.canScheduleExactAlarms();
        if (exato) {
            relogio.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fimEm, quando);
        } else {
            // sem a permissão de alarme exato, o Android pode atrasar um pouco
            relogio.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fimEm, quando);
        }
    }

    static void cancelar(Context contexto) {
        contexto.getSystemService(AlarmManager.class).cancel(alarme(contexto, null, null));
    }
}
