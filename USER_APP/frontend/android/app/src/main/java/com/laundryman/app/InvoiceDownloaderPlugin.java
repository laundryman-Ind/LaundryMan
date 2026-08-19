package com.laundryman.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Saves base64-encoded invoice PDFs into Android's public Documents/LaundryMan/invoice/
 * directory, creating all required folders automatically.
 *
 * Provides fallback strategies (Direct Public Storage -> MediaStore -> App Scoped Storage)
 * and posts a system notification allowing the user to tap and view their invoice.
 */
@CapacitorPlugin(
    name = "InvoiceDownloader",
    permissions = {
        @Permission(alias = "writeExternal", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class InvoiceDownloaderPlugin extends Plugin {

    private static final String TAG = "InvoiceDL";
    private static final String CHANNEL_ID = "invoice_downloads";
    private static final String MIME_PDF = "application/pdf";
    private static final String INVOICE_SUBDIR = "LaundryMan/invoice";
    private static final int NOTIFICATION_ID_DOWNLOADING = 777001;

    /**
     * Show a lightweight "Saving invoice…" notification while the PDF generates.
     * Always resolves immediately so heavy operations never hang.
     */
    @PluginMethod
    public void showDownloading(PluginCall call) {
        String fileName = call.getString("fileName", "invoice.pdf");
        try {
            showDownloadingNotification(fileName);
        } catch (Exception e) {
            Log.w(TAG, "showDownloadingNotification warning: " + e.getMessage());
        }
        call.resolve();
    }

    /**
     * Save base64-encoded PDF to Documents/LaundryMan/invoice/, auto-creating
     * folders if they do not exist.
     */
    @PluginMethod
    public void savePdf(PluginCall call) {
        try {
            cancelDownloadingNotification();

            String data = call.getString("data");
            String fileName = call.getString("fileName", "LaundryMan_Invoice.pdf");

            if (data == null || data.trim().isEmpty()) {
                call.reject("Missing or empty PDF data");
                return;
            }

            // Clean base64 string if data URL prefix is attached
            if (data.contains(",")) {
                data = data.substring(data.indexOf(",") + 1);
            }

            byte[] pdfBytes;
            try {
                pdfBytes = Base64.decode(data, Base64.DEFAULT);
            } catch (Exception e) {
                Log.e(TAG, "Base64 decode failed", e);
                call.reject("Failed to decode PDF data: " + e.getMessage());
                return;
            }

            if (pdfBytes == null || pdfBytes.length == 0) {
                call.reject("Decoded PDF data is empty");
                return;
            }

            Context context = getContext();
            File savedFile = null;
            Uri resultUri = null;

            // Strategy 1: Direct File write to Public Documents/LaundryMan/invoice
            try {
                File docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
                File targetDir = new File(docsDir, INVOICE_SUBDIR);
                if (!targetDir.exists()) {
                    boolean created = targetDir.mkdirs();
                    Log.d(TAG, "Created directory " + targetDir.getAbsolutePath() + ": " + created);
                }

                File file = new File(targetDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(pdfBytes);
                    fos.flush();
                }

                if (file.exists() && file.length() > 0) {
                    savedFile = file;
                    // Trigger media scanner so the file is instantly indexed by the OS
                    MediaScannerConnection.scanFile(
                        context,
                        new String[]{ file.getAbsolutePath() },
                        new String[]{ MIME_PDF },
                        null
                    );
                    Log.d(TAG, "Successfully saved PDF directly to: " + file.getAbsolutePath());
                }
            } catch (Exception e) {
                Log.w(TAG, "Direct storage write failed, attempting MediaStore fallback: " + e.getMessage());
            }

            // Strategy 2: MediaStore API for Scoped Storage (Android 10+)
            if (savedFile == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, MIME_PDF);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/" + INVOICE_SUBDIR);
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                    Uri itemUri = context.getContentResolver().insert(collection, values);
                    if (itemUri != null) {
                        try (OutputStream os = context.getContentResolver().openOutputStream(itemUri)) {
                            if (os != null) {
                                os.write(pdfBytes);
                                os.flush();
                            }
                        }
                        values.clear();
                        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        context.getContentResolver().update(itemUri, values, null, null);
                        resultUri = itemUri;
                        Log.d(TAG, "Successfully saved PDF via MediaStore to: " + itemUri);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "MediaStore insert failed: " + e.getMessage());
                }
            }

            // Strategy 3: App External Files directory fallback
            if (savedFile == null && resultUri == null) {
                try {
                    File extDocs = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
                    File targetDir = new File(extDocs, INVOICE_SUBDIR);
                    if (!targetDir.exists()) {
                        targetDir.mkdirs();
                    }
                    File file = new File(targetDir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(pdfBytes);
                        fos.flush();
                    }
                    if (file.exists() && file.length() > 0) {
                        savedFile = file;
                        Log.d(TAG, "Saved PDF to app external docs directory: " + file.getAbsolutePath());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "App external storage fallback failed", e);
                }
            }

            // Check if any strategy succeeded
            if (savedFile == null && resultUri == null) {
                call.reject("Could not write invoice PDF to storage. Please check storage permissions.");
                return;
            }

            // Resolve viewable Content URI for notification & opening
            Uri viewableUri = resultUri;
            if (viewableUri == null && savedFile != null) {
                try {
                    viewableUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        savedFile
                    );
                } catch (Exception e) {
                    Log.w(TAG, "FileProvider URI resolution failed: " + e.getMessage());
                    viewableUri = Uri.fromFile(savedFile);
                }
            }

            // Post notification (safe, never fails the call)
            if (viewableUri != null) {
                try {
                    notifyDownloadComplete(fileName, viewableUri);
                } catch (Exception e) {
                    Log.w(TAG, "Could not post download notification: " + e.getMessage());
                }
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("fileName", fileName);
            result.put("folder", "Documents/" + INVOICE_SUBDIR);
            if (savedFile != null) {
                result.put("path", savedFile.getAbsolutePath());
            }
            if (viewableUri != null) {
                result.put("uri", viewableUri.toString());
            }
            call.resolve(result);

        } catch (Exception err) {
            Log.e(TAG, "Unexpected error in savePdf", err);
            call.reject("Unexpected error while saving invoice: " + err.getMessage());
        }
    }

    /**
     * Open an invoice PDF in the device's default PDF viewer.
     */
    @PluginMethod
    public void openPdf(PluginCall call) {
        try {
            String uriString = call.getString("uri");
            String path = call.getString("path");
            Context context = getContext();
            Uri viewUri = null;

            if (uriString != null && !uriString.isEmpty()) {
                viewUri = Uri.parse(uriString);
            } else if (path != null && !path.isEmpty()) {
                File file = new File(path);
                if (file.exists()) {
                    viewUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        file
                    );
                }
            }

            if (viewUri == null) {
                call.reject("Valid URI or file path is required to open PDF");
                return;
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(viewUri, MIME_PDF);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to open PDF", e);
            call.reject("Failed to open PDF: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Notifications Helpers
    // ------------------------------------------------------------------

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager)
                    getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Invoice downloads", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Shows notifications when an invoice is saved");
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void showDownloadingNotification(String fileName) {
        Context context = getContext();
        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        ensureChannel();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("LaundryMan")
            .setContentText("Saving " + fileName + "…")
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText("Generating invoice PDF…\nSaving to Documents/" + INVOICE_SUBDIR + "/"))
            .setOngoing(true)
            .setProgress(0, 0, true);

        nm.notify(NOTIFICATION_ID_DOWNLOADING, builder.build());
    }

    private void cancelDownloadingNotification() {
        NotificationManager nm = (NotificationManager)
                getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIFICATION_ID_DOWNLOADING);
        }
    }

    private void notifyDownloadComplete(String fileName, Uri uri) {
        Context context = getContext();
        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        ensureChannel();

        Intent open = new Intent(Intent.ACTION_VIEW);
        open.setDataAndType(uri, MIME_PDF);
        open.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("LaundryMan Invoice Downloaded")
            .setContentText("Saved to Documents/" + INVOICE_SUBDIR + "/")
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText(fileName + "\nSaved to Documents/" + INVOICE_SUBDIR + "/\nTap to view invoice."))
            .setAutoCancel(true)
            .setContentIntent(contentIntent);

        nm.notify(fileName.hashCode(), builder.build());
    }
}
