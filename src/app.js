/* ==========================================================================
   SaatTakip - Main Application Logic (Strict Logout Reset & Multi-User)
   ========================================================================== */

const DAY_NAMES_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi'
];

let state = {
  entries: [],
  teamUsers: [],
  theme: localStorage.getItem('saattakip_theme') || 'dark',
  currentUser: JSON.parse(localStorage.getItem('saattakip_user') || 'null'),
  authMode: 'login',
  useMongo: false,
  timer: {
    isRunning: false,
    seconds: 0,
    intervalId: null
  },
  chartPeriod: 'week',
  filterPeriod: 'this-week',
  userFilter: 'all',
  searchQuery: '',
  sortField: 'date',
  sortOrder: 'desc'
};

let elements = {};
let workChartInstance = null;

// --- Initialize App ---
async function init() {
  elements = {
    app: document.getElementById('app'),
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMidnight: document.getElementById('theme-icon-midnight'),
    themeDropdown: document.getElementById('theme-dropdown'),
    themeOptDark: document.getElementById('theme-opt-dark'),
    themeOptLight: document.getElementById('theme-opt-light'),
    themeOptMidnight: document.getElementById('theme-opt-midnight'),

    // Auth
    userHeaderArea: document.getElementById('user-header-area'),
    btnOpenLogin: document.getElementById('btn-open-login'),
    userProfileBadge: document.getElementById('user-profile-badge'),
    userAvatar: document.getElementById('user-avatar'),
    userDisplayName: document.getElementById('user-display-name'),
    btnLogout: document.getElementById('btn-logout'),

    authModal: document.getElementById('auth-modal'),
    authModalTitle: document.getElementById('auth-modal-title'),
    authForm: document.getElementById('auth-form'),
    authNameGroup: document.getElementById('auth-name-group'),
    authName: document.getElementById('auth-name'),
    authEmail: document.getElementById('auth-email'),
    authPasswordGroup: document.getElementById('auth-password-group'),
    authPassword: document.getElementById('auth-password'),
    authConfirmGroup: document.getElementById('auth-confirm-group'),
    authConfirmPassword: document.getElementById('auth-confirm-password'),
    btnForgotPass: document.getElementById('btn-forgot-password'),
    btnToggleAuthMode: document.getElementById('btn-toggle-auth-mode'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    btnAuthModalClose: document.getElementById('btn-auth-modal-close'),

    // Team Grid
    teamMembersGrid: document.getElementById('team-members-grid'),

    // Lock Warning Modal
    lockWarningModal: document.getElementById('lock-warning-modal'),
    btnLockClose: document.getElementById('btn-lock-close'),
    btnLockLogin: document.getElementById('btn-lock-login'),

    // User Details View Modal
    userDetailsModal: document.getElementById('user-details-modal'),
    userModalAvatar: document.getElementById('user-modal-avatar'),
    userModalName: document.getElementById('user-modal-name'),
    userModalEmail: document.getElementById('user-modal-email'),
    userModalTodayTotal: document.getElementById('user-modal-today-total'),
    userModalYesterdayTotal: document.getElementById('user-modal-yesterday-total'),
    userModalOverallTotal: document.getElementById('user-modal-overall-total'),
    userModalTableBody: document.getElementById('user-modal-table-body'),
    btnUserModalClose: document.getElementById('btn-user-modal-close'),

    // Timer Banner
    timerDisplay: document.getElementById('timer-display'),
    timerNote: document.getElementById('timer-note'),
    timerCategory: document.getElementById('timer-category'),
    timerToggleBtn: document.getElementById('btn-timer-toggle'),
    timerBtnIcon: document.getElementById('timer-btn-icon'),
    timerBtnText: document.getElementById('timer-btn-text'),
    timerResetBtn: document.getElementById('btn-timer-reset'),

    // Stats
    statWeeklyTotal: document.getElementById('stat-weekly-total'),
    statWeeklyAvg: document.getElementById('stat-weekly-avg'),
    statMonthlyTotal: document.getElementById('stat-monthly-total'),
    statMonthlyAvg: document.getElementById('stat-monthly-avg'),
    statOverallDailyAvg: document.getElementById('stat-overall-daily-avg'),
    statTotalDays: document.getElementById('stat-total-days'),
    statGoalPercent: document.getElementById('stat-goal-percent'),
    goalProgressFill: document.getElementById('goal-progress-fill'),

    // Add Form
    addForm: document.getElementById('add-time-form'),
    entryDate: document.getElementById('entry-date'),
    entryDayBadge: document.getElementById('entry-day-badge'),
    entryHours: document.getElementById('entry-hours'),
    entryMinutes: document.getElementById('entry-minutes'),
    entrySeconds: document.getElementById('entry-seconds'),
    entryCategory: document.getElementById('entry-category'),
    entryNote: document.getElementById('entry-note'),
    presetBtns: document.querySelectorAll('.btn-preset'),

    // Chart
    chartCanvas: document.getElementById('workChart'),
    chartTabWeek: document.getElementById('chart-tab-week'),
    chartTabMonth: document.getElementById('chart-tab-month'),

    // Table & Filters
    tableBody: document.getElementById('entries-table-body'),
    tableSearch: document.getElementById('table-search'),
    tableFilterPeriod: document.getElementById('table-filter-period'),
    tableFilterUser: document.getElementById('table-filter-user'),
    tableFilteredTotal: document.getElementById('table-filtered-total'),
    emptyState: document.getElementById('empty-state'),

    // Data Menu Dropdown
    btnDataMenu: document.getElementById('btn-data-menu'),
    dataDropdown: document.getElementById('data-dropdown'),
    btnQuickSample: document.getElementById('btn-quick-sample'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    importFileInput: document.getElementById('import-file-input'),
    btnClearAll: document.getElementById('btn-clear-all'),

    // Modal
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editId: document.getElementById('edit-id'),
    editDate: document.getElementById('edit-date'),
    editHours: document.getElementById('edit-hours'),
    editMinutes: document.getElementById('edit-minutes'),
    editSeconds: document.getElementById('edit-seconds'),
    editCategory: document.getElementById('edit-category'),
    editNote: document.getElementById('edit-note'),
    btnModalClose: document.getElementById('btn-modal-close'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  loadTheme();
  renderUserHeader();
  setupDateDefault();
  setupEventListeners();
  await loadEntries();
  await loadTeamMembers();
  updateUI();
}

// --- Date & Time Helper Functions ---
function getTodayString() {
  const today = new Date();
  return formatDateToYYYYMMDD(today);
}

function formatDateToYYYYMMDD(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseEntryDate(dateString) {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0);
}

function getDayNameTR(dateString) {
  if (!dateString) return '';
  const date = parseEntryDate(dateString);
  return DAY_NAMES_TR[date.getDay()];
}

function formatDuration(totalSec) {
  if (!totalSec || totalSec <= 0) return '0s 0dk';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);

  let result = '';
  if (h > 0) result += `${h}s `;
  if (m > 0 || h > 0) result += `${m}dk`;

  return result.trim() || '0s 0dk';
}

function formatDurationDetailed(totalSec) {
  if (!totalSec || totalSec <= 0) return '0s 0dk 0sn';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}s ${m}dk ${s}sn`;
}

function formatTimeDigital(totalSec) {
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getWeekRange(dateObj = new Date()) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function getMonthRange(dateObj = new Date()) {
  const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1, 0, 0, 0);
  const end = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

// --- Storage & MongoDB Sync ---
async function loadEntries() {
  if (!state.currentUser) {
    state.entries = [];
    return;
  }

  const localSaved = localStorage.getItem('saattakip_entries');
  if (localSaved) {
    try {
      state.entries = JSON.parse(localSaved);
    } catch (e) {
      state.entries = [];
    }
  }

  try {
    const res = await fetch('/api/entries');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        state.entries = result.data;
        state.useMongo = true;
        localStorage.setItem('saattakip_entries', JSON.stringify(state.entries));
      }
    }
  } catch (err) {
    state.useMongo = false;
  }
}

async function loadTeamMembers() {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        state.teamUsers = result.data;
      }
    }
  } catch (e) {
    const userMap = new Map();
    state.entries.forEach(e => {
      const name = e.userName || 'Kullanıcı';
      if (!userMap.has(name)) {
        userMap.set(name, {
          id: e.userId || name,
          name: name,
          email: e.userEmail || `${name.toLowerCase()}@saattakip.com`,
          avatarColor: '#6366f1'
        });
      }
    });

    state.teamUsers = Array.from(userMap.values());
  }

  renderTeamMembers();
}

function renderTeamMembers() {
  if (!elements.teamMembersGrid) return;

  if (state.teamUsers.length === 0) {
    state.teamUsers = [

    ];
  }

  const todayStr = getTodayString();

  elements.teamMembersGrid.innerHTML = state.teamUsers.map(user => {
    // If not logged in, show 0s 0dk on cards or actual overview
    const userEntries = state.currentUser ? state.entries.filter(e => e.userEmail === user.email || e.userName === user.name) : [];
    const todaySec = userEntries.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.totalSeconds, 0);

    return `
      <div class="user-card-item" data-user-email="${user.email}" data-user-name="${escapeHtml(user.name)}">
        <div class="user-avatar" style="background-color: ${user.avatarColor || '#6366f1'}">
          ${escapeHtml(user.name.charAt(0).toUpperCase())}
        </div>
        <div class="user-card-info">
          <h4>${escapeHtml(user.name)}</h4>
          <span>Bugün: <strong>${state.currentUser ? formatDuration(todaySec) : 'Gizli'}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

async function saveEntries(newOrUpdatedEntry = null, actionType = 'save') {
  localStorage.setItem('saattakip_entries', JSON.stringify(state.entries));
  updateUI();
  await loadTeamMembers();

  if (state.useMongo && (newOrUpdatedEntry || actionType === 'clearAll')) {
    try {
      if (actionType === 'add') {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrUpdatedEntry)
        });
      } else if (actionType === 'update') {
        await fetch(`/api/entries?id=${newOrUpdatedEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrUpdatedEntry)
        });
      } else if (actionType === 'delete') {
        await fetch(`/api/entries?id=${newOrUpdatedEntry.id}`, {
          method: 'DELETE'
        });
      } else if (actionType === 'clearAll') {
        await fetch('/api/entries?clearAll=true', {
          method: 'DELETE'
        });
      }
    } catch (err) {
      console.warn('MongoDB background sync error:', err);
    }
  }
}

// --- Auth & User State Handlers ---
function renderUserHeader() {
  if (!elements.btnOpenLogin) return;

  if (state.currentUser) {
    elements.btnOpenLogin.classList.add('hidden');
    elements.userProfileBadge.classList.remove('hidden');
    elements.userDisplayName.textContent = state.currentUser.name;
    elements.userAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
    if (state.currentUser.avatarColor) {
      elements.userAvatar.style.backgroundColor = state.currentUser.avatarColor;
    }
  } else {
    elements.btnOpenLogin.classList.remove('hidden');
    elements.userProfileBadge.classList.add('hidden');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const name = elements.authName.value.trim();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value.trim();
  const confirmPassword = elements.authConfirmPassword ? elements.authConfirmPassword.value.trim() : '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Lütfen geçerli bir e-posta adresi girin (örn: isim@domain.com).', 'danger');
    return;
  }

  if (state.authMode === 'register') {
    if (!name || name.length < 2) {
      showToast('İsim alanı en az 2 karakter olmalıdır.', 'danger');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Şifre ve Şifre Tekrarı eşleşmiyor.', 'danger');
      return;
    }
  }

  try {
    const actionName = state.authMode === 'forgot' ? 'reset_password' : state.authMode;
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionName,
        name,
        email,
        password,
        confirmPassword,
        newPassword: password
      })
    });

    const data = await res.json();
    if (data.success) {
      if (state.authMode === 'forgot') {
        showToast(data.message || 'Şifreniz sıfırlandı. Giriş yapabilirsiniz.', 'success');
        setAuthMode('login');
        return;
      }

      state.currentUser = data.user;
      localStorage.setItem('saattakip_user', JSON.stringify(data.user));
      renderUserHeader();
      closeAuthModal();
      showToast(`Hoş geldin ${data.user.name}!`, 'success');
      if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60 });
      await loadEntries();
      await loadTeamMembers();
      updateUI();
    } else {
      showToast(data.message || 'Bir hata oluştu.', 'danger');
    }
  } catch (err) {
    if (state.authMode === 'register' && password !== confirmPassword) {
      showToast('Şifreler eşleşmiyor.', 'danger');
      return;
    }

    state.currentUser = {
      id: 'user_' + Date.now(),
      name: name || email.split('@')[0],
      email: email,
      avatarColor: '#6366f1'
    };
    localStorage.setItem('saattakip_user', JSON.stringify(state.currentUser));
    renderUserHeader();
    closeAuthModal();
    showToast(`Giriş yapıldı (${state.currentUser.name})`, 'success');
    updateUI();
  }
}

// --- STRICT LOGOUT & RESET ALL UI ---
function handleLogout() {
  state.currentUser = null;
  state.entries = [];
  localStorage.removeItem('saattakip_user');

  // Reset live timer
  resetTimer();

  // Reset form input values
  if (elements.entryHours) elements.entryHours.value = 0;
  if (elements.entryMinutes) elements.entryMinutes.value = 0;
  if (elements.entrySeconds) elements.entrySeconds.value = 0;
  if (elements.entryNote) elements.entryNote.value = '';
  if (elements.timerNote) elements.timerNote.value = '';

  renderUserHeader();
  renderTeamMembers();
  updateUI();
  showToast('Çıkış yapıldı. Tüm veriler ve ekran sıfırlandı.', 'info');
}

function openAuthModal() {
  if (elements.authModal) elements.authModal.classList.remove('hidden');
}

function closeAuthModal() {
  if (elements.authModal) elements.authModal.classList.add('hidden');
}

function setAuthMode(mode) {
  state.authMode = mode;
  if (mode === 'register') {
    elements.authModalTitle.textContent = 'Kayıt Ol';
    elements.authNameGroup.classList.remove('hidden');
    elements.authConfirmGroup.classList.remove('hidden');
    elements.authPasswordGroup.classList.remove('hidden');
    elements.btnAuthSubmit.textContent = 'Kayıt Ol ve Başla';
    elements.btnToggleAuthMode.textContent = 'Zaten hesabınız var mı? Giriş Yapın';
    if (elements.btnForgotPass) elements.btnForgotPass.classList.add('hidden');
  } else if (mode === 'login') {
    elements.authModalTitle.textContent = 'Giriş Yap';
    elements.authNameGroup.classList.add('hidden');
    elements.authConfirmGroup.classList.add('hidden');
    elements.authPasswordGroup.classList.remove('hidden');
    elements.btnAuthSubmit.textContent = 'Giriş Yap';
    elements.btnToggleAuthMode.textContent = 'Hesabınız yok mu? Kaydolun';
    if (elements.btnForgotPass) elements.btnForgotPass.classList.remove('hidden');
  } else if (mode === 'forgot') {
    elements.authModalTitle.textContent = 'Şifre Sıfırlama';
    elements.authNameGroup.classList.add('hidden');
    elements.authConfirmGroup.classList.add('hidden');
    elements.authPasswordGroup.classList.remove('hidden');
    elements.btnAuthSubmit.textContent = 'Yeni Şifreyi Kaydet';
    elements.btnToggleAuthMode.textContent = 'Giriş Ekranına Dön';
    if (elements.btnForgotPass) elements.btnForgotPass.classList.add('hidden');
  }
}

function toggleAuthMode() {
  if (state.authMode === 'login') {
    setAuthMode('register');
  } else {
    setAuthMode('login');
  }
}

// --- User Profile Details View Modal ---
function openMemberDetails(userName, userEmail) {
  if (!state.currentUser) {
    if (elements.lockWarningModal) elements.lockWarningModal.classList.remove('hidden');
    return;
  }

  const memberEntries = state.entries.filter(e => e.userEmail === userEmail || e.userName === userName);
  const todayStr = getTodayString();
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = formatDateToYYYYMMDD(yesterdayObj);

  const todaySec = memberEntries.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.totalSeconds, 0);
  const yesterdaySec = memberEntries.filter(e => e.date === yesterdayStr).reduce((sum, e) => sum + e.totalSeconds, 0);
  const overallSec = memberEntries.reduce((sum, e) => sum + e.totalSeconds, 0);

  if (elements.userModalName) elements.userModalName.textContent = userName;
  if (elements.userModalEmail) elements.userModalEmail.textContent = userEmail || 'Ekip Üyesi';
  if (elements.userModalAvatar) elements.userModalAvatar.textContent = userName.charAt(0).toUpperCase();
  if (elements.userModalTodayTotal) elements.userModalTodayTotal.textContent = formatDuration(todaySec);
  if (elements.userModalYesterdayTotal) elements.userModalYesterdayTotal.textContent = formatDuration(yesterdaySec);
  if (elements.userModalOverallTotal) elements.userModalOverallTotal.textContent = formatDuration(overallSec);

  if (elements.userModalTableBody) {
    if (memberEntries.length === 0) {
      elements.userModalTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 20px;">Henüz bu üyeye ait çalışma kaydı bulunmuyor.</td></tr>`;
    } else {
      elements.userModalTableBody.innerHTML = memberEntries.map(e => `
        <tr>
          <td><strong>${e.date}</strong> <span class="badge-day">${e.dayName}</span></td>
          <td><span class="badge-category">${e.category}</span></td>
          <td>${escapeHtml(e.note || '-')}</td>
          <td class="text-right"><strong class="duration-text">${formatDurationDetailed(e.totalSeconds)}</strong></td>
        </tr>
      `).join('');
    }
  }

  if (elements.userDetailsModal) elements.userDetailsModal.classList.remove('hidden');
}

// --- 3 Themes Handler ---
function loadTheme() {
  document.body.classList.remove('dark-theme', 'light-theme', 'midnight-theme');
  document.body.classList.add(`${state.theme}-theme`);

  if (elements.themeIconMoon) elements.themeIconMoon.classList.add('hidden');
  if (elements.themeIconSun) elements.themeIconSun.classList.add('hidden');
  if (elements.themeIconMidnight) elements.themeIconMidnight.classList.add('hidden');

  if (state.theme === 'light') {
    if (elements.themeIconSun) elements.themeIconSun.classList.remove('hidden');
  } else if (state.theme === 'midnight') {
    if (elements.themeIconMidnight) elements.themeIconMidnight.classList.remove('hidden');
  } else {
    if (elements.themeIconMoon) elements.themeIconMoon.classList.remove('hidden');
  }

  [elements.themeOptDark, elements.themeOptLight, elements.themeOptMidnight].forEach(opt => {
    if (opt) opt.classList.remove('active');
  });
  if (state.theme === 'dark' && elements.themeOptDark) elements.themeOptDark.classList.add('active');
  if (state.theme === 'light' && elements.themeOptLight) elements.themeOptLight.classList.add('active');
  if (state.theme === 'midnight' && elements.themeOptMidnight) elements.themeOptMidnight.classList.add('active');
}

function setTheme(themeName) {
  state.theme = themeName;
  localStorage.setItem('saattakip_theme', state.theme);
  loadTheme();
  renderChart();
  if (elements.themeDropdown) elements.themeDropdown.classList.remove('show');
  showToast(`${themeName === 'dark' ? 'Koyu Gece' : themeName === 'light' ? 'Aydınlık' : 'Gece Mavisi'} tema aktif.`, 'info');
}

// --- Default Date Form Setup ---
function setupDateDefault() {
  const todayStr = getTodayString();
  if (elements.entryDate) elements.entryDate.value = todayStr;
  if (elements.entryDayBadge) elements.entryDayBadge.textContent = getDayNameTR(todayStr);
}

// --- Event Listeners ---
function setupEventListeners() {
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.themeDropdown) elements.themeDropdown.classList.toggle('show');
    });
  }

  if (elements.themeOptDark) elements.themeOptDark.addEventListener('click', () => setTheme('dark'));
  if (elements.themeOptLight) elements.themeOptLight.addEventListener('click', () => setTheme('light'));
  if (elements.themeOptMidnight) elements.themeOptMidnight.addEventListener('click', () => setTheme('midnight'));

  document.querySelectorAll('.btn-eye-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.for;
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  if (elements.btnOpenLogin) elements.btnOpenLogin.addEventListener('click', openAuthModal);
  if (elements.btnAuthModalClose) elements.btnAuthModalClose.addEventListener('click', closeAuthModal);
  if (elements.btnToggleAuthMode) elements.btnToggleAuthMode.addEventListener('click', toggleAuthMode);
  if (elements.btnForgotPass) elements.btnForgotPass.addEventListener('click', () => setAuthMode('forgot'));
  if (elements.authForm) elements.authForm.addEventListener('submit', handleAuthSubmit);
  if (elements.btnLogout) elements.btnLogout.addEventListener('click', handleLogout);

  if (elements.btnLockClose) elements.btnLockClose.addEventListener('click', () => elements.lockWarningModal.classList.add('hidden'));
  if (elements.btnLockLogin) {
    elements.btnLockLogin.addEventListener('click', () => {
      elements.lockWarningModal.classList.add('hidden');
      openAuthModal();
    });
  }

  if (elements.btnUserModalClose) elements.btnUserModalClose.addEventListener('click', () => elements.userDetailsModal.classList.add('hidden'));

  if (elements.teamMembersGrid) {
    elements.teamMembersGrid.addEventListener('click', (e) => {
      const userCard = e.target.closest('.user-card-item');
      if (userCard) {
        const email = userCard.dataset.userEmail;
        const name = userCard.dataset.userName;
        openMemberDetails(name, email);
      }
    });
  }

  if (elements.entryDate) {
    elements.entryDate.addEventListener('change', (e) => {
      if (elements.entryDayBadge) elements.entryDayBadge.textContent = getDayNameTR(e.target.value);
    });
  }

  if (elements.addForm) {
    elements.addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.currentUser) {
        showToast('Çalışma kaydı eklemek için lütfen önce Giriş Yapın.', 'danger');
        openAuthModal();
        return;
      }
      handleAddEntry();
    });
  }

  if (elements.presetBtns) {
    elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const addH = parseInt(btn.dataset.h) || 0;
        const addM = parseInt(btn.dataset.m) || 0;

        let curH = parseInt(elements.entryHours.value) || 0;
        let curM = parseInt(elements.entryMinutes.value) || 0;

        if (addH === 8 || addH === 4) {
          elements.entryHours.value = addH;
          elements.entryMinutes.value = 0;
          elements.entrySeconds.value = 0;
        } else {
          curM += addM;
          if (curM >= 60) {
            curH += Math.floor(curM / 60);
            curM = curM % 60;
          }
          curH += addH;
          elements.entryHours.value = curH;
          elements.entryMinutes.value = curM;
        }
      });
    });
  }

  if (elements.timerToggleBtn) {
    elements.timerToggleBtn.addEventListener('click', () => {
      if (!state.currentUser && !state.timer.isRunning) {
        showToast('Kronometre başlatmak için lütfen önce Giriş Yapın.', 'danger');
        openAuthModal();
        return;
      }
      toggleTimer();
    });
  }
  if (elements.timerResetBtn) elements.timerResetBtn.addEventListener('click', resetTimer);

  if (elements.chartTabWeek) {
    elements.chartTabWeek.addEventListener('click', () => {
      state.chartPeriod = 'week';
      elements.chartTabWeek.classList.add('active');
      if (elements.chartTabMonth) elements.chartTabMonth.classList.remove('active');
      renderChart();
    });
  }
  if (elements.chartTabMonth) {
    elements.chartTabMonth.addEventListener('click', () => {
      state.chartPeriod = 'month';
      elements.chartTabMonth.classList.add('active');
      if (elements.chartTabWeek) elements.chartTabWeek.classList.remove('active');
      renderChart();
    });
  }

  if (elements.tableSearch) {
    elements.tableSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderTable();
    });
  }

  if (elements.tableFilterPeriod) {
    elements.tableFilterPeriod.addEventListener('change', (e) => {
      state.filterPeriod = e.target.value;
      renderTable();
    });
  }

  if (elements.tableFilterUser) {
    elements.tableFilterUser.addEventListener('change', (e) => {
      state.userFilter = e.target.value;
      renderTable();
    });
  }

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (state.sortField === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = 'desc';
      }
      renderTable();
    });
  });

  if (elements.tableBody) {
    elements.tableBody.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        deleteEntry(id);
        return;
      }
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
        return;
      }
    });
  }

  if (elements.btnDataMenu) {
    elements.btnDataMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.dataDropdown) elements.dataDropdown.classList.toggle('show');
    });
  }

  document.addEventListener('click', (e) => {
    if (elements.btnDataMenu && elements.dataDropdown) {
      if (!elements.btnDataMenu.contains(e.target) && !elements.dataDropdown.contains(e.target)) {
        elements.dataDropdown.classList.remove('show');
      }
    }
    if (elements.themeToggleBtn && elements.themeDropdown) {
      if (!elements.themeToggleBtn.contains(e.target) && !elements.themeDropdown.contains(e.target)) {
        elements.themeDropdown.classList.remove('show');
      }
    }
  });

  if (elements.btnQuickSample) {
    elements.btnQuickSample.addEventListener('click', () => {
      if (elements.dataDropdown) elements.dataDropdown.classList.remove('show');
      loadSampleData();
    });
  }

  if (elements.btnExportJson) elements.btnExportJson.addEventListener('click', exportJSON);
  if (elements.btnExportCsv) elements.btnExportCsv.addEventListener('click', exportCSV);
  if (elements.importFileInput) elements.importFileInput.addEventListener('change', importJSON);
  if (elements.btnClearAll) elements.btnClearAll.addEventListener('click', clearAllEntries);

  if (elements.btnModalClose) elements.btnModalClose.addEventListener('click', closeModal);
  if (elements.btnModalCancel) elements.btnModalCancel.addEventListener('click', closeModal);
  if (elements.editForm) elements.editForm.addEventListener('submit', handleEditSubmit);
}

