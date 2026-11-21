/**
 * ==============================================================================
 * STUDY HABIT TRACKER - DATA ENGINE & CORE LOGIC (data.js)
 * Manages LocalStorage, Streak Calculations, Gamification/Badges & Notifications
 * ==============================================================================
 */

// Storage Keys
const STORAGE_KEYS = {
  SESSIONS: 'study_habit_sessions',
  SETTINGS: 'study_habit_settings',
  STREAK: 'study_habit_streak',
  BADGES: 'study_habit_badges',
  POMO_COUNT: 'study_habit_pomo_count'
};

// Default Settings
const DEFAULT_SETTINGS = {
  userName: 'Học viên chăm chỉ',
  dailyGoalMinutes: 120, // 2 giờ mỗi ngày
  studyDuration: 25,     // 25 phút Pomodoro
  breakDuration: 5,      // 5 phút nghỉ
  notificationsEnabled: false,
  reminderTime: '20:00'
};

// Badges Definition
const BADGES_DEFINITION = [
  {
    id: 'first_step',
    name: 'Khởi đầu mới',
    desc: 'Hoàn thành phiên học tập đầu tiên',
    icon: '🌱',
    condition: (data) => data.totalSessions >= 1
  },
  {
    id: 'streak_3',
    name: 'Giữ lửa đam mê',
    desc: 'Đạt chuỗi học tập 3 ngày liên tiếp',
    icon: '🔥',
    condition: (data) => data.currentStreak >= 3
  },
  {
    id: 'streak_7',
    name: 'Chiến binh kiên trì',
    desc: 'Đạt chuỗi học tập 7 ngày liên tiếp',
    icon: '🏆',
    condition: (data) => data.currentStreak >= 7
  },
  {
    id: 'goal_met',
    name: 'Chinh phục mục tiêu',
    desc: 'Đạt 100% mục tiêu học tập trong ngày',
    icon: '🎯',
    condition: (data) => data.todayMinutes >= data.dailyGoal
  },
  {
    id: 'pomo_master',
    name: 'Bậc thầy Pomodoro',
    desc: 'Hoàn thành 4 phiên Pomodoro tập trung',
    icon: '⚡',
    condition: (data) => data.pomoCount >= 4
  },
  {
    id: 'master_10h',
    name: 'Cần cù bù thông minh',
    desc: 'Tích lũy tổng cộng hơn 10 giờ học (600 phút)',
    icon: '📚',
    condition: (data) => data.totalMinutes >= 600
  }
];

// Helper: Format Date to YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Data Manager Class
class HabitDataEngine {
  constructor() {
    this.initData();
  }

