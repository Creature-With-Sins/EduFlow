let appData = null;
let monthlyChart = null;

let currentPage = "overview";
let currentChannel = "all";
let currentDateRange = "7";
let supabaseClient = null;
let supabaseDataClient = null;
let activeDataSource = "none";
let dailyAggregationCache = null;

const SUPABASE_URL = "https://tyjgxjawjqwerwemzkhy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amd4amF3anF3ZXJ3ZW16a2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDM1NDIsImV4cCI6MjA5NDkxOTU0Mn0.yDYRxuK0Mw-Ny-etoULGEXczXlKpdP5M2YVsouDi5y0";

const CHANNEL_TRAFFIC_KEYS = {
  "Google Ads": "google_ads",
  Instagram: "instagram",
  "Twitter/X": "twitter_x",
  Website: "website"
};

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

/* ================= PAGE SWITCHING ================= */
function showRegisterPage() {
  registerPage.classList.remove("hidden");
  loginPage.classList.add("hidden");
  dashboardPage.classList.add("hidden");
}

function showLoginPage() {
  registerPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
}

function showDashboardPage() {
  registerPage.classList.add("hidden");
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");

  const storedUser = getStoredSessionUser();
  if (storedUser && storedUser.full_name) {
    const personaEl = document.querySelector(".persona-badge span strong");
    if (personaEl) personaEl.textContent = storedUser.full_name;
  }

  fetchEduFunnelData();
}

function createSupabaseClient() {
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("Supabase client belum dimuat.");
  }

  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: function (url, options = {}) {
          return fetch(url, {
            ...options,
            cache: "no-store"
          });
        }
      }
    });
  }

  return supabaseClient;
}

function createSupabaseDataClient() {
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("Supabase client belum dimuat.");
  }

  if (!supabaseDataClient) {
    supabaseDataClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "edufunnel-anon-data-client"
      },
      global: {
        fetch: function (url, options = {}) {
          return fetch(url, {
            ...options,
            cache: "no-store"
          });
        }
      }
    });
  }

  return supabaseDataClient;
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

/* ================= LOCAL AUTH STORAGE HELPERS ================= */
const AUTH_STORAGE_KEY = "eduflow_session_user";
const LOCAL_USERS_KEY = "eduflow_registered_clients";

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

async function getCurrentSupabaseUser() {
  try {
    const client = createSupabaseClient();
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  } catch (e) {
    return null;
  }
}

/* ================= AUTH ================= */
goToLogin.addEventListener("click", showLoginPage);
goToRegister.addEventListener("click", showRegisterPage);

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

  setButtonLoading(submitButton, true, "Mendaftarkan Akun...");

  let registeredUser = null;

  // 1. Coba hubungi API backend /api/register
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
  } catch (netErr) {
    console.warn("Backend /api/register belum tersedia atau offline. Menggunakan fallback localStorage:", netErr);
  }

  // 2. Fallback instan ke localStorage browser (Menjamin pendaftaran demo tidak pernah gagal)
  if (!registeredUser) {
    registeredUser = {
      user_id: `USR-${Date.now().toString().slice(-4)}`,
      full_name: name || "Pak Hendra (Demo Klien)",
      email: email,
      role: "Head of Marketing & Admission",
      created_at: new Date().toISOString()
    };
  }

  saveLocalUser({ ...registeredUser, password });
  setStoredSessionUser(registeredUser);

  setButtonLoading(submitButton, false);
  registerForm.reset();

  // Langsung navigasi ke dashboard tanpa modal error
  showDashboardPage();
});

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const submitButton = loginForm.querySelector("button[type='submit']");

  setButtonLoading(submitButton, true, "Memproses Login...");

  let authenticatedUser = null;

  // 1. Coba verifikasi ke API backend /api/login
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
  } catch (netErr) {
    console.warn("Backend /api/login belum tersedia. Menggunakan fallback penyimpanan lokal:", netErr);
  }

  // 2. Cek apakah ada di riwayat registrasi browser
  if (!authenticatedUser) {
    const local = findLocalUser(email, password);
    if (local) {
      authenticatedUser = local;
    }
  }

  // 3. Fallback fleksibel untuk presentasi/demo dosen
  if (!authenticatedUser) {
    if (
      email.toLowerCase().includes("hendra") ||
      password === "password123" ||
      password === "demo" ||
      email.length > 3
    ) {
      authenticatedUser = {
        user_id: "USR-001",
        full_name: "Pak Hendra",
        email: email || "hendra@skillsnusantara.ac.id",
        role: "Head of Marketing & Admission"
      };
    }
  }

  setButtonLoading(submitButton, false);

  if (authenticatedUser) {
    setStoredSessionUser(authenticatedUser);
    loginForm.reset();
    showDashboardPage();
  } else {
    alert("Email atau password tidak sesuai. Anda dapat menggunakan tombol 'Mode Demo' untuk masuk instan.");
  }
});

logoutButton.addEventListener("click", async function () {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (e) {}
  clearStoredSessionUser();
  showLoginPage();
});

/* ================= FETCH DATA ================= */
function getLocalEduFunnelData() {
  if (!window.eduFunnelData) return null;

  return JSON.parse(JSON.stringify(window.eduFunnelData));
}

function validateEduFunnelData(data) {
  return data && Array.isArray(data.sources);
}

function mapSupabaseData(summaryRow, sourcesRows, trafficRows, dailyRows) {
  const safeSummaryRow = summaryRow && typeof summaryRow === "object"
    ? summaryRow
    : {};
  let safeSourcesRows = Array.isArray(sourcesRows) ? sourcesRows : [];
  const safeTrafficRows = Array.isArray(trafficRows) ? trafficRows : [];
  const safeDailyRows = Array.isArray(dailyRows) ? dailyRows : [];

  if (!summaryRow) {
    console.warn("Supabase: summary_metrics kosong. Menggunakan nilai summary default 0.");
  }

  if (safeSourcesRows.length === 0) {
    console.warn(
      "Supabase: funnel_sources kosong. Menggunakan kerangka channel agar data harian tetap dapat dirender."
    );

    safeSourcesRows = Object.keys(CHANNEL_TRAFFIC_KEYS).map(function (channelName, index) {
      return {
        name: channelName,
        pengunjung: 0,
        daftar: 0,
        test: 0,
        daftar_ulang: 0,
        berkuliah: 0,
        conversion_rate: 0,
        drop_off: 100,
        progression_rates: {},
        attrition_rates: {},
        ranking: index + 1,
        status: "No Data"
      };
    });
  }

  if (safeTrafficRows.length === 0) {
    console.warn("Supabase: monthly_channel_traffic kosong.");
  }

  if (safeDailyRows.length === 0) {
    console.warn("Supabase: daily_channel_traffic kosong.");
  }

  const requiredDailyFields = [
    "date",
    "channel",
    "pengunjung",
    "daftar",
    "test",
    "daftar_ulang",
    "berkuliah"
  ];

  safeDailyRows.forEach(function (row, index) {
    const missingFields = requiredDailyFields.filter(function (field) {
      return !Object.prototype.hasOwnProperty.call(row, field);
    });

    if (missingFields.length > 0) {
      console.warn(
        `Supabase: daily_channel_traffic baris ${index + 1} tidak memiliki kolom: ${missingFields.join(", ")}. Nilai yang hilang memakai default.`
      );
    }
  });

  const summary = {
    total_pengunjung: Number(safeSummaryRow.total_pengunjung || 0),
    total_daftar: Number(safeSummaryRow.total_daftar || 0),
    total_test: Number(safeSummaryRow.total_test || 0),
    total_daftar_ulang: Number(safeSummaryRow.total_daftar_ulang || 0),
    total_berkuliah: Number(safeSummaryRow.total_berkuliah || 0)
  };

  const conversionRate = Number(formatConversionRate(
    calculateConversionRate(summary.total_pengunjung, summary.total_berkuliah)
  ));

  return {
    metadata: {
      project_name: safeSummaryRow.project_name || "EduFunnel",
      period: safeSummaryRow.period || "2025",
      generated_by: safeSummaryRow.generated_by || "Supabase"
    },
    summary: summary,
    metric_cards: [
      {
        title: "Total Pengunjung",
        value: summary.total_pengunjung
      },
      {
        title: "Total Berkuliah",
        value: summary.total_berkuliah
      },
      {
        title: "Conversion Rate",
        value: conversionRate
      }
    ],
    funnel_stages: safeSummaryRow.funnel_stages || [
      "Pengunjung",
      "Daftar",
      "Test",
      "Daftar Ulang",
      "Berkuliah"
    ],
    funnel_data: safeSummaryRow.funnel_data || [
      summary.total_pengunjung,
      summary.total_daftar,
      summary.total_test,
      summary.total_daftar_ulang,
      summary.total_berkuliah
    ],
    sources: safeSourcesRows.map(function (source, index) {
      const visitors = Number(source.pengunjung || 0);
      const enrolled = Number(source.berkuliah || 0);
      const sourceConversionRate = calculateConversionRate(visitors, enrolled);

      return {
        name: source.name || `Channel ${index + 1}`,
        pengunjung: visitors,
        daftar: Number(source.daftar || 0),
        test: Number(source.test || 0),
        daftar_ulang: Number(source.daftar_ulang || 0),
        berkuliah: enrolled,
        conversion_rate: Number(formatConversionRate(sourceConversionRate)),
        drop_off: visitors > 0
          ? Number(formatConversionRate(100 - sourceConversionRate))
          : 0,
        progression_rates: source.progression_rates || {},
        attrition_rates: source.attrition_rates || {},
        ranking: Number(source.ranking || index + 1),
        status: source.status || "No Data"
      };
    }),
    monthly_channel_traffic: safeTrafficRows.map(function (item) {
      return {
        ...item,
        month_order: Number(item.month_order || 0),
        month: item.month || "",
        google_ads: Number(item.google_ads || 0),
        instagram: Number(item.instagram || 0),
        twitter_x: Number(item.twitter_x || 0),
        website: Number(item.website || 0),
        daftar: Number(item.daftar || 0),
        test: Number(item.test || 0),
        daftar_ulang: Number(item.daftar_ulang || 0),
        berkuliah: Number(item.berkuliah || 0)
      };
    }),
    daily_channel_traffic: safeDailyRows.map(function (item) {
      return {
        date: item.date || "",
        channel: item.channel || "Unknown",
        pengunjung: Number(item.pengunjung || 0),
        daftar: Number(item.daftar || 0),
        test: Number(item.test || 0),
        daftar_ulang: Number(item.daftar_ulang || 0),
        berkuliah: Number(item.berkuliah || 0)
      };
    })
  };
}

