# Dokumentasi Desain Interaksi Pengguna (DIP) - User Persona

## Tahap 1: User Persona (Target Klien Lembaga Pendidikan)

Dokumentasi ini mendefinisikan persona utama dari pengguna dashboard startup **LeakTrace (EduFunnel)**.

---

### Profil User (Fiksi)
* **Nama Lengkap:** Hendra Gunawan, S.Kom., M.M. (Pak Hendra)
* **Jabatan / Role:** *Head of Marketing & Admission*
* **Institusi:** Akademi Skill Nusantara
* **Karakteristik:** Berorientasi pada hasil dan ROI (Return on Investment) iklan, sibuk, tidak memiliki waktu untuk mengolah data mentah di Excel setiap hari, membutuhkan wawasan cepat dan visual yang actionable.

---

### Skenario Penggunaan
Pak Hendra mempercayakan pengelolaan **Google Ads** dan **Instagram Ads** lembaganya ke startup LeakTrace. Kampanye iklan dijalankan dengan tujuan mendatangkan calon mahasiswa baru (PMB).

Setiap pagi sebelum rapat koordinasi pimpinan, Pak Hendra membuka dashboard LeakTrace untuk:
1. Memantau performa harian dari kedua channel iklan utama (Google Ads vs Instagram Ads).
2. Melihat secara transparan di mana calon mahasiswa berhenti atau keluar (*drop-off*) di setiap tahapan pendaftaran.
3. Mengetahui apakah strategi kreatif iklan, penawaran beasiswa, atau form pendaftaran perlu direvisi.

---

### Pain Points & Tantangan Pak Hendra
1. **Data Tercecer & Manual:** Sebelumnya tim harus mengunduh CSV/Excel dari Google Ads Manager dan Meta Business Suite lalu menggabungkannya secara manual, memakan waktu 2-3 jam per minggu.
2. **Blind Spot Kebocoran Pendaftaran:** Mengetahui iklan mendapat banyak klik, tetapi tidak tahu pasti mengapa angka yang akhirnya bayar dan diterima sangat sedikit (di mana calon mahasiswa hilang).
3. **Respon Lambat ke Calon Mahasiswa:** Calon siswa yang mengisi form sering baru dihubungi 1-2 hari kemudian, sehingga minatnya sudah dingin atau beralih ke kampus lain.

---

### Kebutuhan Desain Interaksi Pengguna (DIP)
1. **Tampilan Visual Instan & Bebas Kebingungan:**
   * Dashboard tidak menyajikan tabel rumit sebagai layar utama, melainkan **Interactive Funnel Chart** 4 tahap.
   * Pak Hendra dapat langsung melihat konversi dari Impresi $\rightarrow$ Klik $\rightarrow$ Form Pendaftaran $\rightarrow$ Mahasiswa Diterima.
2. **Indicator & Leak Alert Otomatis:**
   * Sistem otomatis menghitung *drop-off rate* antar tahapan.
   * Tahap dengan persentase kebocoran tertinggi otomatis diberi aksen visual **warna merah menyala / warning banner** (misal: *"Warning: Drop-off 85% terjadi dari Klik ke Form Pendaftaran"*).
3. **Filter Komparasi Interaktif:**
   * Tersedia tombol/dropdown cepat untuk membandingkan performa antara **Google Ads vs Instagram Ads** secara *side-by-side* atau terisolasi.
4. **Kejelasan Keputusan Tanpa Download File:**
   * Metrik utama (Conversion Rate, Total Pengunjung, Mahasiswa Diterima) disajikan dalam *Metric Cards* yang mencolok dan mudah dicerna dalam 5 detik pertama.
