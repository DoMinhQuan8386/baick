/**
 * ==============================================================================
 * STUDY HABIT TRACKER - PRESENTATION & INTERACTION ENGINE (app.js)
 * Controls View Rendering, Pomodoro Timer, Heatmap, SVG Chart & Settings
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupStreakNavbar();

  // Detect which page is currently loaded
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html')) {
    renderHomePage();
  } else if (path.endsWith('statistics.html')) {
    renderStatisticsPage();
  } else if (path.endsWith('pomodoro.html')) {
    renderPomodoroPage();
  } else if (path.endsWith('settings.html')) {
    renderSettingsPage();
  }
});

/* ==============================================================================
   1. NAVIGATION & GENERAL UI
   ============================================================================== */
function setupNavigation() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  // Set active class according to filename
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentFile || (currentFile === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function setupStreakNavbar() {
  const streakPill = document.getElementById('navStreakCount');
  if (streakPill) {
    const streak = habitEngine.getStreak();
    streakPill.textContent = `${streak.currentStreak} ngày`;
  }
}

/* ==============================================================================
   2. HOME PAGE (DASHBOARD)
   ============================================================================== */
function renderHomePage() {
  const settings = habitEngine.getSettings();
  const streak = habitEngine.getStreak();
  const todayMinutes = habitEngine.getTodayMinutes();
  const dailyGoal = settings.dailyGoalMinutes;

  // Lời chào theo thời gian trong ngày
  const greetingEl = document.getElementById('userGreeting');
  const hour = new Date().getHours();
  let timeOfDayGreeting = 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) timeOfDayGreeting = 'Chào buổi chiều';
  else if (hour >= 18) timeOfDayGreeting = 'Chào buổi tối';

  if (greetingEl) {
    greetingEl.innerHTML = `${timeOfDayGreeting}, <span>${settings.userName}</span>! 👋`;
  }

  // Cập nhật các thẻ KPI
  const streakDisplay = document.getElementById('homeStreakValue');
  if (streakDisplay) streakDisplay.textContent = `${streak.currentStreak} ngày`;

  const todayMinutesEl = document.getElementById('homeTodayMinutes');
  if (todayMinutesEl) todayMinutesEl.textContent = `${todayMinutes} phút`;

  const dailyGoalEl = document.getElementById('homeDailyGoal');
  if (dailyGoalEl) dailyGoalEl.textContent = `${dailyGoal} phút`;

  // Progress Bar
  const percent = Math.min(100, Math.round((todayMinutes / (dailyGoal || 1)) * 100));
  const progressFill = document.getElementById('homeProgressFill');
  const progressText = document.getElementById('homeProgressPercent');
  const progressDetails = document.getElementById('homeProgressDetails');

  if (progressFill && progressText) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    if (percent >= 100) {
      progressFill.classList.add('completed');
    }
  }

  if (progressDetails) {
    if (todayMinutes >= dailyGoal) {
      progressDetails.innerHTML = `🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu ngày hôm nay.`;
    } else {
      const remaining = dailyGoal - todayMinutes;
      progressDetails.innerHTML = `Còn <strong>${remaining} phút</strong> nữa để chạm mốc mục tiêu. Cố lên!`;
    }
  }

  // Huy hiệu đã mở khóa
  renderHomeBadges();

  // Nút Quick Log thời gian học
  setupQuickLog();
}

function renderHomeBadges() {
  const container = document.getElementById('homeBadgesContainer');
  const countEl = document.getElementById('homeBadgeCount');
  if (!container) return;

  const badges = habitEngine.getBadgesStatus();
  const unlockedCount = badges.filter(b => b.unlocked).length;

  if (countEl) {
    countEl.textContent = `${unlockedCount} / ${badges.length}`;
  }

  container.innerHTML = badges.map(b => `
    <div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
      <div class="badge-icon-wrap">${b.icon}</div>
      <div class="badge-title">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
      <div class="badge-status ${b.unlocked ? 'unlocked' : 'locked'}">
        ${b.unlocked ? '✓ Đã mở khóa' : '🔒 Đang khóa'}
      </div>
    </div>
  `).join('');
}

function setupQuickLog() {
  const quickBtns = document.querySelectorAll('.btn-quick-log');
  quickBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mins = parseInt(e.currentTarget.dataset.mins, 10);
      if (mins) {
        habitEngine.addStudyTime(mins, false);
        showToast(`Đã ghi nhận thêm +${mins} phút học tập!`, 'success');
        setupStreakNavbar();
        renderHomePage();
      }
    });
  });
}

