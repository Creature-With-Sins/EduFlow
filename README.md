# Dimension3D Studio &bull; Funnel Analytics & Deal Intelligence Suite
> **Sistem Internal Monitoring Funnel Bisnis Jasa 3D Desain & Deteksi Titik Kebocoran Iklan (*Drop-off Leak Detection*) Berbasis Webhook & Browser Local Storage.**

Bisnis: **Studio Jasa 3D Desain, Architectural Visualization & Commercial CGI Animation**  
Target Pengguna: **Lead 3D Artist / Studio Director (Pemilik Studio)**  
Teknologi: **Vanilla HTML5, Modern CSS3, JavaScript ES6+, Chart.js, Express.js Backend & Vercel Serverless**

---

## 📁 Struktur Workspace Repositori

```text
Dimension3D/
├── docs/                 # Dokumentasi Arsitektur & Alur Interaksi
│   ├── user-persona.md          # Profil Lead 3D Artist, skenario bisnis, & kebutuhan analitik
│   ├── wireframe-interaction.md # Wireframe & rancangan desain interaksi frontend
│   └── alur-integrasi-n8n.md    # Arsitektur webhook, n8n flow & real-time sync
├── frontend/             # Codebase UI (Halaman Utama Akses Studio & Dashboard)
│   ├── index.html               # Gerbang Login/Register & Dashboard Funnel Analytics Studio 3D
│   ├── css/
│   │   └── style.css            # Desain sistem global (Light minimalist, white dominant, blue accent)
│   ├── js/
│   │   ├── main.js              # Core 4-stage funnel engine, leak detection logic & localStorage auth
│   │   └── data_funnel.js       # Dataset funnel & mock data 3D design
│   └── data_funnel.json
├── backend/              # Codebase API (Engine kalkulasi Funnel & In-memory Store)
│   ├── package.json             # Manifest dependensi Express
│   ├── server.js                # API GET /api/dashboard/funnel & POST /api/leads, auth endpoints
│   └── README.md                # Panduan instalasi dan pengujian API backend
├── n8n-workflows/        # File JSON export dari workflow n8n
│   ├── pmb-lead-automation.json # Workflow webhook, auto-reply WA, alert Telegram & anti-leak
│   └── README.md                # Panduan import workflow ke n8n
├── public/               # Direktori aset statis produksi Vercel (Sinkronisasi frontend)
├── api/
│   └── index.js                 # Adapter Vercel Serverless Function
├── vercel.json           # Konfigurasi routing & rewrites anti "Cannot GET /"
├── package.json          # Root package manifest
├── README.md             # Panduan proyek & cara deploy
└── .gitignore            # Pengabaian file dependensi & log
```

---

## 🎯 4 Tahapan Corong (Funnel) Bisnis Jasa 3D Desain

1. **1. Impresi Iklan (IG/Google Ads):** Total paparan iklan berbayar (Instagram Reels 3D portfolio & Google Ads Search B2B).
2. **2. Pengunjung Web 3D:** Calon klien yang mengklik iklan dan mengunjungi website galeri portofolio studio.
3. **3. Interaksi Kalkulator Harga:** Pengunjung yang mencoba kalkulator estimasi biaya jasa 3D (memilih jenis render, resolusi, durasi animasi).
4. **4. Request Brief / Deal Proyek:** Calon klien yang mengirimkan formulir brief proyek, mengunggah referensi, dan menyepakati uang muka (DP 50%).

---

## 🚨 Fitur Unggulan Sistem

### 1. Deteksi Titik Kebocoran Otomatis (BOCOR PARAH Alert)
* Setiap transisi antar-tahap dihitung persentase penurunannya (*drop-off rate*).
* Jika *drop-off* melebihi 70% atau merupakan yang tertinggi, sistem otomatis menyalakan badge merah menyala **`🚨 BOCOR PARAH TERDETEKSI`** beserta rekomendasi taktis khusus bisnis 3D (misal: penambahan tombol konsultasi WhatsApp instan di hasil kalkulator harga).

### 2. Komparasi Head-to-Head Iklan
* **Google Ads (High Intent B2B Search):** Menganalisis klien korporat dengan kebutuhan mendesak (konversi tinggi).
* **Instagram Ads (Reels 3D Portfolio):** Menganalisis audiens visual yang tinggi di impresi namun rawan keluar sebelum menghitung harga.

### 3. Log Interaksi UX & Leads Masuk (Kalkulator 3D)
* Tabel pencatatan riwayat calon klien yang melakukan simulasi harga di website (Jenis layanan 3D: ArchViz, Product Animation, Game Asset, Packaging; spesifikasi render; estimasi harga; dan status deal).
* Dilengkapi tombol modal **"➕ Tambah Simulasi Lead Baru"** untuk pengujian langsung (*live demo test*) yang langsung tersimpan di browser `localStorage`.

### 4. 100% Anti Error di Vercel (Anti `Failed to fetch` & Anti `Cannot GET /`)
* **Local Storage First:** Sistem autentikasi (Register, Login, Mode Demo) dan pencatatan leads didukung `localStorage` browser sebagai penyimpanan lokal utama sehingga bebas error jaringan.
* **Vercel Routing:** File `vercel.json` mengarahkan rute root `/` langsung ke `index.html` dan `/api/*` ke Express Serverless Function.

---

## 🚀 Cara Menjalankan Project

### 1. Menjalankan Frontend (Lokal)
* Buka folder project di VS Code.
* Jalankan extension **Live Server** pada file `frontend/index.html`.
* Klik tombol **"⚡ Mode Demo: Masuk Sebagai Lead 3D Artist"** untuk langsung masuk ke dashboard dalam 1 klik.

### 2. Menjalankan Backend API (Lokal)
```bash
npm install
npm start
```
Server akan aktif di `http://localhost:3001` (melayani API corong dan file statis).

### 3. Deploy ke Vercel (Production)
Tinggal commit dan push ke GitHub repository:
```bash
git add .
git commit -m "feat: transform funnel analytics to 3D design studio business"
git push
```
Vercel akan otomatis melakukan build dan menyajikan dashboard pada domain Vercel Anda secara instan.
