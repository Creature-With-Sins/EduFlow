# LeakTrace &bull; EduFunnel Intelligence Suite
> **Platform Analitik Corong Penerimaan Mahasiswa Baru (PMB) & Deteksi Kebocoran Iklan (*Drop-off Leak Detection*) Berbasis Webhook & n8n Automation Engine.**

Tugas Proyek: **Desain Interaksi Pengguna (DIP)**  
Studi Kasus: **Akademi Skill Nusantara (Klien)**  
Target Persona: **Pak Hendra — *Head of Marketing & Admission***

---

## 📁 Struktur Workspace Repositori (Tahap 2)

```text
LeakTrace/
├── docs/                 # Dokumentasi DIP (User Persona, Wireframe, Alur Interaksi)
│   ├── user-persona.md          # Profil Pak Hendra, skenario, pain points, kebutuhan DIP
│   ├── wireframe-interaction.md # Wireframe & rancangan desain interaksi frontend
│   └── alur-integrasi-n8n.md    # Arsitektur webhook, n8n flow & real-time sync
├── frontend/             # Codebase UI (Halaman Utama Agensi + Dashboard Klien)
│   ├── home.html                # Halaman Utama EduFlow Agency & Kalkulator Kebocoran
│   ├── index.html               # Sisi Klien: Dashboard Funnel Analytics Pak Hendra & Login
│   ├── css/
│   │   └── style.css            # Desain sistem global (Light minimalist, white dominant, blue accent)
│   ├── js/
│   │   ├── main.js              # Core dashboard engine & leak detection logic
│   │   └── data_funnel.js       # Dataset funnel & mock data
│   └── data_funnel.json
├── backend/              # Codebase API (Engine perhitungan Conversion Rate & Data Funnel)
│   ├── package.json             # Manifest dependensi Express
│   ├── server.js                # API GET /api/dashboard/funnel & POST /api/leads
│   └── README.md                # Panduan instalasi dan pengujian API backend
├── n8n-workflows/        # File JSON export dari workflow n8n
│   ├── pmb-lead-automation.json # Workflow webhook, auto-reply WA, alert Telegram & anti-leak
│   └── README.md                # Panduan import workflow ke n8n
├── README.md             # Panduan proyek, arsitektur webhook, & cara run
└── .gitignore            # Pengabaian file dependensi & log
```

---

## 👤 Tahap 1: User Persona

* **Nama:** Pak Hendra
* **Role:** *Head of Marketing & Admission* di Akademi Skill Nusantara
* **Skenario:** Mengelola kampanye berbayar **Google Ads** dan **Instagram Ads**. Membutuhkan tempat terpusat untuk memantau performa iklan dan melihat secara transparan di mana calon siswa keluar (*drop-off*).
* **Kebutuhan DIP:** Visualisasi corong instan tanpa perlu olah file Excel manual, disertai indikator warna merah mencolok pada titik kebocoran pendaftaran tertinggi.
* *Detail lengkap:* Lihat [`docs/user-persona.md`](docs/user-persona.md).

---

## 🖥️ Tahap 3: Front-End Development (Focus DIP)

Antarmuka terbagi menjadi dua sisi interaksi:

### A. Sisi Agensi & Edukasi Klien — Home Screen & Kalkulator Kebocoran (`frontend/home.html`)
* **Fungsi:** Halaman profil agensi EduFlow yang mendemonstrasikan transparansi analitik corong PMB dan kalkulator interaktif untuk memprediksi potensi pemborosan anggaran iklan.
* **Elemen Interaksi Utama:**
  1. **Hero & 4 Pilar Agensi:** Menyajikan value proposition EduFlow Agency dengan estetika *clean minimalist* (latar putih dominan dengan aksen biru `#2563eb`).
  2. **Interactive Funnel Leak Calculator:** Kalkulator interaktif dengan input anggaran iklan, biaya per klik (CPC), jumlah leads, dan siswa terdaftar.
  3. **Preset Cepat:** Tombol preset (Kampanye Kecil, Sedang, Agresif) untuk pengisian otomatis instan.
  4. **Dynamic Visualizer & BOCOR PARAH Alert:** Menampilkan persentase konversi per tahap secara visual dan memicu badge **"BOCOR PARAH"** berlatar merah teks putih kontras tinggi jika *drop-off* melebihi 75%.
  5. **Estimasi Kerugian & Rekomendasi:** Menghitung estimasi budget yang terbuang sia-sia akibat *drop-off* iklan beserta paket solusi EduFlow.