/* ==============================================================================
   3. STATISTICS PAGE (HEATMAP & SVG 7-DAY BAR CHART)
   ============================================================================== */
function renderStatisticsPage() {
  const sessions = habitEngine.getAllSessions();
  const streak = habitEngine.getStreak();
  const settings = habitEngine.getSettings();

  // Tính tổng quan
  const dates = Object.keys(sessions).filter(d => sessions[d] > 0);
  const totalMinutes = dates.reduce((acc, d) => acc + sessions[d], 0);
  const totalDays = dates.length;
  const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  // Cập nhật KPI thống kê
  const totalHoursEl = document.getElementById('statTotalHours');
  if (totalHoursEl) {
    const hours = (totalMinutes / 60).toFixed(1);
    totalHoursEl.textContent = `${hours} giờ (${totalMinutes}p)`;
  }

  const totalDaysEl = document.getElementById('statTotalDays');
  if (totalDaysEl) totalDaysEl.textContent = `${totalDays} ngày`;

  const avgMinutesEl = document.getElementById('statAvgMinutes');
  if (avgMinutesEl) avgMinutesEl.textContent = `${avgMinutes} phút/ngày`;

  const longestStreakEl = document.getElementById('statLongestStreak');
  if (longestStreakEl) longestStreakEl.textContent = `${streak.longestStreak || 0} ngày`;

  // Render Calendar Heatmap (GitHub Contributions Style)
  renderHeatmap(sessions);

  // Render Biểu đồ 7 ngày gần nhất (SVG Bar Chart)
  render7DaySvgChart(sessions, settings.dailyGoalMinutes);
}

function renderHeatmap(sessions) {
  const container = document.getElementById('heatmapGrid');
  if (!container) return;

  container.innerHTML = '';
  const tooltip = getOrCreateTooltip();

  // Hiển thị 16 tuần gần nhất (112 ngày)
  const totalDays = 16 * 7;
  const today = new Date();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (totalDays - 1));

  for (let i = 0; i < totalDays; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + i);

    const year = curDate.getFullYear();
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const day = String(curDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const minutes = sessions[dateKey] || 0;

    // Phân cấp 5 mức độ (0 -> 4)
    let level = 0;
    if (minutes > 0 && minutes <= 25) level = 1;
    else if (minutes > 25 && minutes <= 60) level = 2;
    else if (minutes > 60 && minutes <= 120) level = 3;
    else if (minutes > 120) level = 4;

    const cell = document.createElement('div');
    cell.className = 'heat-cell';
    cell.dataset.level = level;
    cell.dataset.date = dateKey;
    cell.dataset.minutes = minutes;

    // Tooltip Events
    cell.addEventListener('mouseenter', (e) => {
      const d = e.target.dataset.date;
      const m = e.target.dataset.minutes;
      tooltip.innerHTML = `<strong>${d}</strong>: ${m} phút học`;
      tooltip.style.opacity = '1';
    });

    cell.addEventListener('mousemove', (e) => {
      tooltip.style.left = `${e.clientX + 10}px`;
      tooltip.style.top = `${e.clientY - 30}px`;
    });

    cell.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });

    container.appendChild(cell);
  }
}

