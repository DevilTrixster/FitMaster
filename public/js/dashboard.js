if (!checkAuth()) throw new Error('Not authenticated');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetchWithAuth('/api/workouts/dashboard', { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    renderWorkouts(data.upcomingWorkouts || []);
    updateStats(data.upcomingWorkouts || []);

    const shouldRefresh = sessionStorage.getItem('workoutCompleted');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      showNotification('✅ Тренировка завершена! Данные обновлены.');
    }
  } catch (error) {
    document.getElementById('upcomingWorkouts').innerHTML =
      `<div style="color: #e94560; text-align: center; padding: 2rem;">
        ⚠️ ${error.message}
      </div>`;
  }
});

function renderWorkouts(workouts) {
  const container = document.getElementById('upcomingWorkouts');
  if (!workouts || workouts.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
      <div style="font-size: 3rem; margin-bottom: 1rem;"></div>
      <p>Нет предстоящих тренировок</p>
      <p style="font-size: 0.9rem;">Тренировки создаются автоматически после регистрации</p>
    </div>`;
    return;
  }

  container.innerHTML = workouts.map(workout => {
    const date = new Date(workout.scheduledDate);
    const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
    const timeStr = workout.scheduledTime ? workout.scheduledTime.substring(0, 5) : '17:00';

    let statusText = '', statusClass = '', actionButton = '';
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
            <span>⏰ ${timeStr}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
        </div>
        <div class="workout-actions">
          ${actionButton}
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.btn-start').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const workoutId = e.target.dataset.id;
      await startWorkout(workoutId);
    });
  });
}

async function startWorkout(workoutId) {
  try {
    await fetchWithAuth('/api/workouts/start', {
      method: 'POST',
      body: JSON.stringify({ workoutId: parseInt(workoutId) })
    });
    window.location.href = `/workout?id=${workoutId}`;
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

function updateStats(workouts) {
  document.getElementById('totalWorkouts').textContent = workouts.length;
  const completedWorkouts = workouts.filter(w => w.status === 'completed' && w.wellnessRating);
  const avgWellness = completedWorkouts.length
    ? (completedWorkouts.reduce((sum, w) => sum + w.wellnessRating, 0) / completedWorkouts.length).toFixed(1)
    : '-';
  document.getElementById('avgWellness').textContent = avgWellness;
  document.getElementById('currentStreak').textContent = '0';
}