const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3001;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

app.use(cors());
app.use(express.json());

// In-memory leads storage for demonstration & fast prototyping
const leadsStore = [
  {
    lead_id: "LD-2026-0001",
    full_name: "Budi Santoso",
    whatsapp: "081234567890",
    email: "budi.santoso@gmail.com",
    program_study: "Fullstack Web Development",
    utm_source: "Instagram Ads",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "Form Submitted"
  },
  {
    lead_id: "LD-2026-0002",
    full_name: "Siti Rahma",
    whatsapp: "081987654321",
    email: "siti.rahma@yahoo.com",
    program_study: "UI/UX Design",
    utm_source: "Google Ads",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "Daftar Ulang"
  }
];

// Raw mock analytics data for Google Ads & Instagram Ads (Akademi Skill Nusantara)
const campaignData = {
  all: {
    impresi: 125000,
    klik: 14200,
    isi_form: 1850,
    diterima: 320
  },
  google_ads: {
    channel: "Google Ads",
    impresi: 58000,
    klik: 7400,
    isi_form: 1120,
    diterima: 210
  },
  instagram: {
    channel: "Instagram Ads",
    impresi: 67000,
    klik: 6800,
    isi_form: 730,
    diterima: 110
  }
};

/**
 * Helper: Calculate conversion rate & identify the highest drop-off point (Leak Point)
 */
function calculateFunnelAnalytics(raw) {
  const stages = [
    { key: "impresi", label: "1. Impresi Ads", count: raw.impresi },
    { key: "klik", label: "2. Klik Link", count: raw.klik },
    { key: "isi_form", label: "3. Pengisi Form", count: raw.isi_form },
    { key: "diterima", label: "4. Siswa Diterima", count: raw.diterima }
  ];

  let maxDropRate = -1;
  let leakStageIndex = -1;

  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].count;
    const curr = stages[i].count;
    const dropCount = prev - curr;
    const dropRate = prev > 0 ? parseFloat(((dropCount / prev) * 100).toFixed(1)) : 0;
    const convRate = prev > 0 ? parseFloat(((curr / prev) * 100).toFixed(1)) : 0;

    stages[i].drop_count = dropCount;
    stages[i].drop_rate_pct = dropRate;
    stages[i].conv_rate_pct = convRate;

    // Detect highest drop-off rate
    if (dropRate > maxDropRate) {
      maxDropRate = dropRate;
      leakStageIndex = i;
    }
  }

  // First stage has 0% drop
  stages[0].drop_count = 0;
  stages[0].drop_rate_pct = 0;
  stages[0].conv_rate_pct = 100;

  // Mark critical leak stage
  stages.forEach((st, idx) => {
    st.is_critical_leak = (idx === leakStageIndex);
  });

  const leakStage = stages[leakStageIndex];
  const prevStage = stages[leakStageIndex - 1];

  const overallConversion = raw.impresi > 0
    ? parseFloat(((raw.diterima / raw.impresi) * 100).toFixed(2))
    : 0;

  const clickToFormConversion = raw.klik > 0
    ? parseFloat(((raw.isi_form / raw.klik) * 100).toFixed(1))
    : 0;

  return {
    overall_conversion_pct: overallConversion,
    click_to_form_conv_pct: clickToFormConversion,
    stages,
    leak_alert: {
      detected: true,
      stage_index: leakStageIndex,
      from_stage: prevStage.label,
      to_stage: leakStage.label,
      drop_rate_pct: maxDropRate,
      warning_message: `⚠️ Titik kebocoran tertinggi: Drop-off ${maxDropRate}% terjadi dari "${prevStage.label}" ke "${leakStage.label}"!`,
      recommendation: leakStage.key === "isi_form"
        ? "Banyak pengunjung klik iklan tetapi batal mengisi formulir. Sederhanakan jumlah isian form dan tingkatkan kecepatan landing page."
        : "Tingkatkan personalisasi follow-up konselor untuk mempercepat konversi ke tahap diterima."
    }
  };
}

/**
 * GET /api/dashboard/funnel
 * Returns calculated funnel metrics, drop-off rates, and leak alerts
 */
app.get("/api/dashboard/funnel", (req, res) => {
  const channel = (req.query.channel || "all").toLowerCase().replace("-", "_").replace(" ", "_");
  const dataToUse = campaignData[channel] || campaignData.all;
  const analysis = calculateFunnelAnalytics(dataToUse);

  res.json({
    success: true,
    filter: {
      channel: req.query.channel || "all",
      period: req.query.range || "7"
    },
    funnel: analysis,
    comparison: {
      google_ads: calculateFunnelAnalytics(campaignData.google_ads),
      instagram_ads: calculateFunnelAnalytics(campaignData.instagram)
    }
  });
});

/**
 * POST /api/leads
 * Handles PMB landing page submissions and triggers n8n Webhook
 */
app.post("/api/leads", async (req, res) => {
  try {
    const { full_name, whatsapp, email, program_study, utm_source } = req.body;

    if (!full_name || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: "Nama lengkap dan nomor WhatsApp wajib diisi."
      });
    }

    const newLead = {
      lead_id: `LD-${new Date().getFullYear()}-${String(leadsStore.length + 1).padStart(4, "0")}`,
      full_name,
      whatsapp,
      email: email || "-",
      program_study: program_study || "Fullstack Web Development",
      utm_source: utm_source || "Direct / Website",
      created_at: new Date().toISOString(),
      status: "Form Submitted"
    };

    leadsStore.unshift(newLead);

    // If n8n Webhook URL is configured, forward lead to n8n
    let webhookStatus = "n8n webhook url not configured (local simulated)";
    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLead)
        });
        webhookStatus = "forwarded to n8n successfully";
      } catch (err) {
        webhookStatus = `failed to forward to n8n: ${err.message}`;
      }
    }

    res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil diterima! Notifikasi & brosur sedang diproses.",
      lead: newLead,
      webhook_status: webhookStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal server.",
      error: error.message
    });
  }
});

/**
 * GET /api/leads
 * Returns list of recent leads
 */
app.get("/api/leads", (req, res) => {
  res.json({
    success: true,
    total: leadsStore.length,
    leads: leadsStore
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LeakTrace Backend running on http://localhost:${PORT}`);
  console.log(`📡 GET  http://localhost:${PORT}/api/dashboard/funnel`);
  console.log(`📥 POST http://localhost:${PORT}/api/leads`);
});