function render7DaySvgChart(sessions, dailyGoal) {
  const svg = document.getElementById('weeklyChartSvg');
  if (!svg) return;

  // Lấy dữ liệu 7 ngày gần nhất
  const today = new Date();
  const daysData = [];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;

    daysData.push({
      dateKey: key,
      label: `${dayNames[d.getDay()]} (${day}/${month})`,
      minutes: sessions[key] || 0
    });
  }

  const maxVal = Math.max(dailyGoal * 1.25, ...daysData.map(d => d.minutes), 60);
  const chartHeight = 180;
  const chartWidth = 700;
  const barWidth = 44;
  const gap = (chartWidth - barWidth * 7) / 8;

  // Generate SVG Elements
  let svgContent = `
    <!-- Grid Lines -->
    <line x1="0" y1="20" x2="${chartWidth}" y2="20" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
    <line x1="0" y1="${chartHeight / 2}" x2="${chartWidth}" y2="${chartHeight / 2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
    <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="rgba(255,255,255,0.15)" />
  `;

  // Goal Line
  const goalY = chartHeight - (dailyGoal / maxVal) * (chartHeight - 30);
  svgContent += `
    <line x1="0" y1="${goalY}" x2="${chartWidth}" y2="${goalY}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6,4" />
    <text x="${chartWidth - 10}" y="${goalY - 6}" fill="#fbbf24" font-size="11" text-anchor="end" font-weight="600">Mục tiêu: ${dailyGoal}p</text>
  `;

  // Draw Bars
  daysData.forEach((item, idx) => {
    const x = gap + idx * (barWidth + gap);
    const barHeight = Math.max(6, (item.minutes / maxVal) * (chartHeight - 30));
    const y = chartHeight - barHeight;
    const isGoalMet = item.minutes >= dailyGoal;
    const barColor = isGoalMet ? 'url(#barGradientSuccess)' : 'url(#barGradientPrimary)';

    svgContent += `
      <!-- Bar with rounded top -->
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${barColor}">
        <title>${item.label}: ${item.minutes} phút</title>
      </rect>

      <!-- Minutes text on top of bar -->
      <text x="${x + barWidth / 2}" y="${y - 8}" fill="${isGoalMet ? '#34d399' : '#cbd5e1'}" font-size="12" font-weight="700" text-anchor="middle">
        ${item.minutes > 0 ? item.minutes + 'p' : '0'}
      </text>

      <!-- Day Label underneath -->
      <text x="${x + barWidth / 2}" y="${chartHeight + 22}" fill="#9ca3af" font-size="12" text-anchor="middle">
        ${item.label}
      </text>
    `;
  });

  // SVG Linear Gradients
  svg.innerHTML = `
    <defs>
      <linearGradient id="barGradientPrimary" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#4f46e5" />
      </linearGradient>
      <linearGradient id="barGradientSuccess" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
    </defs>
    ${svgContent}
  `;
}

function getOrCreateTooltip() {
  let tip = document.getElementById('customTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'customTooltip';
    tip.className = 'custom-tooltip';
    document.body.appendChild(tip);
  }
  return tip;
}

/* ==============================================================================
   4. POMODORO TIMER ENGINE
   ============================================================================== */
let pomodoroTimer = null;
let pomodoroState = {
  mode: 'study', // 'study' | 'shortBreak' | 'longBreak'
  timeLeft: 25 * 60,
  totalDuration: 25 * 60,
  isRunning: false
};

function renderPomodoroPage() {
  const settings = habitEngine.getSettings();
  
  pomodoroState.timeLeft = settings.studyDuration * 60;
  pomodoroState.totalDuration = settings.studyDuration * 60;

  updatePomodoroDisplay();

  const startBtn = document.getElementById('pomoStartBtn');
  const resetBtn = document.getElementById('pomoResetBtn');
  const modeBtns = document.querySelectorAll('.mode-btn');

  if (startBtn) {
    startBtn.addEventListener('click', togglePomodoro);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetPomodoro);
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.target.dataset.mode;
      switchPomodoroMode(mode);
    });
  });

  // Nút kết thúc sớm & lưu thời gian đã học
  const finishEarlyBtn = document.getElementById('pomoFinishEarlyBtn');
  if (finishEarlyBtn) {
    finishEarlyBtn.addEventListener('click', finishPomodoroEarly);
  }
}

function switchPomodoroMode(mode) {
  if (pomodoroState.isRunning) {
    clearInterval(pomodoroTimer);
    pomodoroState.isRunning = false;
  }

  const settings = habitEngine.getSettings();
  pomodoroState.mode = mode;

  if (mode === 'study') {
    pomodoroState.totalDuration = settings.studyDuration * 60;
  } else if (mode === 'shortBreak') {
    pomodoroState.totalDuration = settings.breakDuration * 60;
  } else if (mode === 'longBreak') {
    pomodoroState.totalDuration = 15 * 60;
  }

  pomodoroState.timeLeft = pomodoroState.totalDuration;

  // Update UI active buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const modeTag = document.getElementById('pomoModeTag');
  if (modeTag) {
    modeTag.textContent = mode === 'study' ? 'HỌC TẬP TẬP TRUNG' : 'NGHỈ NGƠI THƯ GIÃN';
  }

  const startBtn = document.getElementById('pomoStartBtn');
  if (startBtn) {
    startBtn.textContent = 'Bắt đầu';
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-primary');
  }

  updatePomodoroDisplay();
}

