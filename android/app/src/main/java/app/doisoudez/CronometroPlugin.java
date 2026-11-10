package app.doisoudez;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.app.AlarmManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Ponte com o app (src/utils/cronometroNoCelular.ts): mostra o cronômetro na notificação quando o app sai da tela
 * e agenda o apito do fim; ao voltar para o app, some tudo (lá dentro o app já apita e mostra o relógio).
 */
@CapacitorPlugin(
    name = "Cronometro",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notificacoes") }
)
public class CronometroPlugin extends Plugin {

    @PluginMethod
    public void mostrar(PluginCall chamada) {
        String titulo = chamada.getString("titulo", "Dois ou Dez");
        String texto = chamada.getString("texto", "");
        Long fimEm = chamada.getLong("fimEm");
        boolean apitar = Boolean.TRUE.equals(chamada.getBoolean("apitar", false));
        String tituloDoFim = chamada.getString("tituloDoFim", "Acabou o tempo!");
        NotificacaoDaPartida.mostrar(getContext(), titulo, texto, fimEm);
        ApitoDoFim.cancelar(getContext());
        if (fimEm != null && apitar && fimEm > System.currentTimeMillis()) ApitoDoFim.agendar(getContext(), fimEm, tituloDoFim, texto);
        chamada.resolve();
    }

    @PluginMethod
    public void esconder(PluginCall chamada) {
        ApitoDoFim.cancelar(getContext());
        NotificacaoDaPartida.esconder(getContext());
        chamada.resolve();
    }

    /** Android 13+: pede para mostrar notificações (uma vez; quem negou segue sem). */
    @PluginMethod
    public void pedirPermissao(PluginCall chamada) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notificacoes") == PermissionState.GRANTED) {
            chamada.resolve(situacao());
            return;
        }
        requestPermissionForAlias("notificacoes", chamada, "depoisDaPermissao");
    }

    @PermissionCallback
    private void depoisDaPermissao(PluginCall chamada) {
        chamada.resolve(situacao());
    }

    /** Abre a tela do Android para liberar o alarme exato (Android 12+), para o apito tocar na hora certa. */
    @PluginMethod
    public void liberarAlarmeExato(PluginCall chamada) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent ajustes = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            ajustes.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(ajustes);
        }
        chamada.resolve(situacao());
    }

    @PluginMethod
    public void situacao(PluginCall chamada) {
        chamada.resolve(situacao());
    }

    private JSObject situacao() {
        JSObject resposta = new JSObject();
        boolean notificacoes = androidx.core.app.NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        boolean alarmeExato = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getContext().getSystemService(AlarmManager.class).canScheduleExactAlarms();
        resposta.put("notificacoes", notificacoes);
        resposta.put("alarmeExato", alarmeExato);
        return resposta;
    }
}
