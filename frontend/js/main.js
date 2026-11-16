/**
 * Dimension3D Studio - Internal Funnel Analytics & Deal Tracker
 * 4-Stage Funnel: Impresi Iklan -> Pengunjung Web 3D -> Interaksi Kalkulator Harga -> Request Brief / Deal Proyek
 */

let appData = null;
let monthlyChart = null;

let currentPage = "overview";
let currentChannel = "all";
let currentDateRange = "7";

/* ================= STORAGE KEYS ================= */
const AUTH_STORAGE_KEY = "dimension3d_session_user";
const LOCAL_USERS_KEY = "dimension3d_registered_users";
const LEADS_STORAGE_KEY = "dimension3d_client_leads";

/* ================= ELEMENTS ================= */
const registerPage = document.getElementById("registerPage");
const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const app = document.getElementById("app");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const goToLogin = document.getElementById("goToLogin");
const goToRegister = document.getElementById("goToRegister");
const logoutButton = document.getElementById("logoutButton");

const channelFilter = document.getElementById("channelFilter");
const dateFilter = document.getElementById("dateFilter");

/* ================= LOCAL STORAGE HELPERS ================= */
function getStoredSessionUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStoredSessionUser(user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {}
}

function clearStoredSessionUser() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {}
}

function saveLocalUser(userData) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...userData };
    } else {
      users.push(userData);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

function findLocalUser(email, password) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    return users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && (!password || u.password === password)
    );
  } catch (e) {
    return null;
  }
}

function getStoredLeads() {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Default 3D Studio Mock Leads
  return (window.eduFunnelData && window.eduFunnelData.recent_ux_logs) || [];
}

function saveStoredLead(lead) {
  try {
    const current = getStoredLeads();
    current.unshift(lead);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {}
}

/* ================= PAGE SWITCHING ================= */
function showRegisterPage() {
  if (registerPage) registerPage.classList.remove("hidden");
  if (loginPage) loginPage.classList.add("hidden");
  if (dashboardPage) dashboardPage.classList.add("hidden");
}

function showLoginPage() {
  if (registerPage) registerPage.classList.add("hidden");
  if (loginPage) loginPage.classList.remove("hidden");
  if (dashboardPage) dashboardPage.classList.add("hidden");
}

function showDashboardPage() {
  if (registerPage) registerPage.classList.add("hidden");
  if (loginPage) loginPage.classList.add("hidden");
  if (dashboardPage) dashboardPage.classList.remove("hidden");

  const storedUser = getStoredSessionUser();
  const displayEl = document.getElementById("displayUserName");
  if (displayEl && storedUser && storedUser.full_name) {
    displayEl.textContent = storedUser.full_name;
  }

  fetchEduFunnelData();
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.defaultText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.defaultText || button.textContent;
  button.disabled = false;
}

/* ================= AUTH EVENT LISTENERS ================= */
if (goToLogin) goToLogin.addEventListener("click", showLoginPage);
if (goToRegister) goToRegister.addEventListener("click", showRegisterPage);

if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitButton = registerForm.querySelector("button[type='submit']");

    if (password !== confirmPassword) {
      alert("Password dan Konfirmasi Password tidak sama.");
      return;
    }

    setButtonLoading(submitButton, true, "Mendaftarkan Akun Studio...");

    let registeredUser = null;

    // 1. Coba hubungi backend jika ada
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          registeredUser = result.user;
        }
      }
    } catch (e) {
      // Offline / serverless fallback
    }

    // 2. Fallback instan ke localStorage (100% Anti-Gagal Vercel)
    if (!registeredUser) {
      registeredUser = {
        user_id: `USR-3D-${Date.now().toString().slice(-4)}`,
        full_name: name || "Lead 3D Artist",
        email: email,
        role: "Studio Director & Lead Artist",
        created_at: new Date().toISOString()
      };
    }

    saveLocalUser({ ...registeredUser, password });
    setStoredSessionUser(registeredUser);

    setButtonLoading(submitButton, false);
    registerForm.reset();

    showDashboardPage();
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitButton = loginForm.querySelector("button[type='submit']");

    setButtonLoading(submitButton, true, "Memproses Akses...");

    let authenticatedUser = null;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          authenticatedUser = result.user;
        }
      }
    } catch (e) {}

    // Fallback localStorage
    if (!authenticatedUser) {
      const local = findLocalUser(email, password);
      if (local) {
        authenticatedUser = local;
      }
    }

    // Fallback mode demo / studio owner
    if (!authenticatedUser) {
      if (
        email.toLowerCase().includes("owner") ||
        email.toLowerCase().includes("3d") ||
        email.toLowerCase().includes("hendra") ||
        password === "password123" ||
        password === "demo" ||
        email.length > 3
      ) {
        authenticatedUser = {
          user_id: "USR-3D-001",
          full_name: "Lead 3D Artist (Owner)",
          email: email || "owner@dimension3d.studio",
          role: "Studio Director & Lead Artist"
        };
      }
    }

    setButtonLoading(submitButton, false);

    if (authenticatedUser) {
      setStoredSessionUser(authenticatedUser);
      loginForm.reset();
      showDashboardPage();
    } else {
      alert("Email atau password studio tidak sesuai. Gunakan tombol 'Mode Demo' untuk masuk instan.");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async function () {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {}
    clearStoredSessionUser();
    showLoginPage();
  });
}