// --- Live Timer Logic ---
function toggleTimer() {
  if (state.timer.isRunning) {
    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;

    const totalSec = state.timer.seconds;
    if (totalSec > 0) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      const newEntry = {
        id: 'entry_' + Date.now(),
        userId: state.currentUser ? state.currentUser.id : null,
        userName: state.currentUser ? state.currentUser.name : 'Anonim',
        userEmail: state.currentUser ? state.currentUser.email : null,
        date: getTodayString(),
        dayName: getDayNameTR(getTodayString()),
        hours: h,
        minutes: m,
        seconds: s,
        totalSeconds: totalSec,
        category: elements.timerCategory ? elements.timerCategory.value : 'Genel Çalışma',
        note: elements.timerNote ? elements.timerNote.value.trim() : 'Kronometre İle Kaydedildi',
        createdAt: new Date().toISOString()
      };

      state.entries.unshift(newEntry);
      saveEntries(newEntry, 'add');
      showToast(`Kronometre süresi (${formatDurationDetailed(totalSec)}) kaydedildi!`, 'success');

      if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    }

    resetTimer();

  } else {
    state.timer.isRunning = true;
    if (elements.timerBtnText) elements.timerBtnText.textContent = 'Durdur ve Kaydet';
    if (elements.timerToggleBtn) {
      elements.timerToggleBtn.classList.remove('btn-primary');
      elements.timerToggleBtn.classList.add('btn-secondary');
    }
    if (elements.timerResetBtn) elements.timerResetBtn.disabled = false;

    state.timer.intervalId = setInterval(() => {
      state.timer.seconds++;
      if (elements.timerDisplay) elements.timerDisplay.textContent = formatTimeDigital(state.timer.seconds);
    }, 1000);

    showToast('Kronometre başlatıldı', 'info');
  }
}

function resetTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.isRunning = false;
  state.timer.seconds = 0;
  if (elements.timerDisplay) elements.timerDisplay.textContent = '00:00:00';
  if (elements.timerBtnText) elements.timerBtnText.textContent = 'Başlat';
  if (elements.timerToggleBtn) {
    elements.timerToggleBtn.classList.remove('btn-secondary');
    elements.timerToggleBtn.classList.add('btn-primary');
  }
  if (elements.timerResetBtn) elements.timerResetBtn.disabled = true;
  if (elements.timerNote) elements.timerNote.value = '';
}

// --- Add Manual Entry ---
function handleAddEntry() {
  const dateStr = elements.entryDate.value;
  const hours = parseInt(elements.entryHours.value) || 0;
  const minutes = parseInt(elements.entryMinutes.value) || 0;
  const seconds = parseInt(elements.entrySeconds.value) || 0;
  const category = elements.entryCategory.value;
  const note = elements.entryNote.value.trim();

  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

  if (totalSeconds <= 0) {
    showToast('Lütfen geçerli bir çalışma süresi girin (saat, dakika veya saniye).', 'danger');
    return;
  }

  const newEntry = {
    id: 'entry_' + Date.now(),
    userId: state.currentUser ? state.currentUser.id : null,
    userName: state.currentUser ? state.currentUser.name : 'Anonim',
    userEmail: state.currentUser ? state.currentUser.email : null,
    date: dateStr,
    dayName: getDayNameTR(dateStr),
    hours,
    minutes,
    seconds,
    totalSeconds,
    category,
    note: note || 'Çalışma Kaydı',
    createdAt: new Date().toISOString()
  };

  state.entries.unshift(newEntry);
  saveEntries(newEntry, 'add');

  elements.entryHours.value = 0;
  elements.entryMinutes.value = 0;
  elements.entrySeconds.value = 0;
  elements.entryNote.value = '';

  showToast(`${dateStr} tarihine ${formatDurationDetailed(totalSeconds)} kayıt eklendi.`, 'success');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  }
}