function togglePomodoro() {
  const startBtn = document.getElementById('pomoStartBtn');

  if (pomodoroState.isRunning) {
    // Tạm dừng
    clearInterval(pomodoroTimer);
    pomodoroState.isRunning = false;
    if (startBtn) {
      startBtn.textContent = 'Tiếp tục';
      startBtn.classList.remove('btn-danger');
      startBtn.classList.add('btn-primary');
    }
    showToast('Đồng hồ đã tạm dừng', 'info');
  } else {
    // Bắt đầu chạy
    pomodoroState.isRunning = true;
    if (startBtn) {
      startBtn.textContent = 'Tạm dừng';
      startBtn.classList.remove('btn-primary');
      startBtn.classList.add('btn-danger');
    }

    pomodoroTimer = setInterval(() => {
      if (pomodoroState.timeLeft > 0) {
        pomodoroState.timeLeft--;
        updatePomodoroDisplay();
      } else {
        completePomodoroSession();
      }
    }, 1000);
  }
}

function resetPomodoro() {
  if (pomodoroState.isRunning) {
    clearInterval(pomodoroTimer);
    pomodoroState.isRunning = false;
  }

  pomodoroState.timeLeft = pomodoroState.totalDuration;
  updatePomodoroDisplay();

  const startBtn = document.getElementById('pomoStartBtn');
  if (startBtn) {
    startBtn.textContent = 'Bắt đầu';
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-primary');
  }
  showToast('Đã đặt lại đồng hồ về ban đầu', 'info');
}

function completePomodoroSession() {
  clearInterval(pomodoroTimer);
  pomodoroState.isRunning = false;

  const startBtn = document.getElementById('pomoStartBtn');
  if (startBtn) {
    startBtn.textContent = 'Bắt đầu';
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-primary');
  }

  // Phát âm thanh chuông kết thúc
  playCompletionTone();

  if (pomodoroState.mode === 'study') {
    const minutesStudied = Math.round(pomodoroState.totalDuration / 60);
    // Ghi nhận vào thống kê
    habitEngine.addStudyTime(minutesStudied, true);
    setupStreakNavbar();

    // Browser Notification nếu được cấp quyền
    sendDesktopNotification('Hoàn thành phiên học tập! 🎉', `Tuyệt vời! Bạn đã hoàn thành ${minutesStudied} phút tập trung. Hãy nghỉ ngơi một chút nhé!`);

    showToast(`Chúc mừng! Bạn đã hoàn thành phiên học ${minutesStudied} phút!`, 'success');

    // Chuyển sang chế độ nghỉ ngắn
    setTimeout(() => {
      switchPomodoroMode('shortBreak');
    }, 1500);
  } else {
    sendDesktopNotification('Hết giờ nghỉ ngơi! 🔔', 'Đã hết giờ giải lao, sẵn sàng cho phiên học tiếp theo chưa nào?');
    showToast('Hết giờ nghỉ ngơi. Hãy tiếp tục học tập!', 'info');
    setTimeout(() => {
      switchPomodoroMode('study');
    }, 1500);
  }
}

function finishPomodoroEarly() {
  const elapsed = pomodoroState.totalDuration - pomodoroState.timeLeft;
  const elapsedMinutes = Math.floor(elapsed / 60);

  if (elapsedMinutes < 1) {
    showToast('Thời gian học dưới 1 phút chưa được ghi nhận.', 'warning');
    return;
  }

  if (confirm(`Bạn có muốn kết thúc phiên và ghi nhận ${elapsedMinutes} phút đã học không?`)) {
    if (pomodoroState.isRunning) {
      clearInterval(pomodoroTimer);
      pomodoroState.isRunning = false;
    }

    habitEngine.addStudyTime(elapsedMinutes, false);
    setupStreakNavbar();
    showToast(`Đã ghi nhận ${elapsedMinutes} phút học tập thành công!`, 'success');
    resetPomodoro();
  }
}