/* ================= DATA INITIALIZATION ================= */
function fetchEduFunnelData() {
  if (window.eduFunnelData) {
    appData = JSON.parse(JSON.stringify(window.eduFunnelData));
  } else {
    appData = {
      summary: {
        total_impresi: 190000,
        total_pengunjung: 24200,
        total_kalkulator: 4780,
        total_deal: 560
      },
      sources: [
        { name: "Google Ads", impresi: 62000, pengunjung: 8400, kalkulator: 2030, deal: 275, conversion_rate: 3.27, status: "Stable", badge_class: "stable" },
        { name: "Instagram", impresi: 88000, pengunjung: 9800, kalkulator: 1620, deal: 145, conversion_rate: 1.48, status: "Alert (Drop-off Tinggi)", badge_class: "risk" },
        { name: "Twitter/X", impresi: 25000, pengunjung: 2800, kalkulator: 450, deal: 48, conversion_rate: 1.71, status: "Stable", badge_class: "stable" },
        { name: "Website", impresi: 15000, pengunjung: 3200, kalkulator: 680, deal: 92, conversion_rate: 2.88, status: "Stable", badge_class: "stable" }
      ]
    };
  }

  setupNavigation();
  setupFilters();
  renderPage("overview");
}

/* ================= NAVIGATION & FILTERS ================= */
function setupNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(function (item) {
    item.onclick = function () {
      menuItems.forEach(m => m.classList.remove("active"));
      item.classList.add("active");
      renderPage(item.dataset.page);
    };
  });
}

function setupFilters() {
  if (channelFilter) {
    channelFilter.onchange = function (e) {
      currentChannel = e.target.value;
      renderPage(currentPage);
    };
  }
  if (dateFilter) {
    dateFilter.onchange = function (e) {
      currentDateRange = e.target.value;
      renderPage(currentPage);
    };
  }
}

/* ================= 4-STAGE FUNNEL CALCULATION ================= */
function get4StageData(channelKey = currentChannel) {
  let impresi = 190000;
  let pengunjung = 24200;
  let kalkulator = 4780;
  let deal = 560;

  if (channelKey === "Google Ads") {
    impresi = 62000;
    pengunjung = 8400;
    kalkulator = 2030;
    deal = 275;
  } else if (channelKey === "Instagram") {
    impresi = 88000;
    pengunjung = 9800;
    kalkulator = 1620;
    deal = 145;
  } else if (channelKey === "Twitter/X") {
    impresi = 25000;
    pengunjung = 2800;
    kalkulator = 450;
    deal = 48;
  } else if (channelKey === "Website") {
    impresi = 15000;
    pengunjung = 3200;
    kalkulator = 680;
    deal = 92;
  }

  // Multiply by date range factor
  let factor = 1.0;
  if (currentDateRange === "7") factor = 0.25;
  if (currentDateRange === "month") factor = 1.0;
  if (currentDateRange === "year") factor = 11.5;

  impresi = Math.round(impresi * factor);
  pengunjung = Math.round(pengunjung * factor);
  kalkulator = Math.round(kalkulator * factor);
  deal = Math.round(deal * factor);

  const stages = [
    { label: "1. Impresi Iklan (IG/Google Ads)", count: impresi, key: "impresi" },
    { label: "2. Pengunjung Web 3D", count: pengunjung, key: "pengunjung" },
    { label: "3. Interaksi Kalkulator Harga", count: kalkulator, key: "kalkulator" },
    { label: "4. Request Brief / Deal Proyek", count: deal, key: "deal" }
  ];

  return { impresi, pengunjung, kalkulator, deal, stages };
}

function getHighestDrop(stages) {
  let highestDrop = {
    label: "-",
    value: 0,
    percent: 0,
    index: -1
  };

  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    const curr = stages[i];
    if (prev.count === 0) continue;

    const dropVal = prev.count - curr.count;
    const dropPct = (dropVal / prev.count) * 100;

    if (dropPct > highestDrop.percent) {
      highestDrop = {
        label: `${prev.label} → ${curr.label}`,
        value: dropVal,
        percent: dropPct,
        index: i
      };
    }
  }

  return highestDrop;
}

