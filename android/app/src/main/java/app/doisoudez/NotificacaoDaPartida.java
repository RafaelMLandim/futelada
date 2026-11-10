package app.doisoudez;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Notificação da partida com o app minimizado ou a tela bloqueada: o cronômetro desce sozinho (quem conta é o
 * Android, não o app) e, no fim, a mesma notificação vira "Acabou o tempo!" com o apito.
 */
final class NotificacaoDaPartida {
    static final int NUMERO = 2010;
    static final String CANAL_DA_PARTIDA = "partida";
    static final String CANAL_DO_FIM = "fim-do-tempo";

    private NotificacaoDaPartida() {}

    static void criarCanais(Context contexto) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager gerente = contexto.getSystemService(NotificationManager.class);
        NotificationChannel partida = new NotificationChannel(CANAL_DA_PARTIDA, "Partida em andamento", NotificationManager.IMPORTANCE_LOW);
        partida.setDescription("Cronômetro da partida quando o app está minimizado");
        partida.setShowBadge(false);
        gerente.createNotificationChannel(partida);
        NotificationChannel fim = new NotificationChannel(CANAL_DO_FIM, "Fim do tempo", NotificationManager.IMPORTANCE_HIGH);
        fim.setDescription("Apito quando acaba o tempo da partida");
        Uri apito = Uri.parse("android.resource://" + contexto.getPackageName() + "/" + R.raw.apito_fim);
        AudioAttributes atributos = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        fim.setSound(apito, atributos);
        fim.enableVibration(true);
        fim.setVibrationPattern(new long[] { 0, 300, 150, 300, 150, 600 });
        gerente.createNotificationChannel(fim);
    }

    /** Tocar na notificação abre o app de volta na partida. */
    static PendingIntent abrirOApp(Context contexto) {
        Intent abrir = new Intent(contexto, MainActivity.class);
        abrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(contexto, 0, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** `fimEm` (hora em ms) desce sozinho na notificação; null = pausado (só o texto). */
    static void mostrar(Context contexto, String titulo, String texto, Long fimEm) {
        criarCanais(contexto);
        NotificationCompat.Builder notificacao = new NotificationCompat.Builder(contexto, CANAL_DA_PARTIDA)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(abrirOApp(contexto));
        if (fimEm != null) {
            notificacao.setWhen(fimEm).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true);
        } else {
            notificacao.setShowWhen(false);
        }
        publicar(contexto, notificacao);
    }

    static void fimDoTempo(Context contexto, String titulo, String texto) {
        criarCanais(contexto);
        NotificationCompat.Builder notificacao = new NotificationCompat.Builder(contexto, CANAL_DO_FIM)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(abrirOApp(contexto));
        // Android antigo (sem canais): som e vibração vão na própria notificação
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            notificacao.setSound(Uri.parse("android.resource://" + contexto.getPackageName() + "/" + R.raw.apito_fim))
                .setVibrate(new long[] { 0, 300, 150, 300, 150, 600 });
        }
        publicar(contexto, notificacao);
    }

    static void esconder(Context contexto) {
        NotificationManagerCompat.from(contexto).cancel(NUMERO);
    }

    private static void publicar(Context contexto, NotificationCompat.Builder notificacao) {
        NotificationManagerCompat gerente = NotificationManagerCompat.from(contexto);
        if (!gerente.areNotificationsEnabled()) return; // a pessoa não liberou as notificações
        try {
            gerente.notify(NUMERO, notificacao.build());
        } catch (SecurityException semPermissao) {
            // Android 13+ sem a permissão de notificações: segue sem a notificação
        }
    }
}