### B. Sisi Klien (Pak Hendra) — Dashboard Funnel Analytics (`frontend/index.html`)
* **Interactive Funnel Chart 4 Tahap:** Impresi Ads $\rightarrow$ Klik Link $\rightarrow$ Pengisi Form $\rightarrow$ Siswa Diterima.
* **Indicator & Leak Alert:** Titik kebocoran tertinggi otomatis disorot dengan **aksen warna merah menyala** (`.bar-fill.leak-alert`) dan banner peringatan:  
  `⚠️ Warning: Drop-off 85.2% terjadi dari Klik ke Form Pendaftaran!`
* **Filter Interaktif Komparasi:** Membandingkan performa antara **Google Ads vs Instagram Ads** secara *side-by-side* untuk pengambilan keputusan cepat.
* **Tabel Live Leads:** Menampilkan data pendaftar baru yang masuk secara *real-time*.
* **Mode Demo 1-Klik:** Login instan sebagai Pak Hendra tanpa perlu konfigurasi Supabase manual.

---

## ⚙️ Tahap 4: Back-End API & Integrasi n8n

### 1. Peran Back-End API (`backend/server.js`)
* **`GET /api/dashboard/funnel`:** Mengkalkulasi angka impresi, klik, dan conversion rate, serta mengidentifikasi *critical leak stage*.
* **`POST /api/leads`:** Menerima data pendaftaran dan meneruskannya ke n8n webhook.
* **`GET /api/leads`:** Mengambil daftar pendaftar terbaru.

### 2. Alur Automasi n8n (`n8n-workflows/pmb-lead-automation.json`)
```text
[Formulir PMB / Leads] ──(Webhook Event)──> [n8n Workflow Engine] ───┬──> [WA/Email Calon Siswa (Brosur)]
                                                                      ├──> [Notifikasi Telegram Pak Hendra]
                                                                      ├──> [Database / Google Sheets Sync]
                                                                      └──> [Wait 24 Jam -> Anti-Leak Reminder]
```
1. **Trigger Webhook:** Menerima event saat calon siswa submit formulir PMB.
2. **Instant Auto-Response (Nurturing):** Mengirim WhatsApp otomatis berisi tautan brosur digital dan salam hangat kampus.
3. **Internal Alert ke Pak Hendra:** Notifikasi Telegram kilat dengan data nama, no WA, dan channel iklan sumber.
4. **Data Syncing:** Memperbarui data pendaftar sehingga grafik dashboard bertambah secara *live*.
5. **Anti-Leak Automation (Wait 24 Jam):** Jika calon siswa belum menyelesaikan pembayaran registrasi setelah 24 jam, n8n otomatis mengirim pesan pengingat kuota beasiswa.

---

## 🚀 Cara Menjalankan Project

### 1. Menjalankan Frontend (UI Dashboard & Home Screen)
* Buka folder project di VS Code.
* Jalankan extension **Live Server**:
  * Buka `frontend/home.html` untuk melihat Home Screen EduFlow Agency & Kalkulator Kebocoran.
  * Buka `frontend/index.html` untuk melihat Auth & Dashboard Klien (Pak Hendra).
* *Tips Demo:* Pada halaman login dashboard (`index.html`), klik tombol **"⚡ Mode Demo: Masuk Sebagai Pak Hendra"** untuk masuk instan dengan 1 klik.
* *Tips Demo:* Pada halaman login dashboard, tersedia tombol **"⚡ Mode Demo: Masuk Sebagai Pak Hendra"** untuk masuk instan dengan 1 klik.

### 2. Menjalankan Backend API (Opsional)
```bash
cd backend
npm install
npm start
```
Server akan aktif di `http://localhost:3001`.

### 3. Mengimpor Workflow ke n8n
* Buka instance n8n (`http://localhost:5678` atau n8n Cloud).
* Klik menu **Workflows > Import from File**.
* Pilih file `n8n-workflows/pmb-lead-automation.json`.
* Aktifkan workflow.

---

## 📊 Tips Tambahan: GitHub Projects (Kanban Board)
Untuk bukti pengerjaan terstruktur kepada dosen, Anda dapat membuat **GitHub Projects (Kanban Board)** dengan 3 kolom:
* **To Do:** "Desain Wireframe Mobile Landing Page", "Konfigurasi SSL Webhook n8n".
* **In Progress:** "Implementasi Visualisasi Funnel 4 Tahap", "Pengujian Respon Pesan WhatsApp".
* **Done:** "User Persona Pak Hendra", "Setup Struktur Repositori", "Deteksi Titik Kebocoran Otomatis (Merah)", "Formulir Pendaftaran & Floating CTA".