// --- Update Master UI ---
function updateUI() {
  calculateStats();
  renderChart();
  renderTable();
}

// --- Calculate Statistics (STRICT ZERO WHEN LOGGED OUT OR EMPTY) ---
function calculateStats() {
  if (!elements.statWeeklyTotal) return;

  // IF USER IS LOGGED OUT OR ENTRIES EMPTY -> STRICT ZERO RESET!
  if (!state.currentUser || !state.entries || state.entries.length === 0) {
    elements.statWeeklyTotal.textContent = '0s 0dk';
    elements.statWeeklyAvg.textContent = '0s 0dk / gün';
    elements.statMonthlyTotal.textContent = '0s 0dk';
    elements.statMonthlyAvg.textContent = '0s 0dk / gün';
    elements.statOverallDailyAvg.textContent = '0s 0dk';
    elements.statTotalDays.textContent = '0 gün';
    elements.statGoalPercent.textContent = '%0';
    if (elements.goalProgressFill) elements.goalProgressFill.style.width = '0%';
    return;
  }

  const now = new Date();
  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);

  let weeklySeconds = 0;
  const weeklyDaysSet = new Set();

  let monthlySeconds = 0;
  const monthlyDaysSet = new Set();

  let totalOverallSeconds = 0;
  const overallDaysSet = new Set();

  // Filter stats for current logged-in user or active selection
  const userEntries = state.userFilter === 'mine'
    ? state.entries.filter(e => e.userEmail === state.currentUser.email || e.userId === state.currentUser.id)
    : state.entries;

  userEntries.forEach(entry => {
    const entryDate = parseEntryDate(entry.date);
    totalOverallSeconds += entry.totalSeconds;
    overallDaysSet.add(entry.date);

    if (entryDate >= weekRange.start && entryDate <= weekRange.end) {
      weeklySeconds += entry.totalSeconds;
      weeklyDaysSet.add(entry.date);
    }

    if (entryDate >= monthRange.start && entryDate <= monthRange.end) {
      monthlySeconds += entry.totalSeconds;
      monthlyDaysSet.add(entry.date);
    }
  });

  // Weekly Stats
  elements.statWeeklyTotal.textContent = formatDuration(weeklySeconds);
  const weeklyDaysCount = weeklyDaysSet.size || 1;
  const weeklyAvgSec = weeklySeconds > 0 ? Math.round(weeklySeconds / weeklyDaysCount) : 0;
  elements.statWeeklyAvg.textContent = `${formatDuration(weeklyAvgSec)} / gün`;

  // Monthly Stats
  elements.statMonthlyTotal.textContent = formatDuration(monthlySeconds);
  const monthlyDaysCount = monthlyDaysSet.size || 1;
  const monthlyAvgSec = monthlySeconds > 0 ? Math.round(monthlySeconds / monthlyDaysCount) : 0;
  elements.statMonthlyAvg.textContent = `${formatDuration(monthlyAvgSec)} / gün`;

  // Overall Stats
  const totalDaysCount = overallDaysSet.size;
  const overallAvgSec = totalDaysCount > 0 ? Math.round(totalOverallSeconds / totalDaysCount) : 0;
  elements.statOverallDailyAvg.textContent = formatDuration(overallAvgSec);
  elements.statTotalDays.textContent = `${totalDaysCount} gün`;

  // Goal Progress (40h/week)
  const targetSec = 40 * 3600;
  const goalPercent = Math.min(100, Math.round((weeklySeconds / targetSec) * 100));
  elements.statGoalPercent.textContent = `%${goalPercent}`;
  if (elements.goalProgressFill) elements.goalProgressFill.style.width = `${goalPercent}%`;
}

