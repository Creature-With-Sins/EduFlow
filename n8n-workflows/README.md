# n8n Workflows - PMB Lead Automation & Anti-Leak

Direktori ini berisi file konfigurasi workflow ekspor dari **n8n** untuk mendukung proses otomasi pada startup **LeakTrace (EduFunnel)**.

---

## File Workflow
* `pmb-lead-automation.json`: Workflow lengkap untuk penerimaan lead PMB dari Webhook Landing Page, pengiriman respon otomatis WhatsApp ke calon siswa, notifikasi kilat ke Pak Hendra via Telegram, sinkronisasi Google Sheets, dan automasi *follow-up* setelah 24 jam untuk mengatasi *drop-off* pendaftaran (*Anti-Leak Automation*).

---

## Cara Import ke n8n
1. Buka instance **n8n** kamu (bisa via n8n Cloud atau local self-hosted di `http://localhost:5678`).
2. Masuk ke menu **Workflows**.
3. Klik tombol **Add Workflow** / icon titik tiga di pojok kanan atas, lalu pilih **Import from File**.
4. Pilih file `pmb-lead-automation.json`.
5. Sesuaikan credentials node:
   * **Webhook URL**: Salin Webhook URL yang digenerate oleh n8n ke konfigurasi frontend/backend (`/api/leads` atau landing page).
   * **WhatsApp / Telegram Credential**: Masukkan bot token & chat ID untuk pengiriman pesan.
6. Klik **Activate** di pojok kanan atas n8n.