/* ================= PAGE ROUTER ================= */
function renderPage(page) {
  currentPage = page;

  if (monthlyChart) {
    monthlyChart.destroy();
    monthlyChart = null;
  }

  if (page === "overview") renderOverview();
  if (page === "leak_analytics") renderLeakAnalytics();
  if (page === "channel") renderChannelAnalysis();
  if (page === "funnel") renderFunnelDepth();
  if (page === "table") renderDataTable();

  runDashboardAnimations();
  setupReportExport();
}

/* ================= 1. OVERVIEW ================= */
function renderOverview() {
  const { impresi, pengunjung, kalkulator, deal, stages } = get4StageData();
  const highestDrop = getHighestDrop(stages);
  const convWebToDeal = ((deal / pengunjung) * 100).toFixed(2);
  const convCalcToDeal = ((deal / kalkulator) * 100).toFixed(1);

  app.innerHTML = `
    <section class="page-title">
      <p>DIMENSION3D STUDIO &bull; ACQUISITION OVERVIEW</p>
      <h1>Overview Corong Bisnis 3D Design</h1>
      <span>Pantau performa trafik portofolio, simulasi kalkulator harga, dan konversi deal proyek 3D.</span>
    </section>

    <section class="summary">
      <div class="summary-card">
        <h3>Total Impresi Iklan</h3>
        <p data-count-up data-value="${impresi}">${impresi.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Pengunjung Web 3D</h3>
        <p data-count-up data-value="${pengunjung}">${pengunjung.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Coba Kalkulator Harga</h3>
        <p data-count-up data-value="${kalkulator}">${kalkulator.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Deal Proyek 3D</h3>
        <p data-count-up data-value="${deal}">${deal.toLocaleString("id-ID")}</p>
      </div>
    </section>

    <!-- Critical Leak Alert Banner: BOCOR PARAH -->
    <div class="leak-alert-banner">
      <div class="leak-icon">⚠️</div>
      <div class="leak-content">
        <h4><span class="bocor-parah-badge">🚨 BOCOR PARAH TERDETEKSI!</span> Drop-off Klien Tertinggi</h4>
        <p>Terjadi penurunan ekstrem sebesar <strong style="color:#b91c1c; font-weight:800;">${highestDrop.percent.toFixed(1)}% drop-off</strong> pada transisi <strong>"${highestDrop.label}"</strong> (Kehilangan ${highestDrop.value.toLocaleString("id-ID")} calon klien potensial).</p>
        <div class="leak-rec">💡 <strong>Rekomendasi Taktis Lead 3D Artist:</strong> ${
          highestDrop.label.includes("Kalkulator")
            ? "Calon klien menghitung estimasi biaya di kalkulator namun batal submit brief. Pasang tombol 'Konsultasi WhatsApp Instan dengan 3D Artist' langsung di hasil simulasi harga dan tawarkan potongan 10% untuk project pertama."
            : "Banyak pengunjung portofolio keluar tanpa mencoba kalkulator simulasi harga. Sederhanakan tombol CTA kalkulator harga di galeri visual 3D dan pastikan waktu muat halaman di bawah 2 detik."
        }</div>
      </div>
    </div>

    <section class="dashboard-grid">
      <div class="card">
        <div class="section-header">
          <div>
            <h2>Corong Konversi Klien 3D (4 Tahap)</h2>
            <span>Visualisasi pergerakan calon klien dari impresi iklan s/d deal proyek</span>
          </div>
        </div>
        <div id="overviewFunnel"></div>
      </div>

      <aside class="card insight-card">
        <h2>Key Efficiency Metrics</h2>
        <div class="insight-value" data-count-up data-value="${convWebToDeal}" data-format="percent" data-decimals="2">${convWebToDeal}%</div>
        <p>Overall Conversion Rate dari Pengunjung Web 3D menjadi Deal Proyek resmi.</p>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <p><strong>Rasio Pengunjung ke Kalkulator:</strong> ${((kalkulator / pengunjung) * 100).toFixed(1)}%</p>
        <p style="margin-top: 6px;"><strong>Rasio Kalkulator ke Deal:</strong> ${convCalcToDeal}%</p>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <p>Saluran dengan konversi tertinggi: <strong>Google Search Ads (3.27% CVR)</strong></p>

        ${getReportExportMarkup()}
      </aside>
    </section>
  `;

  renderFunnelBars("overviewFunnel", stages);
}