// --- Render Chart.js ---
function renderChart() {
  if (!elements.chartCanvas) return;

  const ctx = elements.chartCanvas.getContext('2d');
  const now = new Date();

  let labels = [];
  let dataHours = [];

  const userEntries = (!state.currentUser)
    ? []
    : (state.userFilter === 'mine'
      ? state.entries.filter(e => e.userEmail === state.currentUser.email || e.userId === state.currentUser.id)
      : state.entries);

  if (state.chartPeriod === 'week') {
    const weekRange = getWeekRange(now);
    const curr = new Date(weekRange.start);

    for (let i = 0; i < 7; i++) {
      const dateStr = formatDateToYYYYMMDD(curr);
      const dayName = DAY_NAMES_TR[curr.getDay()];
      labels.push(`${dayName} (${curr.getDate()}/${curr.getMonth() + 1})`);

      const dayTotalSec = userEntries
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.totalSeconds, 0);

      dataHours.push(Number((dayTotalSec / 3600).toFixed(2)));
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    const monthRange = getMonthRange(now);
    const daysInMonth = monthRange.end.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = formatDateToYYYYMMDD(dateObj);
      labels.push(`${d}`);

      const dayTotalSec = userEntries
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.totalSeconds, 0);

      dataHours.push(Number((dayTotalSec / 3600).toFixed(2)));
    }
  }

  const isLight = state.theme === 'light';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  const textColor = isLight ? '#475569' : '#9ca3af';

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  if (state.theme === 'midnight') {
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.85)');
    gradient.addColorStop(1, 'rgba(20, 184, 166, 0.2)');
  } else {
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.2)');
  }

  if (workChartInstance) {
    workChartInstance.destroy();
  }

  workChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Çalışma Süresi (Saat)',
        data: dataHours,
        backgroundColor: gradient,
        borderColor: state.theme === 'midnight' ? '#0ea5e9' : '#6366f1',
        borderWidth: 1,
        borderRadius: 5,
        hoverBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const hoursDecimal = context.raw;
              const totalSec = Math.round(hoursDecimal * 3600);
              return ` Toplam Süre: ${formatDurationDetailed(totalSec)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 10 },
            callback: value => `${value}s`
          }
        }
      }
    }
  });
}

// --- Render Table ---
function renderTable() {
  if (!elements.tableBody) return;

  // IF USER IS LOGGED OUT -> SHOW LOCKED EMPTY STATE
  if (!state.currentUser) {
    elements.tableBody.innerHTML = '';
    if (elements.tableFilteredTotal) elements.tableFilteredTotal.textContent = '0s 0dk 0sn';
    if (elements.emptyState) {
      elements.emptyState.classList.remove('hidden');
      elements.emptyState.querySelector('h4').textContent = 'Giriş Yapılmadı';
      elements.emptyState.querySelector('p').textContent = 'Çalışma saatlerinizi görmek ve yeni süre eklemek için lütfen giriş yapın.';
    }
    return;
  }

  const now = new Date();
  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);

  let filtered = state.entries.filter(entry => {
    const entryDate = parseEntryDate(entry.date);

    if (state.userFilter === 'mine' && state.currentUser) {
      if (entry.userEmail !== state.currentUser.email && entry.userId !== state.currentUser.id) {
        return false;
      }
    }

    if (state.filterPeriod === 'this-week') {
      if (entryDate < weekRange.start || entryDate > weekRange.end) return false;
    } else if (state.filterPeriod === 'this-month') {
      if (entryDate < monthRange.start || entryDate > monthRange.end) return false;
    }

    if (state.searchQuery) {
      const matchNote = (entry.note || '').toLowerCase().includes(state.searchQuery);
      const matchCat = (entry.category || '').toLowerCase().includes(state.searchQuery);
      const matchDay = (entry.dayName || '').toLowerCase().includes(state.searchQuery);
      const matchUser = (entry.userName || '').toLowerCase().includes(state.searchQuery);
      if (!matchNote && !matchCat && !matchDay && !matchUser) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    let valA = a[state.sortField];
    let valB = b[state.sortField];

    if (state.sortField === 'duration') {
      valA = a.totalSeconds;
      valB = b.totalSeconds;
    }

    if (valA < valB) return state.sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return state.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredTotalSec = filtered.reduce((sum, e) => sum + e.totalSeconds, 0);
  if (elements.tableFilteredTotal) elements.tableFilteredTotal.textContent = formatDurationDetailed(filteredTotalSec);

  if (filtered.length === 0) {
    elements.tableBody.innerHTML = '';
    if (elements.emptyState) {
      elements.emptyState.classList.remove('hidden');
      elements.emptyState.querySelector('h4').textContent = 'Henüz çalışma kaydı bulunmuyor';
      elements.emptyState.querySelector('p').textContent = 'Yukarıdaki formdan manuel süre ekleyebilir veya canlı kronometreyi kullanabilirsiniz.';
    }
    return;
  } else {
    if (elements.emptyState) elements.emptyState.classList.add('hidden');
  }

  elements.tableBody.innerHTML = filtered.map(entry => `
    <tr>
      <td>
        <strong>${entry.date}</strong>
        <span class="badge-day">${entry.dayName}</span>
      </td>
      <td>
        <span class="user-tag">👤 ${escapeHtml(entry.userName || 'Ortak')}</span>
      </td>
      <td>
        <span class="badge-category">${entry.category}</span>
      </td>
      <td>${escapeHtml(entry.note || '-')}</td>
      <td class="text-right">
        <span class="duration-text">${formatDurationDetailed(entry.totalSeconds)}</span>
      </td>
      <td class="text-center">
        <div class="action-btn-group">
          <button class="btn-action-icon btn-edit" data-id="${entry.id}" title="Düzenle">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-action-icon danger btn-delete" data-id="${entry.id}" title="Sil">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// --- Edit Entry Handler ---
