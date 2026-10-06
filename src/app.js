/* ==========================================================================
   SaatTakip - Main Application Logic (DOM-Safe & Bulletproof Stats)
   ========================================================================== */

// --- Turkish Day Names Helper ---
const DAY_NAMES_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi'
];

// --- State ---
let state = {
  entries: [],
  theme: localStorage.getItem('saattakip_theme') || 'dark',
  useMongo: false,
  timer: {
    isRunning: false,
    seconds: 0,
    intervalId: null
  },
  chartPeriod: 'week', // 'week' or 'month'
  filterPeriod: 'this-week', // 'all', 'this-week', 'this-month'
  searchQuery: '',
  sortField: 'date',
  sortOrder: 'desc'
};

let elements = {};
let workChartInstance = null;

// --- Initialize App ---
async function init() {
  // Bind DOM Elements safely after DOM is loaded
  elements = {
    app: document.getElementById('app'),
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    
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
  setupDateDefault();
  setupEventListeners();
  await loadEntries();
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

// --- Date Range Calculation ---
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

async function saveEntries(newOrUpdatedEntry = null, actionType = 'save') {
  localStorage.setItem('saattakip_entries', JSON.stringify(state.entries));
  updateUI();

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

// --- Theme Handler ---
function loadTheme() {
  if (state.theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    if (elements.themeIconMoon) elements.themeIconMoon.classList.add('hidden');
    if (elements.themeIconSun) elements.themeIconSun.classList.remove('hidden');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    if (elements.themeIconMoon) elements.themeIconMoon.classList.remove('hidden');
    if (elements.themeIconSun) elements.themeIconSun.classList.add('hidden');
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('saattakip_theme', state.theme);
  loadTheme();
  renderChart();
  showToast(state.theme === 'dark' ? 'Koyu tema aktif' : 'Açık tema aktif', 'info');
}

// --- Default Date Form Setup ---
function setupDateDefault() {
  const todayStr = getTodayString();
  if (elements.entryDate) elements.entryDate.value = todayStr;
  if (elements.entryDayBadge) elements.entryDayBadge.textContent = getDayNameTR(todayStr);
}

// --- Event Listeners ---
function setupEventListeners() {
  if (elements.themeToggleBtn) elements.themeToggleBtn.addEventListener('click', toggleTheme);

  if (elements.entryDate) {
    elements.entryDate.addEventListener('change', (e) => {
      if (elements.entryDayBadge) elements.entryDayBadge.textContent = getDayNameTR(e.target.value);
    });
  }

  if (elements.addForm) {
    elements.addForm.addEventListener('submit', (e) => {
      e.preventDefault();
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

  if (elements.timerToggleBtn) elements.timerToggleBtn.addEventListener('click', toggleTimer);
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

// --- Calculate Statistics (Strict Reset When Empty) ---
function calculateStats() {
  if (!elements.statWeeklyTotal) return;

  if (!state.entries || state.entries.length === 0) {
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

  state.entries.forEach(entry => {
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

  if (state.chartPeriod === 'week') {
    const weekRange = getWeekRange(now);
    const curr = new Date(weekRange.start);

    for (let i = 0; i < 7; i++) {
      const dateStr = formatDateToYYYYMMDD(curr);
      const dayName = DAY_NAMES_TR[curr.getDay()];
      labels.push(`${dayName} (${curr.getDate()}/${curr.getMonth() + 1})`);

      const dayTotalSec = state.entries
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

      const dayTotalSec = state.entries
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.totalSeconds, 0);

      dataHours.push(Number((dayTotalSec / 3600).toFixed(2)));
    }
  }

  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#9ca3af' : '#475569';

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.2)');

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
        borderColor: '#6366f1',
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
            label: function(context) {
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

  const now = new Date();
  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);

  let filtered = state.entries.filter(entry => {
    const entryDate = parseEntryDate(entry.date);

    if (state.filterPeriod === 'this-week') {
      if (entryDate < weekRange.start || entryDate > weekRange.end) return false;
    } else if (state.filterPeriod === 'this-month') {
      if (entryDate < monthRange.start || entryDate > monthRange.end) return false;
    }

    if (state.searchQuery) {
      const matchNote = entry.note.toLowerCase().includes(state.searchQuery);
      const matchCat = entry.category.toLowerCase().includes(state.searchQuery);
      const matchDay = entry.dayName.toLowerCase().includes(state.searchQuery);
      if (!matchNote && !matchCat && !matchDay) return false;
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
    if (elements.emptyState) elements.emptyState.classList.remove('hidden');
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
  csvContent += 'Tarih;Gün;Saat;Dakika;Saniye;Toplam Saniye;Kategori;Not\n';

  state.entries.forEach(e => {
    csvContent += `"${e.date}";"${e.dayName}";${e.hours};${e.minutes};${e.seconds};${e.totalSeconds};"${e.category}";"${e.note || ''}"\n`;
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
  reader.onload = function(event) {
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