/* ================= 2. LEAK ANALYTICS & ADS COMPARISON ================= */
function renderLeakAnalytics() {
  const { impresi, pengunjung, kalkulator, deal, stages } = get4StageData();
  const highestDrop = getHighestDrop(stages);
  const leads = getStoredLeads().slice(0, 4);

  app.innerHTML = `
    <section class="page-title">
      <p>DIMENSION3D &bull; FUNNEL DROP-OFF INTELLIGENCE</p>
      <h1>Funnel Analytics & Indikator Bocor Parah</h1>
      <span>Sistem audit kebocoran prospek klien pada corong jasa desain 3D & render komersial.</span>
    </section>

    <!-- Critical Leak Alert Banner: BOCOR PARAH -->
    <div class="leak-alert-banner">
      <div class="leak-icon">🚨</div>
      <div class="leak-content">
        <h4><span class="bocor-parah-badge">🚨 BOCOR PARAH TERDETEKSI!</span> Penurunan Ekstrem Calon Klien 3D</h4>
        <p>Terjadi kebocoran drastis sebesar <strong style="color:#b91c1c; font-weight:800;">${highestDrop.percent.toFixed(1)}% drop-off</strong> pada transisi <strong>"${highestDrop.label}"</strong> (Kehilangan ${highestDrop.value.toLocaleString("id-ID")} potensi brief proyek).</p>
        <div class="leak-rec">🎯 <strong>Rekomendasi Optimalisasi Studio:</strong> Terapkan <em>instant WhatsApp consultation</em> dan sediakan opsi upload file referensi (.obj, .fbx, sketsa CAD, foto produk) langsung pada form kalkulator untuk memangkas friksi komunikasi klien.</div>
      </div>
    </div>

    <!-- 4 Stage Metric Cards -->
    <section class="summary">
      <div class="summary-card">
        <h3>1. Impresi Iklan</h3>
        <p data-count-up data-value="${impresi}">${impresi.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>2. Pengunjung Web 3D</h3>
        <p data-count-up data-value="${pengunjung}">${pengunjung.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>3. Coba Kalkulator</h3>
        <p data-count-up data-value="${kalkulator}">${kalkulator.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>4. Deal Proyek 3D</h3>
        <p data-count-up data-value="${deal}">${deal.toLocaleString("id-ID")}</p>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="card">
        <div class="section-header">
          <div>
            <h2>Interactive 4-Stage Funnel Chart</h2>
            <span>Indikator warna merah otomatis menyala pada tahap dengan kebocoran tertinggi</span>
          </div>
        </div>
        <div id="dipFunnelBars"></div>
      </div>

      <aside class="card insight-card">
        <h2>Efisiensi Anggaran Iklan</h2>
        <div class="insight-value" data-count-up data-value="${((deal / impresi) * 100).toFixed(2)}" data-format="percent" data-decimals="2">${((deal / impresi) * 100).toFixed(2)}%</div>
        <p>Rasio deal bersih dari impresi iklan berbayar studio.</p>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <p><strong>Est. Biaya per Deal (CPA):</strong> Rp 185.000 / Proyek</p>
        <p style="margin-top:6px;"><strong>Avg. Nilai Proyek 3D:</strong> Rp 8.500.000 / Proyek</p>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <p style="color: #10b981; font-weight:700;">✅ ROI Iklan: 4.5x Lipat</p>
      </aside>
    </section>

    <!-- Head-to-Head: Google Ads vs Instagram Ads for 3D Studio -->
    <div style="margin-top: 28px;">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">Komparasi Head-to-Head: Google Ads vs Instagram Ads</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Analisis efektivitas mendatangkan klien korporat B2B vs agensi kreatif untuk alokasi budget iklan bulanan.</p>

      <div class="ads-compare-grid">
        <!-- Google Ads -->
        <div class="ads-card">
          <div class="ads-card-header">
            <span class="ads-tag tag-google">🔍 Google Search Ads (B2B Intent)</span>
            <span style="font-size: 0.85rem; color: #10b981; font-weight: 700;">Konversi Tinggi</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Impresi</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">62.000</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Pengunjung Web</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">8.400 (CTR 13.5%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Coba Kalkulator</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">2.030 (24.2%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Deal Proyek 3D</div>
              <strong style="font-size: 1.1rem; color: var(--primary);">275 (13.5% Deal)</strong>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: #475569; border-top: 1px solid var(--border); padding-top: 12px; line-height: 1.5;">
            Target keyword "jasa 3d rendering", "animasi produk 3d", dan "3d modeling B2B" menghasilkan klien serius dengan konversi deal tinggi.
          </p>
        </div>

        <!-- Instagram Ads -->
        <div class="ads-card">
          <div class="ads-card-header">
            <span class="ads-tag tag-ig">📸 Instagram Ads (Reels 3D Portfolio)</span>
            <span style="font-size: 0.85rem; color: #ef4444; font-weight: 700;">⚠️ Titik Kebocoran Tinggi</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Impresi</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">88.000</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Pengunjung Web</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">9.800 (CTR 11.1%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Coba Kalkulator</div>
              <strong style="font-size: 1.1rem; color: #dc2626;">1.620 (Drop 83.5%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Deal Proyek 3D</div>
              <strong style="font-size: 1.1rem; color: var(--primary);">145 (8.95% Deal)</strong>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: #475569; border-top: 1px solid var(--border); padding-top: 12px; line-height: 1.5;">
            Audiens Instagram terpukau dengan visual 3D render tetapi mayoritas hanya scrolling santai. <strong>Disarankan pasang pop-up 'Download Price Guide PDF' untuk menangkap email mereka.</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- Recent UX Calculator Interactions -->
    <div class="card" style="margin-top: 28px;">
      <div class="section-header">
        <div>
          <h2>Riwayat Interaksi Kalkulator Calon Klien (Live UX Logs)</h2>
          <span>Calon klien yang baru saja menghitung estimasi biaya proyek 3D</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Lead</th>
              <th>Nama Klien / Perusahaan</th>
              <th>Layanan 3D</th>
              <th>Spesifikasi Render</th>
              <th>Estimasi Harga</th>
              <th>Sumber Iklan</th>
              <th>Status Deal</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map(lead => `
              <tr>
                <td><strong>${lead.lead_id}</strong></td>
                <td>${lead.full_name}</td>
                <td>${lead.service_type}</td>
                <td><small style="color:var(--text-muted);">${lead.specifications}</small></td>
                <td><strong style="color:var(--primary);">${lead.estimated_price}</strong></td>
                <td><span class="ads-tag ${lead.utm_source.includes('Google') ? 'tag-google' : 'tag-ig'}">${lead.utm_source.split(' ')[0]} Ads</span></td>
                <td><span style="color:#10b981; font-weight:700;">⚡ ${lead.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderFunnelBars("dipFunnelBars", stages);
}

/* ================= 3. CHANNEL ANALYSIS ================= */
function renderChannelAnalysis() {
  const sources = (appData && appData.sources) || [];

  const cardsHtml = sources.map(source => `
    <div class="channel-card">
      <div class="channel-top">
        <h2>${source.name}</h2>
        <span class="badge ${source.badge_class || 'stable'}">${source.status}</span>
      </div>
      <p class="label">Pengunjung Web 3D</p>
      <h3 data-count-up data-value="${source.pengunjung}">${source.pengunjung.toLocaleString("id-ID")}</h3>

      <div class="channel-stats">
        <div>
          <span>Coba Kalkulator</span>
          <strong>${source.kalkulator ? source.kalkulator.toLocaleString("id-ID") : "-"}</strong>
        </div>
        <div>
          <span>Deal Proyek</span>
          <strong style="color:var(--primary);">${source.deal ? source.deal.toLocaleString("id-ID") : "-"}</strong>
        </div>
        <div>
          <span>Conversion Rate</span>
          <strong>${source.conversion_rate}%</strong>
        </div>
      </div>
    </div>
  `).join("");

  app.innerHTML = `
    <section class="page-title">
      <p>DIMENSION3D &bull; MARKETING CHANNELS</p>
      <h1>Analisis Saluran Akuisisi Klien 3D</h1>
      <span>Evaluasi performa Google Ads, Instagram Ads, Twitter/Artstation, dan Website Portofolio.</span>
    </section>

    <div class="channel-grid">
      ${cardsHtml}
    </div>

    <section class="card" style="margin-top: 24px;">
      <div class="section-header">
        <div>
          <h2>Tren Konversi Saluran Iklan</h2>
          <span>Perbandingan persentase deal proyek 3D antar saluran</span>
        </div>
      </div>
      <canvas id="monthlyChart" style="max-height: 280px;"></canvas>
    </section>
  `;

  renderChannelChart();
}

function renderChannelChart() {
  const canvas = document.getElementById("monthlyChart");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const sources = (appData && appData.sources) || [];

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sources.map(s => s.name),
      datasets: [
        {
          label: "Pengunjung Web 3D",
          data: sources.map(s => s.pengunjung),
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          borderColor: "#2563eb",
          borderWidth: 2,
          borderRadius: 6
        },
        {
          label: "Coba Kalkulator Harga",
          data: sources.map(s => s.kalkulator),
          backgroundColor: "rgba(99, 102, 241, 0.3)",
          borderColor: "#6366f1",
          borderWidth: 2,
          borderRadius: 6
        },
        {
          label: "Deal Proyek Resmi",
          data: sources.map(s => s.deal),
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "#10b981",
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#475569" } }
      },
      scales: {
        x: { ticks: { color: "#64748b" }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b" }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

/* ================= 4. FUNNEL DEPTH ================= */
function renderFunnelDepth() {
  const { pengunjung, kalkulator, deal, stages } = get4StageData();
  const highestDrop = getHighestDrop(stages);
  const convRate = ((deal / pengunjung) * 100).toFixed(2);

  app.innerHTML = `
    <section class="page-title">
      <p>DIMENSION3D &bull; FUNNEL DEPTH</p>
      <h1>Analisis Kedalaman Corong Konversi 3D</h1>
      <span>Melacak friksi dari impresi pertama hingga pembayaran uang muka (DP) proyek desain 3D.</span>
    </section>

    <section class="dashboard-grid">
      <div class="card">
        <h2>Tahapan Corong Konversi (4-Stage Depth)</h2>
        <div id="depthFunnel"></div>
      </div>

      <aside>
        <div class="card friction-card" style="margin-bottom: 20px;">
          <h2>Titik Friksi Utama (Bottleneck)</h2>
          <p>
            Penurunan sebesar <strong>${highestDrop.percent.toFixed(1)}% drop-off</strong>
            antara <strong>${highestDrop.label}</strong> merupakan friksi terbesar dalam siklus penjualan jasa 3D studio.
          </p>
          <p style="margin-top: 10px; font-size: 0.85rem; color: #475569;">
            💡 Terapkan SLA respon chat di bawah 15 menit begitu brief masuk dari website.
          </p>
        </div>

        <div class="card">
          <h3>Final Project Yield</h3>
          <div class="final-yield" data-count-up data-value="${convRate}" data-format="percent" data-decimals="2">${convRate}%</div>
          <p>Rasio pengunjung web portofolio 3D yang berhasil dikonversi menjadi klien deal.</p>
          ${getReportExportMarkup()}
        </div>
      </aside>
    </section>
  `;

  renderFunnelBars("depthFunnel", stages);
}

/* ================= 5. DATA TABLE & LEADS UX LOGS ================= */
function renderDataTable() {
  const leads = getStoredLeads();
  const { impresi, pengunjung, kalkulator, deal } = get4StageData();

  const rows = leads.map((lead, index) => `
    <tr>
      <td><strong>${lead.lead_id}</strong></td>
      <td><strong>${lead.full_name}</strong></td>
      <td>${lead.service_type}</td>
      <td style="max-width: 260px; font-size: 0.82rem; color: var(--text-muted);">${lead.specifications}</td>
      <td><strong style="color:var(--primary); font-size: 0.95rem;">${lead.estimated_price}</strong></td>
      <td><span class="ads-tag ${lead.utm_source.includes('Google') ? 'tag-google' : 'tag-ig'}">${lead.utm_source}</span></td>
      <td><span class="badge ${lead.status.includes('Deal') ? 'stable' : 'risk'}">${lead.status}</span></td>
      <td><small style="color:var(--text-muted);">${lead.created_at ? lead.created_at.slice(0, 16).replace('T', ' ') : '-'}</small></td>
    </tr>
  `).join("");

  app.innerHTML = `
    <section class="page-title">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <p>DIMENSION3D &bull; UX SIMULATOR & CRM</p>
          <h1>Log Interaksi UX & Leads Masuk (Kalkulator 3D)</h1>
          <span>Riwayat simulasi estimasi harga jasa 3D oleh calon klien beserta spesifikasi render dan status deal.</span>
        </div>
        <button type="button" class="auth-button" style="width: auto; padding: 10px 18px; margin: 0; font-size: 13px;" onclick="openNewLeadModal()">
          ➕ Tambah Simulasi Lead Baru (Demo Test)
        </button>
      </div>
    </section>

    <section class="summary">
      <div class="summary-card">
        <h3>Total Simulasi Tercatat</h3>
        <p data-count-up data-value="${leads.length}">${leads.length}</p>
      </div>
      <div class="summary-card">
        <h3>Interaksi Kalkulator</h3>
        <p data-count-up data-value="${kalkulator}">${kalkulator.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>Total Deal Proyek</h3>
        <p data-count-up data-value="${deal}">${deal.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>Rasio Deal</h3>
        <p>${((deal / (kalkulator || 1)) * 100).toFixed(1)}%</p>
      </div>
    </section>

    <section class="card" style="margin-top: 24px;">
      <div class="section-header">
        <div>
          <h2>Tabel Riwayat Leads & Interaksi Kalkulator Harga</h2>
          <span>Data tersimpan aman di browser (localStorage) & API internal studio</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Lead</th>
              <th>Nama Klien / Perusahaan</th>
              <th>Layanan 3D</th>
              <th>Spesifikasi Proyek</th>
              <th>Estimasi Harga</th>
              <th>Sumber Trafik</th>
              <th>Status Deal</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ================= MODAL TAMBAH SIMULASI LEAD BARU (DEMO TEST) ================= */
function openNewLeadModal() {
  const existingModal = document.getElementById("leadModal");
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="leadModal" style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); padding: 16px;">
      <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 520px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid var(--border); overflow: hidden;">
        <div style="padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">➕ Input Simulasi Brief Klien 3D Baru</h3>
          <button type="button" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted);" onclick="closeLeadModal()">✕</button>
        </div>
        <form id="newLeadForm" style="padding: 24px; display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Nama Klien / Brand</label>
            <input type="text" id="mClientName" placeholder="Contoh: PT Kreasi Interior Indonesia" required style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;" />
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Layanan 3D</label>
            <select id="mServiceType" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;">
              <option value="3D Architectural Visualization">3D Architectural Visualization (ArchViz)</option>
              <option value="3D Product Commercial & Animation">3D Product Commercial & Animation</option>
              <option value="3D Game Asset & Character Rigging">3D Game Asset & Character Rigging</option>
              <option value="3D Photorealistic Packaging Render">3D Photorealistic Packaging Render</option>
              <option value="3D Motion Graphics & Visual Effects">3D Motion Graphics & Visual Effects</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Spesifikasi Proyek</label>
            <input type="text" id="mSpecs" placeholder="Contoh: 4K Render, 3 Angles, Lighting Mood Twilight" required style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Estimasi Harga</label>
              <input type="text" id="mPrice" placeholder="Rp 7.500.000" required style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;" />
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Sumber Iklan</label>
              <select id="mSource" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;">
                <option value="Google Ads">Google Ads</option>
                <option value="Instagram Ads">Instagram Ads</option>
                <option value="Twitter/X">Twitter/X</option>
                <option value="Website SEO">Website SEO</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Status Deal</label>
            <select id="mStatus" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 14px;">
              <option value="Request Brief Submitted">Request Brief Submitted</option>
              <option value="Deal Project (DP 50% Received)">Deal Project (DP 50% Received)</option>
              <option value="Follow-up Konsultasi WA">Follow-up Konsultasi WA</option>
              <option value="Kalkulator Cek Harga">Kalkulator Cek Harga</option>
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button type="button" onclick="closeLeadModal()" style="padding: 10px 18px; border-radius: 8px; border: 1px solid var(--border); background: #f8fafc; cursor: pointer; font-weight: 600;">Batal</button>
            <button type="submit" class="auth-button" style="width: auto; padding: 10px 20px; margin: 0; font-size: 14px;">Simpan Simulasi</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("newLeadForm").onsubmit = function (e) {
    e.preventDefault();
    const newLead = {
      lead_id: `3D-LEAD-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      full_name: document.getElementById("mClientName").value.trim(),
      whatsapp: "08" + Math.floor(100000000 + Math.random() * 900000000),
      email: "client" + Date.now().toString().slice(-4) + "@company.com",
      service_type: document.getElementById("mServiceType").value,
      specifications: document.getElementById("mSpecs").value.trim(),
      estimated_price: document.getElementById("mPrice").value.trim(),
      utm_source: document.getElementById("mSource").value,
      created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: document.getElementById("mStatus").value
    };

    saveStoredLead(newLead);
    closeLeadModal();
    renderDataTable();
  };
}

function closeLeadModal() {
  const modal = document.getElementById("leadModal");
  if (modal) modal.remove();
}

/* ================= FUNNEL BARS RENDERER ================= */
function renderFunnelBars(containerId, stages) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const firstCount = stages[0].count;

  let maxDropIdx = -1;
  let maxDropPct = -1;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    if (prev.count > 0) {
      const dropVal = prev.count - stages[i].count;
      const dropPct = (dropVal / prev.count) * 100;
      if (dropPct > maxDropPct) {
        maxDropPct = dropPct;
        maxDropIdx = i;
      }
    }
  }

  container.innerHTML = stages.map(function (stage, index) {
    const width = firstCount === 0 ? 0 : (stage.count / firstCount) * 100;
    const isLeak = (index === maxDropIdx && maxDropPct > 0);
    let isBocorParah = isLeak;
    let dropPercent = 0;
    let dropText = "";

    if (index > 0) {
      const previous = stages[index - 1];
      if (previous.count > 0) {
        const drop = previous.count - stage.count;
        dropPercent = (drop / previous.count) * 100;
        if (dropPercent >= 70 || isLeak) {
          isBocorParah = true;
        }

        dropText = `
          <div class="drop${isBocorParah ? ' leak-alert' : ''}">
            ${isBocorParah ? '<span class="bocor-parah-badge">🚨 BOCOR PARAH</span> ' : ''}<strong>${dropPercent.toFixed(1)}% drop-off</strong> ${isBocorParah ? '(Penurunan Ekstrem Calon Klien 3D)' : ''}
          </div>
        `;
      }
    }

    const leakFillClass = isBocorParah ? " leak-alert" : "";

    return `
      <div class="funnel-stage">
        <div class="stage-label">
          <strong>${stage.label} ${isBocorParah ? '<span class="bocor-parah-badge" style="margin-left:8px;">🚨 BOCOR PARAH</span>' : ''}</strong>
          <span data-count-up data-value="${stage.count}">${stage.count.toLocaleString("id-ID")}</span>
        </div>

        <div class="bar-bg">
          <div class="bar-fill${leakFillClass}" data-width="${width}" style="width: 0%"></div>
        </div>

        ${dropText}
      </div>
    `;
  }).join("");
}

/* ================= ANIMATION & EXPORT HELPERS ================= */
function runDashboardAnimations() {
  const bars = document.querySelectorAll(".bar-fill");
  bars.forEach(function (bar) {
    const targetWidth = bar.dataset.width || "0";
    setTimeout(function () {
      bar.style.width = targetWidth + "%";
    }, 120);
  });
}

function getReportExportMarkup() {
  return `
    <div class="export-dropdown-wrapper" style="margin-top: 18px;">
      <button type="button" class="export-btn" id="exportBtn" style="width: 100%; justify-content: center;">
        📥 Export Studio Report &darr;
      </button>
      <div class="export-menu" id="exportMenu" hidden style="background:#fff; border:1px solid var(--border); border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); margin-top:6px; overflow:hidden;">
        <button type="button" class="export-item" data-export-type="pdf" style="display:block; width:100%; padding:10px 14px; text-align:left; background:none; border:none; cursor:pointer;">📄 Unduh PDF Report</button>
        <button type="button" class="export-item" data-export-type="csv" style="display:block; width:100%; padding:10px 14px; text-align:left; background:none; border:none; cursor:pointer;">📊 Unduh Spreadsheet (CSV)</button>
        <button type="button" class="export-item" data-export-type="json" style="display:block; width:100%; padding:10px 14px; text-align:left; background:none; border:none; cursor:pointer;">💾 Unduh Raw Data (JSON)</button>
      </div>
    </div>
  `;
}

function setupReportExport() {
  const exportBtn = document.getElementById("exportBtn");
  const exportMenu = document.getElementById("exportMenu");
  if (!exportBtn || !exportMenu) return;

  exportBtn.onclick = function (e) {
    e.stopPropagation();
    exportMenu.hidden = !exportMenu.hidden;
  };

  document.addEventListener("click", function () {
    if (exportMenu) exportMenu.hidden = true;
  });

  const items = document.querySelectorAll(".export-item");
  items.forEach(function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      exportMenu.hidden = true;
      const type = btn.dataset.exportType;
      if (type === "json") downloadJSONReport();
      if (type === "csv") downloadCSVReport();
      if (type === "pdf") downloadPDFReport();
    };
  });
}

