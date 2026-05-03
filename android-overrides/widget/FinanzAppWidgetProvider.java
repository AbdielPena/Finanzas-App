package com.finanzapp.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import com.finanzapp.app.MainActivity;
import com.finanzapp.app.R;

/**
 * Widget de FinanzApp - acceso rapido para registrar transacciones.
 *
 * Estrategia: cada boton dispara un deep link a la app principal con el tipo
 * de transaccion preseleccionado. La app abre el modal "Nueva Transaccion"
 * pre-rellenado segun el botton tocado.
 *
 * Esto evita necesidad de meter JWT/credenciales en el widget (mas seguro)
 * y aprovecha toda la logica de validacion existente en la web app.
 */
public class FinanzAppWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "finanzapp_widget_prefs";
    private static final String PREF_BALANCE = "saldo_total";
    private static final String PREF_LAST_SYNC = "ultimo_sync";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Primer widget agregado
    }

    @Override
    public void onDisabled(Context context) {
        // Ultimo widget removido
    }

    static void updateWidget(Context context, AppWidgetManager mgr, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String balance = prefs.getString(PREF_BALANCE, "RD$0.00");
        String lastSync = prefs.getString(PREF_LAST_SYNC, "Sin sincronizar");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_finanzapp);
        views.setTextViewText(R.id.widget_balance, balance);
        views.setTextViewText(R.id.widget_last_sync, lastSync);

        // Botones de transaccion: abren dialog rapido NATIVO (NO la app completa)
        views.setOnClickPendingIntent(R.id.btn_ingreso,
            buildQuickIntent(context, "ingreso", appWidgetId * 10 + 1));
        views.setOnClickPendingIntent(R.id.btn_gasto,
            buildQuickIntent(context, "gasto", appWidgetId * 10 + 2));
        views.setOnClickPendingIntent(R.id.btn_transferencia,
            buildQuickIntent(context, "transferencia", appWidgetId * 10 + 3));
        views.setOnClickPendingIntent(R.id.btn_open,
            buildDeepLinkIntent(context, "dashboard", appWidgetId * 10 + 4));

        // Click en el balance abre la app al dashboard
        views.setOnClickPendingIntent(R.id.widget_balance,
            buildDeepLinkIntent(context, "dashboard", appWidgetId * 10 + 5));

        mgr.updateAppWidget(appWidgetId, views);
    }

    /**
     * Construye un PendingIntent que abre la app con un deep link
     * tipo: finanzapp://action?type=ingreso
     */
    private static PendingIntent buildDeepLinkIntent(Context context, String type, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("finanzapp://action?type=" + type));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    /**
     * Abre la QuickTransactionActivity (dialog flotante NATIVO) que guarda
     * la transaccion en estado HOLD via API, sin abrir la app principal.
     * El usuario asigna la cuenta despues desde el Pending Center.
     */
    private static PendingIntent buildQuickIntent(Context context, String type, int requestCode) {
        Intent intent = new Intent(context, QuickTransactionActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("finanzapp-quick://action?type=" + type));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    /**
     * Llamado desde el JS (via plugin custom o BroadcastReceiver) para
     * actualizar el saldo mostrado en todos los widgets activos.
     */
    public static void refreshAllWidgets(Context context, String balance) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putString(PREF_BALANCE, balance);
        editor.putString(PREF_LAST_SYNC, "Hace un momento");
        editor.apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, FinanzAppWidgetProvider.class));
        for (int id : ids) {
            updateWidget(context, mgr, id);
        }
    }
}
