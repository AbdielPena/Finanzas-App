package com.finanzapp.app.widget;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.os.Bundle;
import android.text.InputType;
import android.view.Window;
import android.view.WindowManager;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.finanzapp.app.R;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Activity tipo dialog que se abre desde el widget.
 * Pide monto + descripcion y guarda la transaccion via API en estado 'hold'
 * (sin cuenta asignada). Despues el usuario asigna la cuenta desde el
 * Pending Center de la app web.
 */
public class QuickTransactionActivity extends Activity {

    private static final String API_BASE = "https://apifi.abbypixel.com/api/v1";
    private static final String PREFS_CAPACITOR = "CapacitorStorage";
    private String tipo = "gasto";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Tipo de transaccion segun el deep link que abrio el activity
        String typeParam = null;
        if (getIntent() != null && getIntent().getData() != null) {
            typeParam = getIntent().getData().getQueryParameter("type");
        }
        if (typeParam != null && (typeParam.equals("ingreso") || typeParam.equals("gasto") || typeParam.equals("transferencia"))) {
            tipo = typeParam;
        }

        // Configura ventana tipo dialog
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        WindowManager.LayoutParams params = getWindow().getAttributes();
        params.gravity = Gravity.CENTER;
        params.width = WindowManager.LayoutParams.MATCH_PARENT;
        getWindow().setAttributes(params);

        setContentView(buildLayout());
    }

    private View buildLayout() {
        Context c = this;
        LinearLayout root = new LinearLayout(c);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        LinearLayout card = new LinearLayout(c);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(0xFF1a1a2e);
        card.setPadding(dp(24), dp(24), dp(24), dp(24));

        TextView title = new TextView(c);
        String label = tipo.equals("ingreso") ? "Nuevo Ingreso" : tipo.equals("transferencia") ? "Nueva Transferencia" : "Nuevo Gasto";
        title.setText(label + " (rapido)");
        title.setTextSize(20);
        title.setTextColor(0xFFFFFFFF);
        title.setPadding(0, 0, 0, dp(8));

        TextView subtitle = new TextView(c);
        subtitle.setText("Se guardara como pendiente. Asigna la cuenta luego desde la app.");
        subtitle.setTextSize(12);
        subtitle.setTextColor(0xAAFFFFFF);
        subtitle.setPadding(0, 0, 0, dp(16));

        final EditText amount = new EditText(c);
        amount.setHint("Monto (RD$)");
        amount.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        amount.setTextColor(0xFFFFFFFF);
        amount.setHintTextColor(0x88FFFFFF);
        amount.setBackgroundColor(0x33FFFFFF);
        amount.setPadding(dp(12), dp(12), dp(12), dp(12));

        final EditText desc = new EditText(c);
        desc.setHint("Descripcion (opcional)");
        desc.setTextColor(0xFFFFFFFF);
        desc.setHintTextColor(0x88FFFFFF);
        desc.setBackgroundColor(0x33FFFFFF);
        desc.setPadding(dp(12), dp(12), dp(12), dp(12));
        LinearLayout.LayoutParams lpDesc = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lpDesc.topMargin = dp(8);
        desc.setLayoutParams(lpDesc);

        LinearLayout buttonRow = new LinearLayout(c);
        buttonRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams lpRow = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lpRow.topMargin = dp(16);
        buttonRow.setLayoutParams(lpRow);

        Button cancel = new Button(c);
        cancel.setText("Cancelar");
        cancel.setBackgroundColor(0x33FFFFFF);
        cancel.setTextColor(0xFFFFFFFF);
        LinearLayout.LayoutParams lpCancel = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        lpCancel.rightMargin = dp(8);
        cancel.setLayoutParams(lpCancel);
        cancel.setOnClickListener(v -> finish());

        Button save = new Button(c);
        save.setText("Guardar");
        int color = tipo.equals("ingreso") ? 0xFF22c55e : tipo.equals("transferencia") ? 0xFF3b82f6 : 0xFFef4444;
        save.setBackgroundColor(color);
        save.setTextColor(0xFFFFFFFF);
        LinearLayout.LayoutParams lpSave = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        save.setLayoutParams(lpSave);
        save.setOnClickListener(v -> {
            String montoStr = amount.getText().toString().trim();
            if (montoStr.isEmpty()) {
                Toast.makeText(c, "Ingresa un monto", Toast.LENGTH_SHORT).show();
                return;
            }
            double monto;
            try { monto = Double.parseDouble(montoStr); } catch (Exception e) {
                Toast.makeText(c, "Monto invalido", Toast.LENGTH_SHORT).show();
                return;
            }
            String descripcion = desc.getText().toString().trim();
            if (descripcion.isEmpty()) descripcion = "Quick " + tipo;
            save.setEnabled(false);
            save.setText("Guardando...");
            new SaveTransactionTask(c, tipo, monto, descripcion).execute();
        });

        buttonRow.addView(cancel);
        buttonRow.addView(save);

        card.addView(title);
        card.addView(subtitle);
        card.addView(amount);
        card.addView(desc);
        card.addView(buttonRow);
        root.addView(card);
        amount.requestFocus();
        return root;
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }

    private class SaveTransactionTask extends AsyncTask<Void, Void, String> {
        private final Context ctx;
        private final String tipo;
        private final double monto;
        private final String descripcion;

        SaveTransactionTask(Context c, String t, double m, String d) {
            this.ctx = c;
            this.tipo = t;
            this.monto = m;
            this.descripcion = d;
        }

        @Override
        protected String doInBackground(Void... voids) {
            try {
                SharedPreferences prefs = ctx.getSharedPreferences(PREFS_CAPACITOR, Context.MODE_PRIVATE);
                String token = prefs.getString("jwt_access", null);
                String wsId = prefs.getString("workspace_id", null);
                if (token == null || wsId == null) {
                    return "ERROR:Inicia sesion en la app primero";
                }

                URL url = new URL(API_BASE + "/transactions");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("X-Workspace-Id", wsId);
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);

                JSONObject body = new JSONObject();
                body.put("tipo", tipo);
                body.put("monto", monto);
                body.put("descripcion", descripcion);
                body.put("fecha", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
                body.put("estado", "hold");

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes("UTF-8"));
                os.close();

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    return "OK";
                }
                StringBuilder err = new StringBuilder();
                try {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                    String l;
                    while ((l = br.readLine()) != null) err.append(l);
                } catch (Exception ignored) {}
                return "ERROR:" + code + " " + err.toString();
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        }

        @Override
        protected void onPostExecute(String result) {
            if ("OK".equals(result)) {
                Toast.makeText(ctx, "Transaccion guardada en pendientes", Toast.LENGTH_LONG).show();
                finish();
            } else {
                String msg = result != null ? result.replaceFirst("ERROR:", "") : "Error desconocido";
                Toast.makeText(ctx, "Error: " + msg, Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}