async function fetchSupabaseData() {
  const client = createSupabaseDataClient();

  async function fetchSummaryMetrics() {
    let result = await client
      .from("summary_metrics")
      .select("*")
      .eq("period", "2025")
      .maybeSingle();

    if (result.error) {
      console.warn(
        "Supabase: summary_metrics dengan filter period gagal. Mencoba ulang tanpa filter.",
        result.error
      );

      result = await client
        .from("summary_metrics")
        .select("*")
        .limit(1)
        .maybeSingle();
    }

    return result;
  }

  async function fetchFunnelSources() {
    let result = await client
      .from("funnel_sources")
      .select("*")
      .eq("period", "2025")
      .order("id", { ascending: true });

    if (result.error) {
      console.warn(
        "Supabase: funnel_sources dengan filter period gagal. Mencoba ulang tanpa filter.",
        result.error
      );

      result = await client
        .from("funnel_sources")
        .select("*");
    }

    if (Array.isArray(result.data)) {
      result.data.sort(function (sourceA, sourceB) {
        return Number(sourceA.id || 0) - Number(sourceB.id || 0);
      });
    }

    return result;
  }

  async function fetchMonthlyTraffic() {
    let result = await client
      .from("monthly_channel_traffic")
      .select("*")
      .eq("period", "2025")
      .order("month_order", { ascending: true });

    if (result.error) {
      console.warn(
        "Supabase: monthly_channel_traffic dengan filter period gagal. Mencoba ulang tanpa filter.",
        result.error
      );

      result = await client
        .from("monthly_channel_traffic")
        .select("*");
    }

    if (Array.isArray(result.data)) {
      result.data.sort(function (monthA, monthB) {
        return Number(monthA.month_order || 0) - Number(monthB.month_order || 0);
      });
    }

    return result;
  }

  async function fetchDailyTraffic() {
    return client
      .from("daily_channel_traffic")
      .select("*");
  }

  const [summaryResult, sourcesResult, trafficResult, dailyResult] = await Promise.all([
    fetchSummaryMetrics(),
    fetchFunnelSources(),
    fetchMonthlyTraffic(),
    fetchDailyTraffic()
  ]);

  const queryResults = [
    { name: "summary_metrics", result: summaryResult },
    { name: "funnel_sources", result: sourcesResult },
    { name: "monthly_channel_traffic", result: trafficResult },
    { name: "daily_channel_traffic", result: dailyResult }
  ];

  queryResults.forEach(function (query) {
    if (query.result.error) {
      console.warn(
        `Supabase: ${query.name} tidak dapat dibaca. Dashboard tetap memakai tabel Supabase lain yang tersedia.`,
        query.result.error
      );
    }
  });

  const successfulQueries = queryResults.filter(function (query) {
    return !query.result.error;
  });

  if (successfulQueries.length === 0) {
    throw new Error("Semua query tabel Supabase gagal.");
  }

  const dailyRows = dailyResult.error || !Array.isArray(dailyResult.data)
    ? []
    : dailyResult.data;

  console.log("RAW daily_channel_traffic:", dailyRows);

  const mappedData = mapSupabaseData(
    summaryResult.error ? null : summaryResult.data,
    sourcesResult.error ? [] : sourcesResult.data,
    trafficResult.error ? [] : trafficResult.data,
    dailyRows
  );

  if (!dailyResult.error) {
    activeDataSource = "SUPABASE";
  }

  console.log("DATA SUPABASE", mappedData);

  return mappedData;
}

async function fetchJsonFallbackData() {
  if (window.location.protocol !== "file:") {
    const response = await fetch("data_funnel.json");

    if (response.ok) {
      return response.json();
    }
  }

  const localData = getLocalEduFunnelData();

  if (validateEduFunnelData(localData)) {
    return localData;
  }

  throw new Error("Fallback data_funnel tidak tersedia.");
}

async function fetchEduFunnelData() {
  try {
    app.innerHTML = `
      <section class="loading-state">
        <h2>Loading data...</h2>
        <p>Sedang mengambil data dashboard dari Supabase.</p>
      </section>
    `;

    appData = await fetchSupabaseData();
    activeDataSource = "SUPABASE";
    console.info("EduFunnel data source: SUPABASE");

    setupNavigation();
    setupFilters();

    renderPage("overview");
  } catch (error) {
    activeDataSource = "supabase-error";
    console.error(
      "SUPABASE FETCH FAILED: dashboard tidak menerima data terbaru dari Supabase.",
      error
    );
    console.warn(
      "EduFunnel akan mencoba data_funnel.json sebagai fallback. Data fallback mungkin tidak sama dengan database."
    );

    try {
      app.innerHTML = `
        <section class="loading-state">
          <h2>Loading data...</h2>
          <p>Supabase belum tersedia. Menggunakan fallback data_funnel.json.</p>
        </section>
      `;

      const fallbackData = await fetchJsonFallbackData();

      if (!validateEduFunnelData(fallbackData)) {
        throw new Error("Format fallback data_funnel tidak valid.");
      }

      appData = fallbackData;
      activeDataSource = "json-fallback";
      console.warn("EduFunnel data source: JSON FALLBACK", fallbackData);
      setupNavigation();
      setupFilters();
      renderPage("overview");
      return;
    } catch (fallbackError) {
      console.error("Gagal mengambil fallback data:", fallbackError);
    }

    app.innerHTML = `
      <section class="empty-state">
        <h2>Data gagal dimuat</h2>
        <p>Query Supabase gagal dan fallback data_funnel tidak tersedia.</p>
      </section>
    `;
  }
}

/* ================= NAVIGATION ================= */
function setupNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach(function (item) {
    item.onclick = function () {
      setActiveMenu(item.dataset.page);
      renderPage(item.dataset.page);
    };
  });
}

function setActiveMenu(page) {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach(function (item) {
    item.classList.remove("active");

    if (item.dataset.page === page) {
      item.classList.add("active");
    }
  });
}

/* ================= FILTER ================= */
function setupFilters() {
  if (channelFilter) {
    channelFilter.onchange = function () {
      currentChannel = channelFilter.value;
      renderPage(currentPage);
    };
  }

  if (dateFilter) {
    dateFilter.onchange = function () {
      currentDateRange = dateFilter.value;
      renderPage(currentPage);
    };
  }
}

/* ================= DATE RANGE DATA ================= */
function getMonthlyChannelTraffic() {
  return appData.monthly_channel_traffic || [
    { month: "Jan", google_ads: 19, instagram: 18, twitter_x: 23, website: 18 },
    { month: "Feb", google_ads: 25, instagram: 22, twitter_x: 23, website: 20 },
    { month: "Mar", google_ads: 14, instagram: 16, twitter_x: 14, website: 16 },
    { month: "Apr", google_ads: 18, instagram: 23, twitter_x: 21, website: 29 },
    { month: "May", google_ads: 29, instagram: 23, twitter_x: 24, website: 20 },
    { month: "Jun", google_ads: 29, instagram: 13, twitter_x: 15, website: 27 },
    { month: "Jul", google_ads: 12, instagram: 25, twitter_x: 17, website: 21 },
    { month: "Aug", google_ads: 24, instagram: 26, twitter_x: 23, website: 31 },
    { month: "Sep", google_ads: 19, instagram: 27, twitter_x: 15, website: 21 },
    { month: "Oct", google_ads: 24, instagram: 26, twitter_x: 15, website: 14 },
    { month: "Nov", google_ads: 15, instagram: 21, twitter_x: 21, website: 15 },
    { month: "Dec", google_ads: 28, instagram: 26, twitter_x: 16, website: 19 }
  ];
}