function updatePomodoroDisplay() {
  const digitsEl = document.getElementById('pomoDigits');
  const circleProgress = document.getElementById('pomoCircleProgress');

  const mins = Math.floor(pomodoroState.timeLeft / 60);
  const secs = pomodoroState.timeLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (digitsEl) {
    digitsEl.textContent = formatted;
  }

  document.title = `${formatted} - Study Habit Tracker`;

  if (circleProgress) {
    // Chu vi hình tròn: 2 * PI * r = 2 * PI * 130 ≈ 816.8
    const circumference = 816.8;
    const progress = pomodoroState.timeLeft / pomodoroState.totalDuration;
    const offset = circumference * (1 - progress);
    circleProgress.style.strokeDashoffset = offset;
  }
}

/* ==============================================================================
   5. SETTINGS PAGE & NOTIFICATIONS
   ============================================================================== */
function renderSettingsPage() {
  const settings = habitEngine.getSettings();

  const nameInput = document.getElementById('settingUserName');
  const goalInput = document.getElementById('settingDailyGoal');
  const pomoInput = document.getElementById('settingStudyDuration');
  const breakInput = document.getElementById('settingBreakDuration');
  const reminderInput = document.getElementById('settingReminderTime');
  const form = document.getElementById('settingsForm');
  const resetBtn = document.getElementById('btnResetData');

  if (nameInput) nameInput.value = settings.userName || '';
  if (goalInput) goalInput.value = settings.dailyGoalMinutes || 120;
  if (pomoInput) pomoInput.value = settings.studyDuration || 25;
  if (breakInput) breakInput.value = settings.breakDuration || 5;
  if (reminderInput) reminderInput.value = settings.reminderTime || '20:00';

  // Check notification status
  updateNotificationStatusUI();

  const enableNotifBtn = document.getElementById('btnEnableNotif');
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', requestNotificationPermission);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        userName: nameInput.value.trim() || 'Học viên',
        dailyGoalMinutes: Math.max(10, parseInt(goalInput.value, 10) || 120),
        studyDuration: Math.max(5, parseInt(pomoInput.value, 10) || 25),
        breakDuration: Math.max(1, parseInt(breakInput.value, 10) || 5),
        reminderTime: reminderInput.value || '20:00'
      };

      habitEngine.saveSettings(updated);
      showToast('Đã lưu cấu hình cài đặt thành công!', 'success');
      habitEngine.checkBadges(true);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn đặt lại toàn bộ dữ liệu về mặc định ban đầu không?')) {
        habitEngine.resetAllData();
        showToast('Đã thiết lập lại dữ liệu thành công!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }
}

function updateNotificationStatusUI() {
  const notifStatus = document.getElementById('notifPermissionStatus');
  const enableNotifBtn = document.getElementById('btnEnableNotif');
  if (!notifStatus || !enableNotifBtn) return;

  if (!('Notification' in window)) {
    notifStatus.textContent = 'Trình duyệt không hỗ trợ thông báo';
    enableNotifBtn.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    notifStatus.innerHTML = '<span style="color: #34d399;">✓ Đã cấp quyền thông báo</span>';
    enableNotifBtn.textContent = 'Gửi thông báo thử nghiệm';
    enableNotifBtn.classList.remove('btn-primary');
    enableNotifBtn.classList.add('btn-outline');
  } else if (Notification.permission === 'denied') {
    notifStatus.innerHTML = '<span style="color: #ef4444;">✗ Đã từ chối quyền (vui lòng mở khóa trên thanh địa chỉ URL)</span>';
    enableNotifBtn.disabled = true;
  } else {
    notifStatus.textContent = 'Chưa được cấp quyền';
    enableNotifBtn.textContent = 'Yêu cầu cấp quyền';
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Trình duyệt của bạn không hỗ trợ Browser Notification API.', 'warning');
    return;
  }

  if (Notification.permission === 'granted') {
    sendDesktopNotification('Thông báo thử nghiệm 🎉', 'Hệ thống Study Habit Tracker đã sẵn sàng gửi lời nhắc học tập cho bạn!');
    showToast('Đã gửi thông báo thử nghiệm!', 'success');
    return;
  }

  Notification.requestPermission().then(permission => {
    updateNotificationStatusUI();
    if (permission === 'granted') {
      showToast('Đã cấp quyền thông báo thành công!', 'success');
      sendDesktopNotification('Chào mừng bạn! 📚', 'Bạn đã bật tính năng nhắc nhở học tập hàng ngày!');
    } else {
      showToast('Bạn đã từ chối quyền gửi thông báo.', 'warning');
    }
  });
}

function sendDesktopNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png'
      });
    } catch (e) {
      console.warn('Could not trigger notification:', e);
    }
  }
}