function openEditModal(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;

  elements.editId.value = entry.id;
  elements.editDate.value = entry.date;
  elements.editHours.value = entry.hours;
  elements.editMinutes.value = entry.minutes;
  elements.editSeconds.value = entry.seconds;
  elements.editCategory.value = entry.category;
  elements.editNote.value = entry.note;

  elements.editModal.classList.remove('hidden');
}

function closeModal() {
  if (elements.editModal) elements.editModal.classList.add('hidden');
}

function handleEditSubmit(e) {
  e.preventDefault();
  const id = elements.editId.value;
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;

  const dateStr = elements.editDate.value;
  const h = parseInt(elements.editHours.value) || 0;
  const m = parseInt(elements.editMinutes.value) || 0;
  const s = parseInt(elements.editSeconds.value) || 0;
  const totalSec = (h * 3600) + (m * 60) + s;

  if (totalSec <= 0) {
    showToast('Lütfen geçerli bir süre girin.', 'danger');
    return;
  }

  entry.date = dateStr;
  entry.dayName = getDayNameTR(dateStr);
  entry.hours = h;
  entry.minutes = m;
  entry.seconds = s;
  entry.totalSeconds = totalSec;
  entry.category = elements.editCategory.value;
  entry.note = elements.editNote.value.trim();

  saveEntries(entry, 'update');
  closeModal();
  showToast('Kayıt başarıyla güncellendi.', 'success');
}