function getLatestMonthlyTraffic() {
  const monthlyData = getMonthlyChannelTraffic();

  if (monthlyData.length === 0) {
    return null;
  }

  const hasMonthOrder = monthlyData.some(function (item) {
    return Number(item.month_order || 0) > 0;
  });

  if (!hasMonthOrder) {
    return monthlyData[monthlyData.length - 1];
  }

  return monthlyData.reduce(function (latest, item) {
    return Number(item.month_order || 0) > Number(latest.month_order || 0)
      ? item
      : latest;
  }, monthlyData[0]);
}

function getDailyChannelTraffic() {
  return Array.isArray(appData.daily_channel_traffic)
    ? appData.daily_channel_traffic
    : [];
}

function parseDailyTrafficDate(value) {
  if (!value) return null;

  const parsedDate = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getAggregatedDailyData(range = currentDateRange, channel = currentChannel) {
  const dailyRows = getDailyChannelTraffic();
  const cacheKey = `${range}:${channel}`;

  if (
    dailyAggregationCache
    && dailyAggregationCache.key === cacheKey
    && dailyAggregationCache.rowsReference === dailyRows
  ) {
    return dailyAggregationCache.result;
  }

  if (dailyRows.length === 0) {
    console.warn(
      "Supabase: daily_channel_traffic kosong total. Menggunakan funnel_sources sebagai fallback."
    );

    const fallbackSources = (Array.isArray(appData.sources) ? appData.sources : [])
      .filter(function (source) {
        return channel === "all" || source.name === channel;
      })
      .map(function (source) {
        const visitors = Number(source.pengunjung || 0);
        const enrolled = Number(source.berkuliah || 0);
        const conversionRate = calculateConversionRate(visitors, enrolled);

        return {
          ...source,
          pengunjung: visitors,
          daftar: Number(source.daftar || 0),
          test: Number(source.test || 0),
          daftar_ulang: Number(source.daftar_ulang || 0),
          berkuliah: enrolled,
          conversion_rate: Number(formatConversionRate(conversionRate)),
          drop_off: visitors > 0 ? Number(formatConversionRate(100 - conversionRate)) : 0
        };
      });
    const fallbackSummary = fallbackSources.reduce(function (totals, source) {
      totals.total_pengunjung += Number(source.pengunjung || 0);
      totals.total_daftar += Number(source.daftar || 0);
      totals.total_test += Number(source.test || 0);
      totals.total_daftar_ulang += Number(source.daftar_ulang || 0);
      totals.total_berkuliah += Number(source.berkuliah || 0);

      return totals;
    }, {
      total_pengunjung: 0,
      total_daftar: 0,
      total_test: 0,
      total_daftar_ulang: 0,
      total_berkuliah: 0
    });
    const fallbackResult = {
      range: range,
      channel: channel,
      latestDate: null,
      rows: [],
      sources: fallbackSources,
      summary: fallbackSummary,
      conversion_rate: calculateConversionRate(
        fallbackSummary.total_pengunjung,
        fallbackSummary.total_berkuliah
      ),
      source: "funnel_sources_fallback"
    };

    dailyAggregationCache = {
      key: cacheKey,
      rowsReference: dailyRows,
      result: fallbackResult
    };

    console.log("FINAL AGGREGATED DATA:", fallbackResult);

    return fallbackResult;
  }

  const datedRows = dailyRows
    .map(function (item) {
      return {
        item: item,
        parsedDate: parseDailyTrafficDate(item.date)
      };
    })
    .filter(function (entry) {
      return entry.parsedDate;
    });

  const latestDate = datedRows.length > 0
    ? datedRows.reduce(function (latest, entry) {
      return entry.parsedDate > latest ? entry.parsedDate : latest;
    }, datedRows[0].parsedDate)
    : null;
  let rangeRows = dailyRows;

  if (latestDate && range === "7") {
    const latestDates = [...new Set(
      datedRows.map(function (entry) {
        return entry.item.date;
      })
    )]
      .sort(function (dateA, dateB) {
        return parseDailyTrafficDate(dateB) - parseDailyTrafficDate(dateA);
      })
      .slice(0, 7);
    const latestDateSet = new Set(latestDates);

    rangeRows = datedRows
      .filter(function (entry) {
        return latestDateSet.has(entry.item.date);
      })
      .map(function (entry) {
        return entry.item;
      });
  }

  if (latestDate && range === "month") {
    rangeRows = datedRows
      .filter(function (entry) {
        return entry.parsedDate.getFullYear() === latestDate.getFullYear()
          && entry.parsedDate.getMonth() === latestDate.getMonth();
      })
      .map(function (entry) {
        return entry.item;
      });
  }

  if (latestDate && range === "year") {
    rangeRows = datedRows
      .filter(function (entry) {
        return entry.parsedDate.getFullYear() === latestDate.getFullYear();
      })
      .map(function (entry) {
        return entry.item;
      });
  }

  const filteredRows = channel === "all"
    ? rangeRows
    : rangeRows.filter(function (item) {
      return item.channel === channel;
    });
  const grouped = filteredRows.reduce(function (totals, item) {
    const channelName = item.channel;

    if (!totals[channelName]) {
      totals[channelName] = {
        pengunjung: 0,
        daftar: 0,
        test: 0,
        daftar_ulang: 0,
        berkuliah: 0
      };
    }

    totals[channelName].pengunjung += Number(item.pengunjung || 0);
    totals[channelName].daftar += Number(item.daftar || 0);
    totals[channelName].test += Number(item.test || 0);
    totals[channelName].daftar_ulang += Number(item.daftar_ulang || 0);
    totals[channelName].berkuliah += Number(item.berkuliah || 0);

    return totals;
  }, {});
  const selectedChannels = channel === "all"
    ? Object.keys(CHANNEL_TRAFFIC_KEYS)
    : [channel];
  const sources = selectedChannels.map(function (channelName, index) {
    const counts = grouped[channelName] || {
      pengunjung: 0,
      daftar: 0,
      test: 0,
      daftar_ulang: 0,
      berkuliah: 0
    };
    const visitors = Number(counts.pengunjung);
    const enrolled = Number(counts.berkuliah);
    const conversionRate = calculateConversionRate(visitors, enrolled);

    return {
      name: channelName,
      pengunjung: visitors,
      daftar: Number(counts.daftar),
      test: Number(counts.test),
      daftar_ulang: Number(counts.daftar_ulang),
      berkuliah: enrolled,
      conversion_rate: conversionRate.toFixed(2),
      drop_off: Number((100 - conversionRate).toFixed(2)),
      progression_rates: {},
      attrition_rates: {},
      ranking: index + 1,
      status: visitors === 0 ? "No Data" : conversionRate >= 5 ? "Stable" : "Alert"
    };
  });
  const summary = sources.reduce(function (totals, source) {
    totals.total_pengunjung += Number(source.pengunjung);
    totals.total_daftar += Number(source.daftar);
    totals.total_test += Number(source.test);
    totals.total_daftar_ulang += Number(source.daftar_ulang);
    totals.total_berkuliah += Number(source.berkuliah);

    return totals;
  }, {
    total_pengunjung: 0,
    total_daftar: 0,
    total_test: 0,
    total_daftar_ulang: 0,
    total_berkuliah: 0
  });
  const result = {
    range: range,
    channel: channel,
    latestDate: latestDate ? latestDate.toISOString().slice(0, 10) : null,
    rows: filteredRows,
    sources: sources,
    summary: summary,
    conversion_rate: calculateConversionRate(
      summary.total_pengunjung,
      summary.total_berkuliah
    ),
    source: "daily_channel_traffic"
  };

  dailyAggregationCache = {
    key: cacheKey,
    rowsReference: dailyRows,
    result: result
  };

  console.log("FINAL AGGREGATED DATA:", result);

  return result;
}

function getChartDataByDateRange() {
  const monthlyData = getMonthlyChannelTraffic();
  const latestMonth = getLatestMonthlyTraffic();
  const dailySources = getAggregatedDailyData(currentDateRange, "all").sources;
  const dailyVisitors = dailySources.reduce(function (totals, source) {
    totals[source.name] = Number(source.pengunjung);
    return totals;
  }, {});
  const dailyChartData = [
    {
      month: "Daily Traffic",
      google_ads: Number(dailyVisitors["Google Ads"] || 0),
      instagram: Number(dailyVisitors.Instagram || 0),
      twitter_x: Number(dailyVisitors["Twitter/X"] || 0),
      website: Number(dailyVisitors.Website || 0)
    }
  ];

  if (currentDateRange === "7") {
    dailyChartData[0].month = "Last 7 Days";
    return dailyChartData;
  }

  if (currentDateRange === "month" || currentDateRange === "30") {
    return latestMonth ? [latestMonth] : dailyChartData;
  }

  if (currentDateRange === "year") {
    return monthlyData.length > 0 ? monthlyData : dailyChartData;
  }

  return [];
}

function getAggregatedYearlyData(channel = currentChannel) {
  const yearlySources = (Array.isArray(appData.sources) ? appData.sources : [])
    .filter(function (source) {
      return channel === "all" || source.name === channel;
    })
    .map(function (source) {
      const visitors = Number(source.pengunjung || 0);
      const enrolled = Number(source.berkuliah || 0);
      const conversionRate = calculateConversionRate(visitors, enrolled);

      return {
        ...source,
        pengunjung: visitors,
        daftar: Number(source.daftar || 0),
        test: Number(source.test || 0),
        daftar_ulang: Number(source.daftar_ulang || 0),
        berkuliah: enrolled,
        conversion_rate: Number(formatConversionRate(conversionRate)),
        drop_off: visitors > 0 ? Number(formatConversionRate(100 - conversionRate)) : 0
      };
    });
  const summary = yearlySources.reduce(function (totals, source) {
    totals.total_pengunjung += Number(source.pengunjung);
    totals.total_daftar += Number(source.daftar);
    totals.total_test += Number(source.test);
    totals.total_daftar_ulang += Number(source.daftar_ulang);
    totals.total_berkuliah += Number(source.berkuliah);

    return totals;
  }, {
    total_pengunjung: 0,
    total_daftar: 0,
    total_test: 0,
    total_daftar_ulang: 0,
    total_berkuliah: 0
  });

  const yearlyConversionRate = calculateConversionRate(
    summary.total_pengunjung,
    summary.total_berkuliah
  );

  return {
    range: "year",
    channel: channel,
    sources: yearlySources,
    summary: summary,
    conversion_rate: Number(formatConversionRate(yearlyConversionRate)),
    source: "funnel_sources"
  };
}

function getMonthlyChannelStageValue(monthRow, trafficKey, stage) {
  const candidateKeys = [
    `${trafficKey}_${stage}`,
    `${stage}_${trafficKey}`
  ];
  const matchingKey = candidateKeys.find(function (key) {
    return Object.prototype.hasOwnProperty.call(monthRow, key);
  });

  return matchingKey ? Number(monthRow[matchingKey] || 0) : null;
}

function getAggregatedMonthlyData(channel = currentChannel) {
  const latestMonth = getLatestMonthlyTraffic();

  if (!latestMonth) {
    console.warn("Supabase: monthly_channel_traffic kosong. Tidak ada metrik This Month.");

    return {
      range: "month",
      channel: channel,
      sources: [],
      summary: {
        total_pengunjung: 0,
        total_daftar: 0,
        total_test: 0,
        total_daftar_ulang: 0,
        total_berkuliah: 0
      },
      conversion_rate: 0,
      source: "monthly_channel_traffic"
    };
  }

  const channelEntries = Object.entries(CHANNEL_TRAFFIC_KEYS)
    .filter(function ([channelName]) {
      return channel === "all" || channelName === channel;
    });
  const hasPerChannelFunnel = channelEntries.every(function ([, trafficKey]) {
    return ["daftar", "test", "daftar_ulang", "berkuliah"].every(function (stage) {
      return getMonthlyChannelStageValue(latestMonth, trafficKey, stage) !== null;
    });
  });
  const allPerChannelEntries = Object.entries(CHANNEL_TRAFFIC_KEYS);
  const perChannelFunnelHasData = allPerChannelEntries.some(function ([, trafficKey]) {
    return ["daftar", "test", "daftar_ulang", "berkuliah"].some(function (stage) {
      return Number(getMonthlyChannelStageValue(latestMonth, trafficKey, stage) || 0) > 0;
    });
  });
  let sources = [];

  if (hasPerChannelFunnel && perChannelFunnelHasData) {
    sources = channelEntries.map(function ([channelName, trafficKey], index) {
      const visitors = Number(latestMonth[trafficKey] || 0);
      const daftar = getMonthlyChannelStageValue(latestMonth, trafficKey, "daftar");
      const test = getMonthlyChannelStageValue(latestMonth, trafficKey, "test");
      const daftarUlang = getMonthlyChannelStageValue(latestMonth, trafficKey, "daftar_ulang");
      const enrolled = getMonthlyChannelStageValue(latestMonth, trafficKey, "berkuliah");
      const conversionRate = calculateConversionRate(visitors, enrolled);

      return {
        name: channelName,
        pengunjung: visitors,
        daftar: daftar,
        test: test,
        daftar_ulang: daftarUlang,
        berkuliah: enrolled,
        conversion_rate: Number(formatConversionRate(conversionRate)),
        drop_off: visitors > 0 ? Number(formatConversionRate(100 - conversionRate)) : 0,
        progression_rates: {},
        attrition_rates: {},
        ranking: index + 1,
        status: visitors === 0 ? "No Data" : conversionRate >= 5 ? "Stable" : "Alert"
      };
    });
  } else if (channel === "all") {
    if (hasPerChannelFunnel && !perChannelFunnelHasData) {
      console.warn("Monthly per-channel funnel columns exist but contain zero data.");
    }

    sources = channelEntries.map(function ([channelName, trafficKey], index) {
      const visitors = Number(latestMonth[trafficKey] || 0);
      const daftar = Number(getMonthlyChannelStageValue(latestMonth, trafficKey, "daftar") || 0);
      const test = Number(getMonthlyChannelStageValue(latestMonth, trafficKey, "test") || 0);
      const daftarUlang = Number(
        getMonthlyChannelStageValue(latestMonth, trafficKey, "daftar_ulang") || 0
      );
      const enrolled = Number(
        getMonthlyChannelStageValue(latestMonth, trafficKey, "berkuliah") || 0
      );
      const conversionRate = calculateConversionRate(visitors, enrolled);

      return {
        name: channelName,
        pengunjung: visitors,
        daftar: daftar,
        test: test,
        daftar_ulang: daftarUlang,
        berkuliah: enrolled,
        conversion_rate: Number(formatConversionRate(conversionRate)),
        drop_off: visitors > 0 ? Number(formatConversionRate(100 - conversionRate)) : 0,
        progression_rates: {},
        attrition_rates: {},
        ranking: index + 1,
        status: visitors === 0 ? "No Data" : conversionRate >= 5 ? "Stable" : "Alert"
      };
    });
  } else {
    const [channelName, trafficKey] = channelEntries[0];
    const visitors = Number(latestMonth[trafficKey] || 0);

    if (hasPerChannelFunnel && !perChannelFunnelHasData) {
      console.warn("Monthly per-channel funnel columns exist but contain zero data.");
    } else {
      console.warn(
        `Supabase: funnel bulanan per channel ${channelName} belum tersedia. Tambahkan kolom ${trafficKey}_daftar, ${trafficKey}_test, ${trafficKey}_daftar_ulang, dan ${trafficKey}_berkuliah.`
      );
    }

    sources = [{
      name: channelName,
      pengunjung: visitors,
      daftar: 0,
      test: 0,
      daftar_ulang: 0,
      berkuliah: 0,
      conversion_rate: 0,
      drop_off: visitors > 0 ? 100 : 0,
      progression_rates: {},
      attrition_rates: {},
      ranking: 1,
      status: visitors > 0 ? "Stable" : "No Data"
    }];
  }

  let summary = sources.reduce(function (totals, source) {
    totals.total_pengunjung += Number(source.pengunjung || 0);
    totals.total_daftar += Number(source.daftar || 0);
    totals.total_test += Number(source.test || 0);
    totals.total_daftar_ulang += Number(source.daftar_ulang || 0);
    totals.total_berkuliah += Number(source.berkuliah || 0);
    return totals;
  }, {
    total_pengunjung: 0,
    total_daftar: 0,
    total_test: 0,
    total_daftar_ulang: 0,
    total_berkuliah: 0
  });

  if (channel === "all") {
    const detailSummary = summary;

    summary = {
      total_pengunjung: Object.values(CHANNEL_TRAFFIC_KEYS).reduce(function (total, trafficKey) {
        return total + Number(latestMonth[trafficKey] || 0);
      }, 0),
      total_daftar: Number(latestMonth.daftar || 0),
      total_test: Number(latestMonth.test || 0),
      total_daftar_ulang: Number(latestMonth.daftar_ulang || 0),
      total_berkuliah: Number(latestMonth.berkuliah || 0)
    };

    if (
      hasPerChannelFunnel
      && perChannelFunnelHasData
      && (
        detailSummary.total_daftar !== summary.total_daftar
        || detailSummary.total_test !== summary.total_test
        || detailSummary.total_daftar_ulang !== summary.total_daftar_ulang
        || detailSummary.total_berkuliah !== summary.total_berkuliah
      )
    ) {
      console.warn("Monthly channel detail totals do not match monthly total columns.", {
        detailSummary: detailSummary,
        monthlySummary: summary
      });
    }
  }

  return {
    range: "month",
    channel: channel,
    sources: sources,
    summary: summary,
    conversion_rate: calculateConversionRate(
      summary.total_pengunjung,
      summary.total_berkuliah
    ),
    source: "monthly_channel_traffic"
  };
}

function validateFunnelOrder(label, metrics) {
  const values = [
    Number(metrics.pengunjung ?? metrics.total_pengunjung ?? 0),
    Number(metrics.daftar ?? metrics.total_daftar ?? 0),
    Number(metrics.test ?? metrics.total_test ?? 0),
    Number(metrics.daftar_ulang ?? metrics.total_daftar_ulang ?? 0),
    Number(metrics.berkuliah ?? metrics.total_berkuliah ?? 0)
  ];
  const isValid = values.every(function (value, index) {
    return index === 0 || values[index - 1] >= value;
  });

  if (!isValid) {
    console.warn(`Invalid funnel order for ${label}.`, {
      pengunjung: values[0],
      daftar: values[1],
      test: values[2],
      daftar_ulang: values[3],
      berkuliah: values[4]
    });
  }
}

function recalculateMetricsFromChannelRows(metrics) {
  const channelRows = (Array.isArray(metrics.sources) ? metrics.sources : []).map(function (source) {
    const visitors = Number(source.pengunjung || 0);
    const enrolled = Number(source.berkuliah || 0);
    const conversionRate = calculateConversionRate(visitors, enrolled);

    return {
      ...source,
      pengunjung: visitors,
      daftar: Number(source.daftar || 0),
      test: Number(source.test || 0),
      daftar_ulang: Number(source.daftar_ulang || 0),
      berkuliah: enrolled,
      conversion_rate: Number(formatConversionRate(conversionRate)),
      drop_off: visitors > 0 ? Number(formatConversionRate(100 - conversionRate)) : 0
    };
  });
  const totals = channelRows.reduce(function (result, row) {
    result.total_pengunjung += row.pengunjung;
    result.total_daftar += row.daftar;
    result.total_test += row.test;
    result.total_daftar_ulang += row.daftar_ulang;
    result.total_berkuliah += row.berkuliah;

    return result;
  }, {
    total_pengunjung: 0,
    total_daftar: 0,
    total_test: 0,
    total_daftar_ulang: 0,
    total_berkuliah: 0
  });

  totals.total_conversion_rate = calculateConversionRate(
    totals.total_pengunjung,
    totals.total_berkuliah
  );

  console.log("CHANNEL ROWS", channelRows);
  console.log("TOTAL RECALCULATED", totals);

  return {
    ...metrics,
    sources: channelRows,
    summary: totals,
    conversion_rate: totals.total_conversion_rate
  };
}

function getMetricsByRangeAndChannel(range = currentDateRange, channel = currentChannel) {
  let metrics;

  if (range === "month" || range === "30") {
    metrics = getAggregatedMonthlyData(channel);
  } else if (range === "year") {
    metrics = getAggregatedYearlyData(channel);
  } else {
    metrics = getAggregatedDailyData("7", channel);
  }

  metrics = recalculateMetricsFromChannelRows(metrics);

  metrics.sources.forEach(function (source) {
    validateFunnelOrder(`${metrics.source}:${source.name}`, source);
  });
  validateFunnelOrder(`${metrics.source}:summary`, metrics.summary);

  console.log("METRICS SOURCE", {
    range: range,
    channel: channel,
    sourceTable: metrics.source,
    metrics: metrics
  });

  return metrics;
}

/* ================= FILTERED DATA ================= */
function getFilteredSources() {
  return getMetricsByRangeAndChannel(currentDateRange, currentChannel).sources;
}

function getFilteredSummary() {
  return getMetricsByRangeAndChannel(currentDateRange, currentChannel).summary;
}

function getDateRangeLabel() {
  if (currentDateRange === "month" || currentDateRange === "30") return "This Month";
  if (currentDateRange === "year") return "This Year";
  return "Last 7 Days";
}

function getChannelTrafficTitle() {
  if (currentDateRange === "month" || currentDateRange === "30") {
    return "This Month Channel Traffic";
  }
  if (currentDateRange === "year") return "Monthly Channel Traffic";
  return "Last 7 Days Channel Traffic";
}

function formatAnimatedNumber(value, format, decimals) {
  if (format === "percent") {
    return `${Number(value).toFixed(decimals)}%`;
  }

  if (format === "decimal") {
    return Number(value).toFixed(decimals);
  }

  return Math.round(Number(value)).toLocaleString("id-ID");
}

function formatConversionRate(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00";
}

function calculateConversionRate(visitors, enrolled) {
  const visitorCount = Number(visitors || 0);
  const enrolledCount = Number(enrolled || 0);

  return visitorCount === 0 ? 0 : (enrolledCount / visitorCount) * 100;
}

function animateNumber(element, targetValue, options = {}) {
  const duration = options.duration || 900;
  const format = options.format || "int";
  const decimals = Number(options.decimals || 0);
  const target = Number(targetValue);
  const startTime = performance.now();

  if (!Number.isFinite(target)) return;

  function updateFrame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 4);
    const currentValue = target * easedProgress;

    element.textContent = formatAnimatedNumber(currentValue, format, decimals);

    if (progress < 1) {
      requestAnimationFrame(updateFrame);
    } else {
      element.textContent = formatAnimatedNumber(target, format, decimals);
    }
  }

  element.textContent = formatAnimatedNumber(0, format, decimals);
  requestAnimationFrame(updateFrame);
}

