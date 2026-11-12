# Backend API Engine - LeakTrace

Backend API ini bertindak sebagai engine kalkulasi **Funnel Conversion Rate**, deteksi otomatis **Titik Kebocoran (Leak Alert)**, dan **Lead Ingestion / Webhook Relay ke n8n**.

---

## Fitur API

1. **`GET /api/dashboard/funnel`**:
   * Menghitung rasio konversi 4 tahap: `Impresi Ads` $\rightarrow$ `Klik Link` $\rightarrow$ `Pengisi Form` $\rightarrow$ `Siswa Diterima`.
   * Otomatis mendeteksi tahap dengan persentase *drop-off* tertinggi (`is_critical_leak: true`).
   * Mengembalikan komparasi antara **Google Ads vs Instagram Ads**.

2. **`POST /api/leads`**:
   * Menerima kiriman pendaftaran dari Landing Page PMB.
   * Meneruskan payload ke **n8n Webhook** (`N8N_WEBHOOK_URL`) secara otomatis.

3. **`GET /api/leads`**:
   * Mengambil daftar pendaftar terbaru untuk ditampilkan pada tabel leads.

---

## Cara Menjalankan Backend

1. Buka terminal di folder `backend/`:
   ```bash
   cd backend
   ```
2. Install dependency:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
   Server akan berjalan di `http://localhost:3001`.

Opsional: Atur URL webhook n8n via environment variable:
```bash
set N8N_WEBHOOK_URL=http://localhost:5678/webhook/pmb-lead
npm start
```
