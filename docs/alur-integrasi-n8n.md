# Dokumentasi Alur Integrasi n8n & Webhook Architecture

## Tahap 4: Back-End Engine & Automasi n8n

Dokumentasi ini merinci integrasi antara antarmuka web, API backend, dan engine otomasi **n8n** secara *real-time*.

---

### Arsitektur Alur Data (End-to-End Flow)

```text
[Calon Siswa]
     │
     ▼ (Mengisi Form PMB)
[Landing Page PMB]
     │
     ├── POST /api/leads ──▶ [Backend API Express]
     │                              │
     ▼ (Webhook Event Trigger)      ▼
┌─────────────────────────────────────────────────────────────┐
│                 n8n WORKFLOW ENGINE                         │
│                                                             │
│  1. Webhook Node:                                           │
│     Menerima payload JSON:                                  │
│     { nama, whatsapp, email, prodi, utm_source, timestamp } │
│                                                             │
│  2. Instant Auto-Response Node (Nurturing):                 │
│     Kirim WhatsApp/Email ke calon siswa:                    │
│     "Halo Budi! Terima kasih telah mendaftar di Akademi     │
│      Skill Nusantara. Berikut kami lampirkan brosur & biaya"│
│                                                             │
│  3. Internal Alert Node (Sisi Klien):                       │
│     Kirim notifikasi Telegram / WA ke Pak Hendra:           │
│     "🚨 Lead Baru Masuk via Instagram Ads!                  │
│      Nama: Budi Santoso | No. WA: 08123456789"              │
│                                                             │
│  4. Data Sync Node:                                         │
│     Simpan/perbarui rekap ke Google Sheets / Database       │
│     -> Dashboard Pak Hendra otomatis ter-update             │
│                                                             │
│  5. Follow-Up Kebocoran (Anti-Leak Automation):             │
│     - Node Wait/Delay (24 Jam)                              │
│     - IF status masih "Isi Form" dan belum "Bayar Registrasi"│
│     - Kirim WA reminder personal otomatis:                  │
│       "Halo Budi, kuota beasiswa tersisa 3 slot lagi nih..."│
└─────────────────────────────────────────────────────────────┘
```

---

### 1. Spesifikasi Payload Webhook

Ketika calon mahasiswa menekan tombol submit pendaftaran:
* **HTTP Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Contoh Payload:**
```json
{
  "event": "pmb_form_submitted",
  "lead_id": "LD-2026-0042",
  "full_name": "Budi Santoso",
  "whatsapp": "081234567890",
  "email": "budi.santoso@gmail.com",
  "program_study": "Fullstack Web Development",
  "utm_source": "Instagram Ads",
  "utm_campaign": "PMB_Gelombang_1",
  "registered_at": "2026-11-04T05:30:00Z",
  "status": "Form Submitted"
}
```

---

### 2. Node-by-Node n8n Workflow

1. **Webhook Node (`POST /webhook/pmb-lead`)**: Menerima request dari form frontend/backend.
2. **Branching Node (Router)**: Membedakan lead berdasarkan `utm_source` (Instagram Ads vs Google Ads).
3. **HTTP Request / WhatsApp API Node**: Mengirimkan template pesan selamat datang + tautan download brosur resmi Akademi Skill Nusantara.
4. **Telegram Bot Node**: Mengirim notifikasi kilat ke channel internal tim PMB & Pak Hendra.
5. **Database Sync Node**: Menyimpan row ke database / Google Sheets untuk memperbarui angka corong dashboard secara real-time.
6. **Wait Node (24 Jam)**: Menjeda eksekusi selama 24 jam untuk mendeteksi *drop-off* calon mahasiswa.
7. **Condition Check (IF Node)**: Mengecek apakah status siswa sudah berubah menjadi "Bayar Pendaftaran" atau masih "Form Submitted".
8. **Anti-Leak Reminder Node**: Jika belum bayar, kirim pesan penawaran bantuan konseling & reminder slot beasiswa.