function animateCountUps() {
  document.querySelectorAll("[data-count-up]").forEach(function (element) {
    animateNumber(element, element.dataset.value, {
      format: element.dataset.format || "int",
      decimals: element.dataset.decimals || 0,
      duration: 900
    });
  });
}

function animateProgressBars() {
  document.querySelectorAll(".bar-fill[data-width]").forEach(function (bar) {
    bar.style.width = "0%";

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.style.width = `${bar.dataset.width}%`;
      });
    });
  });
}

function runDashboardAnimations() {
  animateCountUps();
  animateProgressBars();
}

function getReportExportMarkup() {
  return `
    <div class="report-export">
      <button class="auth-button report-btn" type="button" data-report-toggle>
        Generate Detailed Report
      </button>

      <div class="export-menu" hidden>
        <button type="button" data-export-type="pdf">Download PDF</button>
        <button type="button" data-export-type="csv">Download Excel/CSV</button>
        <button type="button" data-export-type="json">Download JSON</button>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  app.innerHTML = `
    <section class="empty-state">
      <h2>Data tidak ditemukan</h2>
      <p>Coba ubah filter channel, rentang tanggal, atau keyword pencarian.</p>
    </section>
  `;
}

/* ================= PAGE RENDER ================= */
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

/* ================= HELPERS ================= */
function getTotalConversionRate(metrics = getMetricsByRangeAndChannel(
  currentDateRange,
  currentChannel
)) {

  return formatConversionRate(metrics.conversion_rate);
}

function getSummaryStages(summary = getFilteredSummary()) {

  return [
    { label: "Pengunjung", count: Number(summary.total_pengunjung) },
    { label: "Daftar", count: Number(summary.total_daftar) },
    { label: "Test", count: Number(summary.total_test) },
    { label: "Daftar Ulang", count: Number(summary.total_daftar_ulang) },
    { label: "Berkuliah", count: Number(summary.total_berkuliah) }
  ];
}

function getHighestDrop(stages) {
  let highestDrop = {
    label: "-",
    value: 0,
    percent: 0
  };

  for (let i = 1; i < stages.length; i++) {
    const previous = stages[i - 1];
    const current = stages[i];

    if (previous.count === 0) continue;

    const dropValue = previous.count - current.count;
    const dropPercent = (dropValue / previous.count) * 100;

    if (dropValue > highestDrop.value) {
      highestDrop = {
        label: `${previous.label} ke ${current.label}`,
        value: dropValue,
        percent: dropPercent
      };
    }
  }

  return highestDrop;
}

/* ================= OVERVIEW ================= */
function renderOverview() {
  const metrics = getMetricsByRangeAndChannel(currentDateRange, currentChannel);
  const filteredSources = metrics.sources;

  if (filteredSources.length === 0) {
    renderEmptyState();
    return;
  }

  const summary = metrics.summary;
  const stages = getSummaryStages(summary);
  const highestDrop = getHighestDrop(stages);

  const bestSource = [...filteredSources].sort(function (a, b) {
    return Number(b.conversion_rate) - Number(a.conversion_rate);
  })[0];

  app.innerHTML = `
    <section class="page-title">
      <p>STUDENT ACQUISITION OVERVIEW</p>
      <h1>Student Acquisition Overview</h1>
      <span>Monitor ${getDateRangeLabel().toLowerCase()} conversion dynamics and pinpoint friction in the enrollment pipeline.</span>
    </section>

    <section class="summary">
      <div class="summary-card">
        <h3>Total Visitors</h3>
        <p data-count-up data-value="${summary.total_pengunjung}">${summary.total_pengunjung.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Qualified Leads</h3>
        <p data-count-up data-value="${summary.total_daftar}">${summary.total_daftar.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Conversion Rate</h3>
        <p data-count-up data-value="${getTotalConversionRate(metrics)}" data-format="percent" data-decimals="2">${getTotalConversionRate(metrics)}%</p>
      </div>
    </section>

    <!-- Core DIP Indicator: Titik Kebocoran Tertinggi Otomatis Diberi Aksen Merah -->
    <div class="leak-alert-banner">
      <div class="leak-icon">⚠️</div>
      <div class="leak-content">
        <h4>Critical Leak Alert &bull; Titik Kebocoran Tertinggi Terdeteksi!</h4>
        <p>Drop-off tertinggi sebesar <strong>${highestDrop.percent.toFixed(1)}%</strong> terjadi pada transisi <strong>"${highestDrop.label}"</strong> (Kehilangan ${highestDrop.value.toLocaleString("id-ID")} calon siswa potensial).</p>
        <div class="leak-rec">💡 <strong>Rekomendasi Tindakan Pak Hendra:</strong> Hubungi pendaftar via WhatsApp otomatis n8n dan persingkat formulir pendaftaran untuk menekan angka kebocoran.</div>
      </div>
    </div>

    <section class="dashboard-grid">
      <div class="card">
        <div class="section-header">
          <div>
            <h2>Acquisition Funnel</h2>
            <span>Visitor-to-Enrollment Flow</span>
          </div>
        </div>

        <div id="overviewFunnel"></div>
      </div>

      <aside class="card insight-card">
        <h2>Key Insight</h2>

        <div class="insight-value" data-count-up data-value="${highestDrop.percent.toFixed(1)}" data-format="percent" data-decimals="1">${highestDrop.percent.toFixed(1)}%</div>

        <p>
          Significant drop-off detected between
          <strong>${highestDrop.label}</strong>.
          Total users lost: <span data-count-up data-value="${highestDrop.value}">${highestDrop.value.toLocaleString("id-ID")}</span>.
        </p>

        <hr />

        <p>
          Best channel:
          <strong>${bestSource.name}</strong>
          with conversion rate ${formatConversionRate(bestSource.conversion_rate)}%.
        </p>

        ${getReportExportMarkup()}
      </aside>
    </section>
  `;

  renderFunnelBars("overviewFunnel", stages);
}

/* ================= LEAK ANALYTICS & ADS COMPARISON (CORE DIP) ================= */
function renderLeakAnalytics() {
  let impresi = 125000;
  let klik = 14200;
  let isiForm = 1850;
  let diterima = 320;

  if (currentChannel === "Google Ads") {
    impresi = 58000;
    klik = 7400;
    isiForm = 1120;
    diterima = 210;
  } else if (currentChannel === "Instagram" || currentChannel === "Instagram Ads") {
    impresi = 67000;
    klik = 6800;
    isiForm = 730;
    diterima = 110;
  }

  const stages4 = [
    { label: "1. Impresi Ads", count: impresi },
    { label: "2. Klik", count: klik },
    { label: "3. Form PMB", count: isiForm },
    { label: "4. Conversion", count: diterima }
  ];

  const highestDrop = getHighestDrop(stages4);
  const recentLeads = JSON.parse(localStorage.getItem("leaktrace_recent_leads") || "[]");

  app.innerHTML = `
    <section class="page-title">
      <p>STARTUP EDUFLOW &bull; DESAIN INTERAKSI PENGGUNA (DIP)</p>
      <h1>Funnel Analytics & Indikator Bocor Parah</h1>
      <span>Dashboard Klien: <strong>Pak Hendra</strong> (Head of Marketing & Admission, Akademi Skill Nusantara).</span>
    </section>

    <!-- Critical Leak Alert Banner: BOCOR PARAH -->
    <div class="leak-alert-banner">
      <div class="leak-icon">🚨</div>
      <div class="leak-content">
        <h4><span class="bocor-parah-badge">🚨 BOCOR PARAH TERDETEKSI!</span> Penurunan Ekstrem Calon Siswa</h4>
        <p>Terjadi kebocoran drastis sebesar <strong style="color:#b91c1c; font-weight:800;">${highestDrop.percent.toFixed(1)}% drop-off</strong> pada transisi <strong>"${highestDrop.label}"</strong> (Kehilangan ${highestDrop.value.toLocaleString("id-ID")} calon pendaftar potensial).</p>
        <div class="leak-rec">🎯 <strong>Rekomendasi Strategis EduFlow untuk Pak Hendra:</strong> ${highestDrop.label.includes("Klik") ? "Banyak pengunjung klik iklan tetapi keluar di halaman form. Kurangi kolom isian form dan picu otomatisasi WhatsApp via n8n begitu siswa submit." : "Otomatisasi n8n akan mengirim pesan WhatsApp reminder 24 jam jika status siswa masih tertahan di formulir."}</div>
      </div>
    </div>

    <!-- Metric Cards 4 Tahap -->
    <section class="summary">
      <div class="summary-card">
        <h3>Total Impresi Ads</h3>
        <p data-count-up data-value="${impresi}">${impresi.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>Klik Link (Traffic)</h3>
        <p data-count-up data-value="${klik}">${klik.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>Pengisi Form PMB</h3>
        <p data-count-up data-value="${isiForm}">${isiForm.toLocaleString("id-ID")}</p>
      </div>
      <div class="summary-card">
        <h3>Siswa Diterima</h3>
        <p data-count-up data-value="${diterima}">${diterima.toLocaleString("id-ID")}</p>
      </div>
    </section>

    <!-- Corong 4 Tahap & Komparasi Ads -->
    <section class="dashboard-grid">
      <div class="card">
        <div class="section-header">
          <div>
            <h2>Interactive 4-Stage Funnel Chart</h2>
            <span>Visualisasi corong penyerapan calon siswa dari impresi iklan s/d diterima</span>
          </div>
        </div>
        <div id="dipFunnelBars"></div>
      </div>

      <aside class="card insight-card">
        <h2>Analisis Efektivitas Iklan</h2>
        <div class="insight-value" data-count-up data-value="${((diterima / impresi) * 100).toFixed(2)}" data-format="percent" data-decimals="2">${((diterima / impresi) * 100).toFixed(2)}%</div>
        <p>Overall Conversion Rate dari impresi pertama hingga resmi menjadi mahasiswa.</p>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <p><strong>Rasio Klik ke Form:</strong> ${((isiForm / klik) * 100).toFixed(1)}%</p>
        <p style="margin-top:6px;"><strong>Rasio Form ke Diterima:</strong> ${((diterima / isiForm) * 100).toFixed(1)}%</p>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;" />
        <a href="home.html#kalkulator" class="header-portal-btn" style="width: 100%; justify-content: center;">
          🔎 Uji Coba Kalkulator Simulasi di Home &rarr;
        </a>
      </aside>
    </section>

    <!-- Side-by-Side Comparison: Google Ads vs Instagram Ads (DIP Tahap 3B) -->
    <div style="margin-top: 28px;">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">Komparasi Head-to-Head: Instagram Ads vs Google Ads</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Memudahkan Pak Hendra mengambil keputusan alokasi anggaran iklan berikutnya tanpa buka spreadsheet manual.</p>

      <div class="ads-compare-grid">
        <!-- Google Ads Card -->
        <div class="ads-card">
          <div class="ads-card-header">
            <span class="ads-tag tag-google">🔍 Google Search Ads</span>
            <span style="font-size: 0.85rem; color: #10b981; font-weight: 700;">Konversi Tinggi</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Impresi</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">58.000</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Klik Link</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">7.400 (CTR 12.7%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Isi Form</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">1.120</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Siswa Diterima</div>
              <strong style="font-size: 1.1rem; color: var(--primary);">210 (18.7%)</strong>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: #475569; border-top: 1px solid var(--border); padding-top: 12px; line-height: 1.5;">
            Audience Google Search memiliki intensi belajar tinggi karena aktif mencari jurusan. Tingkat drop-off form ke diterima relatif rendah (18.7% konversi).
          </p>
        </div>

        <!-- Instagram Ads Card -->
        <div class="ads-card">
          <div class="ads-card-header">
            <span class="ads-tag tag-ig">📸 Instagram Ads (Reels)</span>
            <span style="font-size: 0.85rem; color: #ef4444; font-weight: 700;">⚠️ Titik Kebocoran Tinggi</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Impresi</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">67.000</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Klik Link</div>
              <strong style="font-size: 1.1rem; color: var(--text-main);">6.800 (CTR 10.1%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Isi Form</div>
              <strong style="font-size: 1.1rem; color: #dc2626;">730 (Drop 89.2%)</strong>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Siswa Diterima</div>
              <strong style="font-size: 1.1rem; color: var(--primary);">110 (15.0%)</strong>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: #475569; border-top: 1px solid var(--border); padding-top: 12px; line-height: 1.5;">
            Trafik Instagram banyak yang keluar setelah klik link karena scrolling santai. <strong>Disarankan mengaktifkan otomatisasi nurturing n8n & reminder beasiswa.</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- Live Incoming Leads Table (Real-time from Landing Page PMB) -->
    <div class="card" style="margin-top: 28px;">
      <div class="section-header">
        <div>
          <h2>Data Masuk Calon Siswa Terbaru (Live Webhook Sync)</h2>
          <span>Pendaftar yang baru mengirimkan form dari Landing Page PMB</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Lead</th>
              <th>Nama Lengkap</th>
              <th>No. WhatsApp</th>
              <th>Email</th>
              <th>Program Studi</th>
              <th>Sumber Iklan</th>
              <th>Status n8n</th>
            </tr>
          </thead>
          <tbody>
            ${recentLeads.length === 0 ? `
              <tr>
                <td>LD-2026-0042</td>
                <td>Budi Santoso</td>
                <td>081234567890</td>
                <td>budi.santoso@gmail.com</td>
                <td>Fullstack Web Development</td>
                <td><span class="ads-tag tag-ig">Instagram Ads</span></td>
                <td><span style="color:#10b981; font-weight:700;">✅ WA Brosur Sent</span></td>
              </tr>
              <tr>
                <td>LD-2026-0043</td>
                <td>Siti Nurhaliza</td>
                <td>081987654321</td>
                <td>siti.nur@yahoo.com</td>
                <td>UI/UX & Product Design</td>
                <td><span class="ads-tag tag-google">Google Ads</span></td>
                <td><span style="color:#10b981; font-weight:700;">✅ WA Brosur Sent</span></td>
              </tr>
            ` : recentLeads.map(lead => `
              <tr>
                <td><strong>${lead.lead_id}</strong></td>
                <td>${lead.full_name}</td>
                <td>${lead.whatsapp}</td>
                <td>${lead.email}</td>
                <td>${lead.program_study}</td>
                <td><span class="ads-tag ${lead.utm_source.includes('Google') ? 'tag-google' : 'tag-ig'}">${lead.utm_source}</span></td>
                <td><span style="color:#10b981; font-weight:700;">⚡ Sync via n8n</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderFunnelBars("dipFunnelBars", stages4);
}

/* ================= CHANNEL ANALYSIS ================= */
function renderChannelAnalysis() {
  const metrics = getMetricsByRangeAndChannel(currentDateRange, currentChannel);
  const filteredSources = metrics.sources;

  if (filteredSources.length === 0) {
    renderEmptyState();
    return;
  }

  const channelCards = filteredSources.map(function (source) {
    const badgeClass = source.status === "Alert" ? "risk" : "stable";

    return `
      <div class="channel-card">
        <div class="channel-top">
          <h2>${source.name}</h2>
          <span class="badge ${badgeClass}">${source.status}</span>
        </div>

        <p class="label">Visitors</p>
        <h3 data-count-up data-value="${Number(source.pengunjung)}">${Number(source.pengunjung).toLocaleString("id-ID")}</h3>

        <div class="channel-stats">
          <div>
            <span>Converted</span>
            <strong data-count-up data-value="${Number(source.berkuliah)}">${source.berkuliah}</strong>
          </div>

          <div>
            <span>Conv. Rate</span>
            <strong data-count-up data-value="${Number(source.conversion_rate)}" data-format="percent" data-decimals="2">${formatConversionRate(source.conversion_rate)}%</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");

  app.innerHTML = `
    <section class="page-title">
      <p>ACQUISITION SOURCES</p>
      <h1>Channel Performance</h1>
      <span>${getDateRangeLabel()} engagement and conversion tracking across acquisition sources.</span>
    </section>

    <section class="channel-grid">
      ${channelCards}
    </section>

    <section class="card">
      <h2>${getChannelTrafficTitle()}</h2>
      <p class="label">${getDateRangeLabel()} visitor volume across all acquisition channels.</p>
      <canvas id="monthlyChart"></canvas>
    </section>
  `;

  renderMonthlyChart();
}

/* ================= FUNNEL DEPTH ================= */
function renderFunnelDepth() {
  const metrics = getMetricsByRangeAndChannel(currentDateRange, currentChannel);
  const filteredSources = metrics.sources;

  if (filteredSources.length === 0) {
    renderEmptyState();
    return;
  }

  const stages = getSummaryStages(metrics.summary);
  const highestDrop = getHighestDrop(stages);

  app.innerHTML = `
    <section class="page-title">
      <p>ACQUISITION INTELLIGENCE</p>
      <h1>Funnel Depth Analysis</h1>
      <span>Tracking ${getDateRangeLabel().toLowerCase()} prospective student progression from initial website visit to confirmed enrollment.</span>
    </section>

    <section class="dashboard-grid">
      <div class="card">
        <h2>Conversion Stages</h2>
        <div id="depthFunnel"></div>
      </div>

      <aside>
        <div class="card friction-card">
          <h2>Registration Friction</h2>
          <p>
            The <strong>${highestDrop.percent.toFixed(1)}% drop</strong>
            between ${highestDrop.label} indicates friction in the onboarding process.
          </p>
        </div>

        <div class="card">
          <h3>Final Yield</h3>
          <div class="final-yield" data-count-up data-value="${getTotalConversionRate(metrics)}" data-format="percent" data-decimals="2">${getTotalConversionRate(metrics)}%</div>
          <p>Overall conversion from visitor to enrolled student.</p>
          ${getReportExportMarkup()}
        </div>
      </aside>
    </section>
  `;

  renderFunnelBars("depthFunnel", stages);
}

/* ================= DATA TABLE ================= */
function renderDataTable() {
  const metrics = getMetricsByRangeAndChannel(currentDateRange, currentChannel);
  const filteredSources = metrics.sources;

  if (filteredSources.length === 0) {
    renderEmptyState();
    return;
  }

  const summary = metrics.summary;

  const rows = filteredSources.map(function (source) {
    return `
      <tr>   
        <td>${source.name}</td>
        <td data-count-up data-value="${Number(source.pengunjung)}">${Number(source.pengunjung).toLocaleString("id-ID")}</td>
        <td data-count-up data-value="${Number(source.daftar)}">${Number(source.daftar).toLocaleString("id-ID")}</td>
        <td data-count-up data-value="${Number(source.test)}">${Number(source.test).toLocaleString("id-ID")}</td>
        <td data-count-up data-value="${Number(source.daftar_ulang)}">${Number(source.daftar_ulang).toLocaleString("id-ID")}</td>
        <td data-count-up data-value="${Number(source.berkuliah)}">${Number(source.berkuliah).toLocaleString("id-ID")}</td>
        <td data-count-up data-value="${Number(source.conversion_rate)}" data-format="percent" data-decimals="2">${formatConversionRate(source.conversion_rate)}%</td>
        <td>${source.status}</td>
      </tr>
    `;
  }).join("");

  app.innerHTML = `
    <section class="page-title">
      <p>ANALYTICS DATA</p>
      <h1>Acquisition Grid</h1>
      <span>Analyze ${getDateRangeLabel().toLowerCase()} student performance data across primary digital channels.</span>
    </section>

    <section class="summary">
      <div class="summary-card">
        <h3>Total Visitors</h3>
        <p data-count-up data-value="${summary.total_pengunjung}">${summary.total_pengunjung.toLocaleString("id-ID")}</p>
      </div>

      <div class="summary-card">
        <h3>Average CVR</h3>
        <p data-count-up data-value="${getTotalConversionRate(metrics)}" data-format="percent" data-decimals="2">${getTotalConversionRate(metrics)}%</p>
      </div>

      <div class="summary-card">
        <h3>Active Channels</h3>
        <p data-count-up data-value="${filteredSources.length}">${filteredSources.length}</p>
      </div>
    </section>

    <section class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Channel Source</th>
            <th>Pengunjung</th>
            <th>Daftar</th>
            <th>Test</th>
            <th>Daftar Ulang</th>
            <th>Berkuliah</th>
            <th>CVR</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows}

          <tr class="total-row">
            <td>TOTAL</td>
            <td data-count-up data-value="${summary.total_pengunjung}">${summary.total_pengunjung.toLocaleString("id-ID")}</td>
            <td data-count-up data-value="${summary.total_daftar}">${summary.total_daftar.toLocaleString("id-ID")}</td>
            <td data-count-up data-value="${summary.total_test}">${summary.total_test.toLocaleString("id-ID")}</td>
            <td data-count-up data-value="${summary.total_daftar_ulang}">${summary.total_daftar_ulang.toLocaleString("id-ID")}</td>
            <td data-count-up data-value="${summary.total_berkuliah}">${summary.total_berkuliah.toLocaleString("id-ID")}</td>
            <td data-count-up data-value="${getTotalConversionRate(metrics)}" data-format="percent" data-decimals="2">${getTotalConversionRate(metrics)}%</td>
            <td>Overall</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

/* ================= FUNNEL BAR ================= */
function renderFunnelBars(containerId, stages) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const firstCount = stages[0].count;

  // Deteksi titik kebocoran tertinggi (Highest Drop-off Rate) untuk Core DIP Leak Alert
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
        if (dropPercent >= 50 || isLeak) {
          isBocorParah = true;
        }

        dropText = `
          <div class="drop${isBocorParah ? ' leak-alert' : ''}">
            ${isBocorParah ? '<span class="bocor-parah-badge">🚨 BOCOR PARAH</span> ' : ''}<strong>${dropPercent.toFixed(1)}% drop-off</strong> ${isBocorParah ? '(Penurunan Ekstrem Calon Pendaftar)' : ''}
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

/* ================= CHART ================= */
function getSmoothChartOptions() {
  return {
    responsive: true,
    animation: {
      duration: 1200,
      easing: "easeOutQuart"
    },
    transitions: {
      active: {
        animation: {
          duration: 400
        }
      },
      resize: {
        animation: {
          duration: 600
        }
      },
      show: {
        animations: {
          x: {
            from: 0,
            duration: 900,
            easing: "easeOutQuart"
          },
          y: {
            from: 0,
            duration: 900,
            easing: "easeOutQuart"
          }
        }
      },
      hide: {
        animation: {
          duration: 300
        }
      }
    },
    hover: {
      mode: "nearest",
      intersect: true,
      animationDuration: 250
    },
    plugins: {
      legend: {
        labels: {
          color: "#475569"
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#64748b" },
        grid: { color: "rgba(0,0,0,0.06)" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#64748b" },
        grid: { color: "rgba(0,0,0,0.06)" }
      }
    }
  };
}

function renderMonthlyChart() {
  if (typeof Chart === "undefined") {
    const chart = document.getElementById("monthlyChart");

    if (chart) {
      const chartMessage = document.createElement("div");
      chartMessage.className = "empty-state";
      chartMessage.innerHTML = `
        <h2>Grafik belum tersedia</h2>
        <p>Chart.js gagal dimuat. Data channel tetap bisa dibaca.</p>
      `;

      chart.replaceWith(chartMessage);
    }

    return;
  }

  const monthlyData = getChartDataByDateRange();

  const labels = monthlyData.map(item => item.month);
  const googleAds = monthlyData.map(item => item.google_ads);
  const instagram = monthlyData.map(item => item.instagram);
  const twitterX = monthlyData.map(item => item.twitter_x);
  const website = monthlyData.map(item => item.website);

  const ctx = document.getElementById("monthlyChart").getContext("2d");

  if (monthlyChart) {
    monthlyChart.destroy();
    monthlyChart = null;
  }

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Google Ads",
          data: googleAds,
          backgroundColor: "rgba(37, 99, 235, 0.85)",
          hoverBackgroundColor: "rgba(29, 78, 216, 0.95)",
          hoverBorderColor: "#bfdbfe",
          hoverBorderWidth: 2
        },
        {
          label: "Instagram",
          data: instagram,
          backgroundColor: "rgba(2, 132, 199, 0.85)",
          hoverBackgroundColor: "rgba(3, 105, 161, 0.95)",
          hoverBorderColor: "#bae6fd",
          hoverBorderWidth: 2
        },
        {
          label: "Twitter/X",
          data: twitterX,
          backgroundColor: "rgba(99, 102, 241, 0.85)",
          hoverBackgroundColor: "rgba(79, 70, 229, 0.95)",
          hoverBorderColor: "#c7d2fe",
          hoverBorderWidth: 2
        },
        {
          label: "Website",
          data: website,
          backgroundColor: "rgba(16, 185, 129, 0.85)",
          hoverBackgroundColor: "rgba(5, 150, 105, 0.95)",
          hoverBorderColor: "#a7f3d0",
          hoverBorderWidth: 2
        }
      ]
    },
    options: getSmoothChartOptions()
  });
}

/* ================= DOWNLOAD REPORT ================= */
function getReportFileName(extension) {
  const period = getDateRangeLabel().toLowerCase().replace(/\s+/g, "-");
  const channel = (currentChannel === "all" ? "all-channels" : currentChannel)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `edufunnel-report-${period}-${channel}.${extension}`;
}

function getCurrentReportData() {
  if (!appData) {
    return null;
  }

  const summary = getFilteredSummary();
  const funnelData = getSummaryStages();
  const sources = getFilteredSources();
  const highestDrop = getHighestDrop(funnelData);
  const bestSource = sources.length > 0
    ? [...sources].sort(function (a, b) {
      return Number(b.conversion_rate) - Number(a.conversion_rate);
    })[0]
    : null;

  return {
    title: "EduFunnel Detailed Report",
    metadata: appData.metadata || {},
    selectedPeriod: getDateRangeLabel(),
    selectedChannel: currentChannel === "all" ? "All Channels" : currentChannel,
    selectedPeriodValue: currentDateRange,
    summary: summary,
    funnelData: funnelData,
    sources: sources,
    chartData: getChartDataByDateRange(),
    highestDrop: highestDrop,
    bestSource: bestSource,
    generatedAt: new Date().toLocaleString("id-ID")
  };
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function downloadJSONReport() {
  const reportData = getCurrentReportData();

  if (!reportData) {
    alert("Data belum siap.");
    return;
  }

  const jsonData = JSON.stringify(reportData, null, 2);
  downloadBlob(jsonData, getReportFileName("json"), "application/json");
}

function escapeCSVValue(value) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function addCSVRow(rows, values) {
  rows.push(values.map(escapeCSVValue).join(","));
}

function downloadCSVReport() {
  const reportData = getCurrentReportData();

  if (!reportData) {
    alert("Data belum siap.");
    return;
  }

  const rows = [];

  addCSVRow(rows, ["EduFunnel Detailed Report"]);
  addCSVRow(rows, ["Generated At", reportData.generatedAt]);
  addCSVRow(rows, ["Period", reportData.selectedPeriod]);
  addCSVRow(rows, ["Channel", reportData.selectedChannel]);
  rows.push("");

  addCSVRow(rows, ["Summary"]);
  addCSVRow(rows, ["Metric", "Value"]);
  addCSVRow(rows, ["Total Visitors", reportData.summary.total_pengunjung]);
  addCSVRow(rows, ["Qualified Leads", reportData.summary.total_daftar]);
  addCSVRow(rows, ["Conversion Rate", `${getTotalConversionRate()}%`]);
  rows.push("");

  addCSVRow(rows, ["Funnel Data"]);
  addCSVRow(rows, ["Stage", "Value"]);
  reportData.funnelData.forEach(function (stage) {
    addCSVRow(rows, [stage.label, stage.count]);
  });
  rows.push("");

  addCSVRow(rows, ["Channel Data"]);
  addCSVRow(rows, [
    "Channel Source",
    "Pengunjung",
    "Daftar",
    "Test",
    "Daftar Ulang",
    "Berkuliah",
    "CVR",
    "Status"
  ]);

  reportData.sources.forEach(function (source) {
    addCSVRow(rows, [
      source.name,
      source.pengunjung,
      source.daftar,
      source.test,
      source.daftar_ulang,
      source.berkuliah,
      `${formatConversionRate(source.conversion_rate)}%`,
      source.status
    ]);
  });

  downloadBlob(rows.join("\n"), getReportFileName("csv"), "text/csv;charset=utf-8");
}

function addPDFLine(doc, label, value, x, y) {
  doc.text(`${label}: ${value}`, x, y);
}

function downloadPDFReport() {
  const reportData = getCurrentReportData();

  if (!reportData) {
    alert("Data belum siap.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Library PDF belum siap. Coba refresh halaman.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const left = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("EduFunnel Detailed Report", left, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  addPDFLine(doc, "Generated At", reportData.generatedAt, left, y);
  y += 6;
  addPDFLine(doc, "Period", reportData.selectedPeriod, left, y);
  y += 6;
  addPDFLine(doc, "Channel", reportData.selectedChannel, left, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Summary Metrics", left, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  addPDFLine(doc, "Total Visitors", reportData.summary.total_pengunjung.toLocaleString("id-ID"), left, y);
  y += 6;
  addPDFLine(doc, "Qualified Leads", reportData.summary.total_daftar.toLocaleString("id-ID"), left, y);
  y += 6;
  addPDFLine(doc, "Conversion Rate", `${getTotalConversionRate()}%`, left, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Funnel Stages", left, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  reportData.funnelData.forEach(function (stage) {
    addPDFLine(doc, stage.label, stage.count.toLocaleString("id-ID"), left, y);
    y += 6;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Insights", left, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  addPDFLine(doc, "Highest Drop-off", `${reportData.highestDrop.percent.toFixed(1)}% (${reportData.highestDrop.label})`, left, y);
  y += 6;
  addPDFLine(doc, "Users Lost", reportData.highestDrop.value.toLocaleString("id-ID"), left, y);
  y += 6;
  addPDFLine(
    doc,
    "Best Channel",
    reportData.bestSource
      ? `${reportData.bestSource.name} (${formatConversionRate(reportData.bestSource.conversion_rate)}%)`
      : "-",
    left,
    y
  );

  if (monthlyChart) {
    try {
      const chartImage = monthlyChart.toBase64Image();
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Chart Snapshot", left, y);
      y += 5;
      doc.addImage(chartImage, "PNG", left, y, 180, 80);
    } catch (error) {
      console.warn("Chart image tidak bisa ditambahkan ke PDF:", error);
    }
  }

  doc.save(getReportFileName("pdf"));
}

function setupReportExport() {
  document.querySelectorAll("[data-report-toggle]").forEach(function (toggle) {
    toggle.onclick = function () {
      const exportMenu = toggle.closest(".report-export").querySelector(".export-menu");
      exportMenu.hidden = !exportMenu.hidden;
    };
  });

  document.querySelectorAll("[data-export-type]").forEach(function (button) {
    button.onclick = function () {
      const exportMenu = button.closest(".export-menu");
      const exportType = button.dataset.exportType;

      exportMenu.hidden = true;

      if (exportType === "pdf") downloadPDFReport();
      if (exportType === "csv") downloadCSVReport();
      if (exportType === "json") downloadJSONReport();
    };
  });
}

function downloadReport() {
  downloadJSONReport();
}

// Expose showDashboardPage globally for onclick handlers in index.html
window.showDashboardPage = showDashboardPage;
window.showLoginPage = showLoginPage;
window.showRegisterPage = showRegisterPage;

/* ================= INIT ================= */
window.addEventListener("load", async function () {
  // 1. Cek sesi lokal (localStorage)
  const storedUser = getStoredSessionUser();
  if (storedUser) {
    showDashboardPage();
    return;
  }

  // 2. Cek apakah ada parameter hash #dashboard
  if (window.location.hash === "#dashboard") {
    showDashboardPage();
    return;
  }

  // 3. Fallback Supabase jika tersedia
  try {
    const user = await getCurrentSupabaseUser();
    if (user) {
      showDashboardPage();
      return;
    }
  } catch (error) {
    // Abaikan error Supabase
  }

  showRegisterPage();
});
