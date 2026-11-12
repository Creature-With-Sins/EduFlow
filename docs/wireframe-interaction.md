# Dokumentasi Desain Interaksi Pengguna (DIP) - Wireframe & Alur Interaksi

## Tahap 3: Front-End Interaction Architecture

Dokumen ini menjelaskan rancangan tata letak (*wireframe layout*), hierarki visual, dan alur interaksi pengguna untuk dua sisi antarmuka:
1. **Sisi Calon Siswa (Landing Page PMB)**
2. **Sisi Klien / Pak Hendra (Dashboard Funnel Analytics - Core DIP)**

---

### A. Sisi Calon Siswa — Landing Page PMB
Landing page dirancang dengan pendekatan *high-conversion & mobile-first* untuk menangkap trafik dari Google Ads dan Instagram Ads.

#### 1. Wireframe Layout
```text
+--------------------------------------------------------------+
| [Logo Akademi Skill Nusantara]           [Button: Daftar Sekarang] |
+--------------------------------------------------------------+
|                                                              |
|   HERO SECTION                                               |
|   "Wujudkan Karir Digital Impianmu Bersama Kami"             |
|   [Subheadline: Beasiswa s/d 70% Batch 2026]                 |
|                                                              |
|   +-----------------------+      +-------------------------+ |
|   | SLIDER / SELECTOR     |      | FORM PENDAFTARAN PMB    | |
|   | Pilih Program Studi:  |      | Nama Lengkap            | |
|   | [< Fullstack Dev >]   |      | No. WhatsApp (Aktif)    | |
|   | Detail: Durasi 6 Bln  |      | Email                   | |
|   | Kuota Sisa: 3 Slot    |      | Program Pilihan         | |
|   | Estimasi Biaya/Diskon |      | [SUBMIT PENDAFTARAN]    | |
|   +-----------------------+      +-------------------------+ |
|                                                              |
+--------------------------------------------------------------+
| [Floating WhatsApp CTA Button: Tanya Konselor 24/7 (Pojok Kanan Bawah)]
+--------------------------------------------------------------+
```

#### 2. Elemen Interaksi:
* **Interactive Slider / Card Carousel:** Calon siswa menggeser pilihan prodi (Fullstack Web Dev, Data Science, Digital Marketing, UI/UX Design). Biaya kursus, kurikulum, dan sisa kuota berubah secara dinamis sesuai pilihan.
* **Form Pendaftaran Singkat:** Meminimalisir *friction* (hanya meminta nama, WhatsApp, email, dan program studi).
* **Instant Submission Feedback:** Ketika tombol submit ditekan, modal sukses muncul seketika menginformasikan bahwa brosur telah dikirimkan via WhatsApp dan email.
* **Floating CTA WhatsApp:** Tombol melayang di pojok kanan bawah yang selalu terlihat (*sticky*), membuka obrolan langsung dengan konselor PMB via WhatsApp API.

---

### B. Sisi Klien (Pak Hendra) — Dashboard Funnel Analytics (Core DIP)

Dashboard dirancang untuk memberikan visualisasi instan dalam hitungan detik tanpa membuka spreadsheet.

#### 1. Wireframe Layout
```text
+-------------------------------------------------------------------------+
| [LeakTrace Logo] | Akademi Skill Nusantara       [User: Pak Hendra ▼]   |
+------------------+------------------------------------------------------+
| [Overview]       | HEADER CONTROLS:                                     |
| [Channel Compare]| Channel: [Instagram Ads vs Google Ads ▼]  Range: [7D ▼] |
| [Funnel Depth]   +------------------------------------------------------+
| [Leads Table]    | METRIC CARDS:                                        |
|                  | [ Total Impresi ] [ Total Klik ] [ Form ] [ Diterima]|
|                  +------------------------------------------------------+
|                  | ⚠️ LEAK ALERT BANNER (CRITICAL DROP-OFF DETECTED):    |
|                  | "Warning: Drop-off 85.2% terjadi dari Klik ke Form!  |
|                  |  Rekomendasi: Perbaiki kecepatan loading landing page"|
|                  +------------------------------------------------------+
|                  | INTERACTIVE FUNNEL CHART:                            |
|                  | 1. Impresi Ads     : ████████████████████ 120,000    |
|                  |    │ (Drop: 90%)                                     |
|                  | 2. Klik Link       : ████████ 12,000                 |
|                  |    │ ⚠️ (CRITICAL DROP: 85.2% - HIGHLIGHT MERAH)     |
|                  | 3. Pengisi Form    : ███ 1,776                       |
|                  |    │ (Drop: 45%)                                     |
|                  | 4. Siswa Diterima  : █ 976                            |
|                  +------------------------------------------------------+
|                  | COMPARISON CHART: Google Ads vs Instagram Ads        |
+------------------+------------------------------------------------------+
```

#### 2. Aturan Desain Interaksi (DIP Principles):
1. **Titik Kebocoran Tertinggi Diberi Aksen Merah:**
   Sistem secara otomatis mendeteksi tahapan dengan selisih penurunan (*drop-off rate*) paling tinggi dan menerapkan warna aksen bahaya (*crimson red / `#EF4444`*) beserta ikon peringatan dan banner diagnosa otomatis.
2. **Filter Interaktif Instan (Zero Reload):**
   Memilih channel (Google Ads vs Instagram Ads) langsung memperbarui funnel, persentase drop-off, dan kartu metrik tanpa reload halaman.
3. **Animasi Bar Corong Responsif:**
   Bar corong memanjang secara bertahap saat halaman dimuat (*smooth CSS transition*) untuk memudahkan otak manusia membandingkan rasio volume pengunjung antar tahap.
