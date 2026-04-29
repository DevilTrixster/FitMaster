let token = localStorage.getItem('token');
console.log('🔑 Token:', token ? 'Есть токен' : 'Нет токена');

// Проверка авторизации
if (!token) {
  console.warn('⚠️ Перенаправление на login');
  window.location.href = '/login';
}

// Загрузка данных при старте
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Dashboard загружен, начинаем загрузку данных...');
  try {
    // Создаём AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
    
    await loadDashboard({ signal: controller.signal });
    clearTimeout(timeoutId);

    console.log('✅ Dashboard успешно загружен');

    // Проверяем, есть ли флаг обновления после тренировки
    const shouldRefresh = sessionStorage.getItem('workoutCompleted');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      showNotification('✅ Тренировка завершена! Данные обновлены.');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки dashboard:', error);
    if (error.name === 'AbortError') {
      document.getElementById('upcomingWorkouts').innerHTML = 
        `<div style="color: #e94560; text-align: center; padding: 2rem;">
          ️ Превышено время ожидания ответа от сервера<br>
          <small style="color: var(--text-secondary);">
            Проверьте что сервер запущен и маршрут /api/workouts/dashboard существует
          </small>
        </div>`;
    } else {
      document.getElementById('upcomingWorkouts').innerHTML = 
        `<div style="color: #e94560; text-align: center; padding: 2rem;">
          ⚠️ Ошибка загрузки данных<br>
          <small style="color: var(--text-secondary);">${error.message}</small>
        </div>`;
    }
  }
});

// Показ уведомления
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: #43e97b; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; animation: slideIn 0.3s ease-out;`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Загрузка dashboard
async function loadDashboard(options = {}) {
  console.log('🔄 Запрос к /api/workouts/dashboard...');
  console.log(' Используем токен:', token.substring(0, 20) + '...');
  
  const response = await fetch('/api/workouts/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    ...options
  });
  
  console.log('📥 Ответ сервера:', response.status, response.statusText);
  
  // Читаем ответ как текст сначала
  const responseText = await response.text();
  console.log('📄 Текст ответа:', responseText);
  
  if (!response.ok) {
    console.error('❌ Ошибка HTTP:', response.status);
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }
  
  // Парсим JSON
  let data;
  try {
    data = JSON.parse(responseText);
    console.log('📊 Распарсенные данные:', data);
  } catch (e) {
    console.error('❌ Ошибка парсинга JSON:', e);
    throw new Error('Сервер вернул некорректный JSON');
  }
  
  // Отображаем тренировки
  renderWorkouts(data.upcomingWorkouts || []);
  
  // Обновляем статистику
  updateStats(data.upcomingWorkouts || []);
}

// Отображение тренировок
function renderWorkouts(workouts) {
  console.log('🎨 Отрисовка тренировок:', workouts.length);
  const container = document.getElementById('upcomingWorkouts');
  
  if (!workouts || workouts.length === 0) {
    container.innerHTML = 
      `<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;"></div>
        <p>Нет предстоящих тренировок</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Тренировки создаются автоматически после регистрации</p>
      </div>`;
    return;
  }
  
  container.innerHTML = workouts.map(workout => {
    // Форматируем дату
    const date = new Date(workout.scheduledDate);
    const dateStr = date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    });
    
    // Форматируем время (убираем секунды если есть, безопасно для null)
    const rawTime = workout.scheduledTime;
    const timeStr = rawTime ? rawTime.substring(0, 5) : '17:00';
    
    // Определяем статус и кнопку действия
    let statusText = '';
    let statusClass = '';
    let actionButton = '';
    
    switch (workout.status) {
      case 'scheduled':
        statusText = 'Запланирована';
        statusClass = 'status-scheduled';
        actionButton = `<button class="btn btn-primary btn-small btn-start" data-id="${workout.id}">Начать</button>`;
        break;
      case 'in_progress':
        statusText = 'В процессе';
        statusClass = 'status-in-progress';
        actionButton = `<button class="btn btn-outline btn-small btn-continue" data-id="${workout.id}" onclick="window.location.href='/workout?id=${workout.id}'">Продолжить</button>`;
        break;
      case 'paused':
        statusText = 'На паузе';
        statusClass = 'status-paused';
        actionButton = `<button class="btn btn-outline btn-small btn-continue" data-id="${workout.id}" onclick="window.location.href='/workout?id=${workout.id}'">Продолжить</button>`;
        break;
      case 'completed':
        statusText = 'Завершена';
        statusClass = 'status-completed';
        break;
      case 'skipped':
        statusText = 'Пропущена';
        statusClass = 'status-skipped';
        break;
      case 'rescheduled':
        statusText = 'Перенесена';
        statusClass = 'status-rescheduled';
        break;
      default:
        statusText = workout.status || 'Неизвестно';
        statusClass = 'status-scheduled';
    }
    
    return `
      <div class="workout-item">
        <div class="workout-info">
          <h3>${workout.workoutName || 'Базовая программа'}</h3>
          <div class="workout-meta">
            <span>📅 ${dateStr}</span>
            <span> ${timeStr}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
        </div>
        <div class="workout-actions">
          ${actionButton}
        </div>
      </div>
    `;
  }).join('');
  
  // Добавляем обработчики кнопок "Начать"
  document.querySelectorAll('.btn-start').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const workoutId = e.target.dataset.id;
      console.log('🏋️ Начало тренировки:', workoutId);
      await startWorkout(workoutId);
    });
  });
}

// Начало тренировки
async function startWorkout(workoutId) {
  try {
    console.log('🚀 Отправка запроса на начало тренировки:', workoutId);
    const response = await fetch('/api/workouts/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workoutId: parseInt(workoutId) })
    });

    if (response.ok) {
      // ✅ СРАЗУ ПЕРЕХОДИМ НА СТРАНИЦУ ТРЕНИРОВКИ
      window.location.href = `/workout?id=${workoutId}`;
    } else {
      const error = await response.json();
      alert('Ошибка: ' + error.error);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    alert('Произошла ошибка при начале тренировки');
  }
}

// Обновление статистики
function updateStats(workouts) {
  const totalWorkoutsEl = document.getElementById('totalWorkouts');
  const avgWellnessEl = document.getElementById('avgWellness');
  const currentStreakEl = document.getElementById('currentStreak');
  
  // Общее количество тренировок
  totalWorkoutsEl.textContent = workouts.length;
  
  // Добавляем иконку если её нет
  if (!totalWorkoutsEl.querySelector('.stat-icon')) {
    totalWorkoutsEl.innerHTML = `
      <div class="stat-icon">🏋️</div>
      <div class="stat-value">${workouts.length}</div>
    `;
  }
  
  // Среднее самочувствие
  const completedWorkouts = workouts.filter(w => w.status === 'completed' && w.wellnessRating);
  if (completedWorkouts.length > 0) {
    const avgWellness = completedWorkouts.reduce((sum, w) => sum + w.wellnessRating, 0) / completedWorkouts.length;
    avgWellnessEl.textContent = avgWellness.toFixed(1);
  } else {
    avgWellnessEl.textContent = '-';
  }
  
  // Текущая серия
  currentStreakEl.textContent = '0';
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  console.log('🚪 Выход из системы');
  localStorage.removeItem('token');
  window.location.href = '/login';
});

// Обработчик для кнопки "Продолжить" (сохраняет ID)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-continue')) {
    const workoutId = e.target.dataset.id;
    if (workoutId) {
      localStorage.setItem('currentWorkoutId', workoutId);
    }
  }
});