// --- Delete Entry ---
function deleteEntry(id) {
  const targetEntry = state.entries.find(e => e.id === id);
  state.entries = state.entries.filter(e => e.id !== id);
  saveEntries(targetEntry, 'delete');
  showToast('Kayıt silindi.', 'info');
}

// --- Export & Import Handlers ---
function exportJSON() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.entries, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `saattakip_yedek_${getTodayString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Tüm veriler JSON olarak indirildi.', 'success');
}

function exportCSV() {
  if (state.entries.length === 0) {
    showToast('Dışa aktarılacak veri yok.', 'danger');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += 'Tarih;Gün;Kullanıcı;Saat;Dakika;Saniye;Toplam Saniye;Kategori;Not\n';

  state.entries.forEach(e => {
    csvContent += `"${e.date}";"${e.dayName}";"${e.userName || 'Anonim'}";${e.hours};${e.minutes};${e.seconds};${e.totalSeconds};"${e.category}";"${e.note || ''}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `saattakip_rapor_${getTodayString()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Tüm veriler CSV (Excel) formatında indirildi.', 'success');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        state.entries = imported;
        saveEntries();
        showToast(`${imported.length} kayıt başarıyla içe aktarıldı.`, 'success');
      } else {
        showToast('Geçersiz dosya formatı.', 'danger');
      }
    } catch (err) {
      showToast('JSON okunurken hata oluştu.', 'danger');
    }
  };
  reader.readAsText(file);
}

