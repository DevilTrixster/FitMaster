let token = localStorage.getItem('token');

console.log('🔑 Token:', token ? 'Есть токен' : 'Нет токена');

// Проверка авторизации
if (!token) {
  console.warn('⚠️ Перенаправление на login');
  window.location.href = '/auth/login.html';
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
  } catch (error) {
    console.error('❌ Ошибка загрузки dashboard:', error);
    
    if (error.name === 'AbortError') {
      document.getElementById('upcomingWorkouts').innerHTML = 
        `<div style="color: #e94560; text-align: center; padding: 2rem;">
          ⚠️ Превышено время ожидания ответа от сервера<br>
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

// Загрузка dashboard
async function loadDashboard(options = {}) {
  console.log('🔄 Запрос к /api/workouts/dashboard...');
  console.log('🔑 Используем токен:', token.substring(0, 20) + '...');
  
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
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
        <p>Нет предстоящих тренировок</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Тренировки создаются автоматически после регистрации</p>
      </div>
    `;
    return;
  }

  container.innerHTML = workouts.map(workout => {
    const date = new Date(workout.scheduledDate);
    const dateStr = date.toLocaleDateString('ru-RU', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long' 
    });
    
    const timeStr = workout.scheduledTime || '10:00';
    
    let statusText = 'Запланирована';
    let statusClass = 'status-scheduled';
    let actionButton = '';

    if (workout.status === 'scheduled') {
      statusText = 'Запланирована';
      statusClass = 'status-scheduled';
      actionButton = `<button class="btn btn-primary btn-small btn-start" data-id="${workout.id}">Начать</button>`;
    } else if (workout.status === 'in_progress') {
      statusText = 'В процессе';
      statusClass = 'status-in_progress';
      actionButton = `<button class="btn btn-outline btn-small btn-continue" 
                        data-id="${workout.id}"
                        onclick="window.location.href='/workout?id=${workout.id}'">
                        Продолжить
                      </button>`;
    } else if (workout.status === 'completed') {
      statusText = 'Завершена';
      statusClass = 'status-completed';
    } else if (workout.status === 'skipped') {
      statusText = 'Пропущена';
      statusClass = 'status-skipped';
    }

    return `
      <div class="workout-item">
        <div class="workout-info">
          <h3>${workout.workoutName || 'Базовая программа Full Body'}</h3>
          <div class="workout-meta">
            <span>📅 ${dateStr}</span>
            <span>⏰ ${timeStr}</span>
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
  console.log('📊 Обновление статистики:', workouts.length);
  
  document.getElementById('totalWorkouts').textContent = workouts.length;
  document.getElementById('avgWellness').textContent = '-';
  document.getElementById('currentStreak').textContent = '0';
}

// Logout

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  console.log('🚪 Выход из системы');
  localStorage.removeItem('token');
  window.location.href = '/auth/login.html';
});  // ← Добавили );

// Обработчик для кнопки "Продолжить" (сохраняет ID)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-continue')) {
    const workoutId = e.target.dataset.id;
    if (workoutId) {
      localStorage.setItem('currentWorkoutId', workoutId);
    }
  }
});