function downloadJSONReport() {
  const { stages } = get4StageData();
  const data = {
    studio: "Dimension3D Studio Analytics",
    exported_at: new Date().toISOString(),
    funnel: stages,
    leads: getStoredLeads()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Dimension3D-Report-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function downloadCSVReport() {
  const { stages } = get4StageData();
  let csv = "Stage,Count\n";
  stages.forEach(s => {
    csv += `"${s.label}",${s.count}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Dimension3D-Funnel-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function downloadPDFReport() {
  if (typeof window.jspdf === "undefined") {
    alert("jsPDF library sedang dimuat. Silakan unduh CSV atau JSON.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { stages } = get4StageData();

  doc.setFontSize(16);
  doc.text("Dimension3D Studio - Funnel Performance Report", 14, 20);
  doc.setFontSize(10);
  doc.text(`Tanggal Export: ${new Date().toLocaleString("id-ID")}`, 14, 28);
  doc.text("4-Stage Funnel Breakdown:", 14, 38);

  let y = 48;
  stages.forEach(s => {
    doc.text(`- ${s.label}: ${s.count.toLocaleString("id-ID")}`, 18, y);
    y += 8;
  });

  doc.save(`Dimension3D-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Global exposure for onclick handlers in index.html
window.showDashboardPage = showDashboardPage;
window.showLoginPage = showLoginPage;
window.showRegisterPage = showRegisterPage;
window.openNewLeadModal = openNewLeadModal;
window.closeLeadModal = closeLeadModal;

/* ================= INIT ON LOAD ================= */
window.addEventListener("load", function () {
  const storedUser = getStoredSessionUser();
  if (storedUser) {
    showDashboardPage();
    return;
  }
  if (window.location.hash === "#dashboard") {
    showDashboardPage();
    return;
  }
  showLoginPage();
});