function clearAllEntries() {
  if (confirm('TÜM çalışma kayıtlarınız silinecek! Bu işlem geri alınamaz. Emin misiniz?')) {
    state.entries = [];
    localStorage.removeItem('saattakip_entries');
    saveEntries(null, 'clearAll');
    showToast('Tüm veriler temizlendi.', 'info');
  }
}

// --- Sample Data Loader ---
function loadSampleData() {
  const today = new Date();
  const sampleEntries = [];

  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateToYYYYMMDD(d);

    if (d.getDay() === 0) continue;

    const h = 6 + (i % 3);
    const m = (i * 12) % 60;
    const s = (i * 7) % 60;
    const totalSec = (h * 3600) + (m * 60) + s;

    const categories = ['Yazılım / Proje', 'Genel Çalışma', 'Toplantı', 'Tasarım', 'Araştırma'];
    const notes = [
      'Frontend geliştirmeleri ve arayüz optimizasyonu',
      'Müşteri toplantısı ve gereksinim analizi',
      'Veritabanı tasarımı ve API entegrasyonu',
      'Haftalık planlama ve kod incelemesi',
      'Bileşen tasarımı ve responsive testler'
    ];

    sampleEntries.push({
      id: 'sample_' + i,
      userId: state.currentUser ? state.currentUser.id : null,
      userName: state.currentUser ? state.currentUser.name : "",
      userEmail: state.currentUser ? state.currentUser.email : null,
      date: dateStr,
      dayName: getDayNameTR(dateStr),
      hours: h,
      minutes: m,
      seconds: s,
      totalSeconds: totalSec,
      category: categories[i % categories.length],
      note: notes[i % notes.length],
      createdAt: new Date().toISOString()
    });
  }

  state.entries = sampleEntries;
  saveEntries();
  showToast('Örnek veriler yüklendi!', 'success');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 50, spread: 60 });
  }
}

// --- Utilities ---
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Start Application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', init);
