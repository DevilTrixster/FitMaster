// Проверка авторизации
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
  window.location.href = '/auth/login.html';
}

// Отображение приветствия
const userGreeting = document.getElementById('userGreeting');
if (userGreeting && user.firstName) {
  userGreeting.textContent = `Привет, ${user.firstName}!`;
}

// Выход
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  });
}

// Загрузка предстоящих тренировок
async function loadUpcomingWorkouts() {
  const container = document.getElementById('upcomingWorkouts');
  
  try {
    const response = await fetch('/api/workouts/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login.html';
        return;
      }
      throw new Error('Ошибка загрузки данных');
    }

    const data = await response.json();
    renderUpcomingWorkouts(data.upcomingWorkouts);
    updateStats(data.upcomingWorkouts);
  } catch (error) {
    if (container) {
      container.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    }
  }
}

function renderUpcomingWorkouts(workouts) {
  const container = document.getElementById('upcomingWorkouts');
  if (!container) return;
  
  if (!workouts || workouts.length === 0) {
    container.innerHTML = '<div class="empty">Нет запланированных тренировок</div>';
    return;
  }

  const html = workouts.map(workout => `
    <div class="workout-card ${workout.status}" onclick="startWorkout(${workout.id})">
      <div class="workout-header">
        <h4>${workout.workoutName || 'Тренировка'}</h4>
        <span class="status-badge ${workout.status}">${getStatusText(workout.status)}</span>
      </div>
      <div class="workout-datetime">
        <span class="date">📅 ${formatDate(workout.scheduledDate)}</span>
        <span class="time">⏰ ${workout.scheduledTime || '10:00'}</span>
      </div>
      ${workout.status === 'scheduled' ? `
        <div class="workout-actions">
          <button class="btn btn-primary btn-small">Начать</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = html;
}

function updateStats(workouts) {
  const totalEl = document.getElementById('totalWorkouts');
  const avgEl = document.getElementById('avgWellness');
  const streakEl = document.getElementById('currentStreak');
  
  if (totalEl) {
    totalEl.textContent = workouts.length;
  }
  
  if (avgEl) {
    const ratings = workouts.filter(w => w.wellnessRating).map(w => w.wellnessRating);
    if (ratings.length > 0) {
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      avgEl.textContent = avg;
    } else {
      avgEl.textContent = '-';
    }
  }
  
  if (streakEl) {
    // Пока заглушка - нужно реализовать подсчёт серии
    streakEl.textContent = '0';
  }
}

function getStatusText(status) {
  const statusMap = {
    'scheduled': 'Запланирована',
    'completed': 'Завершена',
    'skipped': 'Пропущена',
    'in_progress': 'В процессе',
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    weekday: 'short' 
  });
}

async function startWorkout(workoutId) {
  try {
    const response = await fetch('/api/workouts/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ workoutId }),
    });

    if (response.ok) {
      window.location.href = `/workout.html?id=${workoutId}`;
    } else {
      const data = await response.json();
      alert('Ошибка: ' + data.error);
    }
  } catch (error) {
    alert('Ошибка соединения');
  }
}

// Загрузка при старте
loadUpcomingWorkouts();