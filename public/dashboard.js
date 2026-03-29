// Проверка авторизации
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
  window.location.href = '/login.html';
}

// Отображение приветствия
document.getElementById('userGreeting').textContent = `Привет, ${user.firstName || 'Пользователь'}!`;

// Выход
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
});

// Загрузка предстоящих тренировок
async function loadUpcomingWorkouts() {
  try {
    const response = await fetch('/api/workouts/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Ошибка загрузки данных');
    }

    const data = await response.json();
    renderUpcomingWorkouts(data.upcomingWorkouts);
  } catch (error) {
    document.getElementById('upcomingWorkouts').innerHTML = 
      `<div class="error">Ошибка: ${error.message}</div>`;
  }
}

function renderUpcomingWorkouts(workouts) {
  const container = document.getElementById('upcomingWorkouts');
  
  if (workouts.length === 0) {
    container.innerHTML = '<div class="empty">Нет запланированных тренировок</div>';
    return;
  }

  const html = workouts.map(workout => `
    <div class="workout-card ${workout.status}">
      <div class="workout-header">
        <h4>${workout.workoutName}</h4>
        <span class="status-badge ${workout.status}">${getStatusText(workout.status)}</span>
      </div>
      <div class="workout-details">
        <span class="date">📅 ${formatDate(workout.scheduledDate)}</span>
        <span class="time">⏰ ${workout.scheduledTime}</span>
      </div>
      ${workout.status === 'scheduled' ? `
        <div class="workout-actions">
          <button class="btn btn-primary btn-small" onclick="startWorkout(${workout.id})">Начать</button>
        </div>
      ` : ''}
      ${workout.wellnessRating ? `
        <div class="wellness-rating">
          Оценка самочувствия: ${'⭐'.repeat(workout.wellnessRating)}
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = html;
  
  // Обновление статистики
  const completed = workouts.filter(w => w.status === 'completed').length;
  document.getElementById('completedCount').textContent = completed;
  
  const ratings = workouts.filter(w => w.wellnessRating).map(w => w.wellnessRating);
  if (ratings.length > 0) {
    const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    document.getElementById('avgWellness').textContent = avg;
  }
}

function getStatusText(status) {
  const statusMap = {
    'scheduled': 'Запланирована',
    'completed': 'Завершена',
    'skipped': 'Пропущена',
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

// Начало тренировки
async function startWorkout(workoutId) {
  window.location.href = `/workout.html?id=${workoutId}`;
}

// Загрузка при старте
loadUpcomingWorkouts();