  initData() {
    // 1. Settings
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // 2. Sessions (Khởi tạo dữ liệu mẫu 14 ngày gần nhất để biểu đồ & heatmap trực quan ngay)
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      const sampleSessions = this.generateSampleHistory();
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sampleSessions));
    }

    // 3. Streak
    if (!localStorage.getItem(STORAGE_KEYS.STREAK)) {
      this.recalculateStreak();
    }

    // 4. Badges
    if (!localStorage.getItem(STORAGE_KEYS.BADGES)) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify([]));
    }

    // 5. Pomodoro Counter
    if (!localStorage.getItem(STORAGE_KEYS.POMO_COUNT)) {
      localStorage.setItem(STORAGE_KEYS.POMO_COUNT, '0');
    }

    // Check earned badges
    this.checkBadges(false);
  }

  // Generate realistic 14 days of study history
  generateSampleHistory() {
    const history = {};
    const today = new Date();
    const sampleMinutes = [45, 60, 90, 120, 30, 80, 150, 45, 110, 75, 130, 60, 90, 40];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = getLocalDateString(d);
      history[dateKey] = sampleMinutes[13 - i] || 50;
    }
    return history;
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  getAllSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS)) || {};
    } catch {
      return {};
    }
  }

  getTodayMinutes() {
    const sessions = this.getAllSessions();
    const todayKey = getLocalDateString();
    return sessions[todayKey] || 0;
  }

  // Add study minutes to today
  addStudyTime(minutes, isPomodoro = false) {
    const sessions = this.getAllSessions();
    const todayKey = getLocalDateString();

    const previousMinutes = sessions[todayKey] || 0;
    sessions[todayKey] = previousMinutes + minutes;
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    if (isPomodoro) {
      const count = parseInt(localStorage.getItem(STORAGE_KEYS.POMO_COUNT) || '0', 10) + 1;
      localStorage.setItem(STORAGE_KEYS.POMO_COUNT, count.toString());
    }

    // Recalculate streak
    const streakResult = this.recalculateStreak();
    
    // Check badges & notify
    const unlockedBadges = this.checkBadges(true);

    return {
      todayMinutes: sessions[todayKey],
      streak: streakResult,
      unlockedBadges
    };
  }

  // Pure logic to calculate continuous study streaks
  recalculateStreak() {
    const sessions = this.getAllSessions();
    const today = new Date();
    const todayStr = getLocalDateString(today);
    
    // Get sorted unique dates with study time > 0
    const studiedDates = Object.keys(sessions)
      .filter(date => sessions[date] > 0)
      .sort((a, b) => new Date(b) - new Date(a)); // Descending order (newest first)

    if (studiedDates.length === 0) {
      const emptyStreak = { currentStreak: 0, longestStreak: 0, lastStudiedDate: null };
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(emptyStreak));
      return emptyStreak;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let currentStreak = 0;
    let longestStreak = 0;

    // Check if streak is active (studied today or yesterday)
    const hasToday = sessions[todayStr] && sessions[todayStr] > 0;
    const hasYesterday = sessions[yesterdayStr] && sessions[yesterdayStr] > 0;

    if (hasToday || hasYesterday) {
      let checkDate = new Date(hasToday ? today : yesterday);

      while (true) {
        const key = getLocalDateString(checkDate);
        if (sessions[key] && sessions[key] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    // Calculate historical longest streak
    let tempStreak = 0;
    const sortedAsc = [...studiedDates].sort((a, b) => new Date(a) - new Date(b));
    let prevDate = null;

    for (const dStr of sortedAsc) {
      const curDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = curDate;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const streakData = {
      currentStreak,
      longestStreak,
      lastStudiedDate: studiedDates[0]
    };

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));
    return streakData;
  }

  getStreak() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.STREAK)) || { currentStreak: 0, longestStreak: 0 };
    } catch {
      return { currentStreak: 0, longestStreak: 0 };
    }
  }

  // Gamification: Badges check
  checkBadges(showToast = true) {
    const sessions = this.getAllSessions();
    const streak = this.getStreak();
    const settings = this.getSettings();
    const pomoCount = parseInt(localStorage.getItem(STORAGE_KEYS.POMO_COUNT) || '0', 10);

    const dates = Object.keys(sessions).filter(d => sessions[d] > 0);
    const totalMinutes = dates.reduce((acc, d) => acc + sessions[d], 0);
    const todayMinutes = this.getTodayMinutes();

    const evaluationData = {
      totalSessions: dates.length,
      currentStreak: streak.currentStreak,
      todayMinutes,
      dailyGoal: settings.dailyGoalMinutes,
      pomoCount,
      totalMinutes
    };

    let earnedBadges = [];
    try {
      earnedBadges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];
    } catch {
      earnedBadges = [];
    }

    const newlyUnlocked = [];

    BADGES_DEFINITION.forEach(badge => {
      if (!earnedBadges.includes(badge.id)) {
        if (badge.condition(evaluationData)) {
          earnedBadges.push(badge.id);
          newlyUnlocked.push(badge);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(earnedBadges));
      if (showToast) {
        newlyUnlocked.forEach(badge => {
          showCelebrationModal(badge);
        });
      }
    }

    return newlyUnlocked;
  }

  getBadgesStatus() {
    let earned = [];
    try {
      earned = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];
    } catch {
      earned = [];
    }

    return BADGES_DEFINITION.map(b => ({
      ...b,
      unlocked: earned.includes(b.id)
    }));
  }

  // Reset all data for testing
  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.STREAK);
    localStorage.removeItem(STORAGE_KEYS.BADGES);
    localStorage.removeItem(STORAGE_KEYS.POMO_COUNT);
    this.initData();
  }
}

// Global instance
const habitEngine = new HabitDataEngine();

// ==============================================================================
// UI HELPERS: Audio Synth, Toast & Modal
// ==============================================================================

// Web Audio API Sound Generator (No external MP3 needed!)
function playCompletionTone() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Play pleasant 3-tone chime (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.14);
      
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + idx * 0.14 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.14 + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + idx * 0.14);
      osc.stop(audioCtx.currentTime + idx * 0.14 + 0.4);
    });
  } catch (e) {
    console.warn('AudioContext not supported or blocked:', e);
  }
}

// Toast Notification
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Celebration Modal for Gamification Badges
function showCelebrationModal(badge) {
  playCompletionTone();

  let modalOverlay = document.getElementById('celebrationModal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'celebrationModal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
      <div class="celebration-modal">
        <div class="modal-icon-glow" id="modalBadgeIcon">🏆</div>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #fff;">Chúc mừng! Mở khóa huy hiệu</h2>
        <h3 id="modalBadgeName" style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 0.75rem;"></h3>
        <p id="modalBadgeDesc" style="color: #9ca3af; font-size: 0.95rem; margin-bottom: 1.5rem;"></p>
        <button class="btn btn-primary" onclick="closeCelebrationModal()" style="width: 100%;">Tuyệt vời!</button>
      </div>
    `;
    document.body.appendChild(modalOverlay);
  }

  document.getElementById('modalBadgeIcon').textContent = badge.icon;
  document.getElementById('modalBadgeName').textContent = badge.name;
  document.getElementById('modalBadgeDesc').textContent = badge.desc;

  modalOverlay.classList.add('active');
}

function closeCelebrationModal() {
  const modalOverlay = document.getElementById('celebrationModal');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}