if (!checkAuth()) throw new Error('Not authenticated');

// Вспомогательная функция для получения даты без времени
function normalizeDate(dateStr) {
  if (!dateStr) return '';
  // Если пришло в формате ISO или с временем, берем только первые 10 символов
  return dateStr.split('T')[0];
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetchWithAuth('/api/workouts/dashboard', { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();
    console.log('Полученные тренировки:', data.upcomingWorkouts); // для отладки
    renderWorkouts(data.upcomingWorkouts || []);
    updateStats(data.upcomingWorkouts || []);
    const shouldRefresh = sessionStorage.getItem('workoutCompleted');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      showNotification('✅ Тренировка завершена! Данные обновлены.');
    }
  } catch (error) {
    document.getElementById('upcomingWorkouts').innerHTML =
      `<div style="color: #e94560; text-align: center; padding: 2rem;">⚠️ ${error.message}</div>`;
  }
  loadRecoveryInsights();
  loadRecommendations();
});

function renderWorkouts(workouts) {
  const container = document.getElementById('upcomingWorkouts');
  if (!workouts || workouts.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 20px;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">🏋️‍♂️</div>
      <p style="font-size: 1.2rem;">Нет предстоящих тренировок</p>
      <p style="color: var(--text-secondary);">Тренировки создаются автоматически после регистрации</p>
    </div>`;
    return;
  }

  const todayStr = normalizeDate(new Date().toISOString()); // '2026-05-14'

  container.innerHTML = workouts.map(workout => {
    // Нормализуем дату тренировки
    const workoutDateStr = normalizeDate(workout.scheduledDate);
    const isToday = (workoutDateStr === todayStr);

    const date = new Date(workout.scheduledDate);
    const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
    const timeStr = workout.scheduledTime ? workout.scheduledTime.substring(0, 5) : '17:00';

    let statusText = '', statusClass = '', actionButton = '';

    switch (workout.status) {
      case 'scheduled':
        statusText = 'Запланирована';
        statusClass = 'status-scheduled';
        actionButton = `<button class="btn btn-primary btn-small btn-start" data-id="${workout.id}">▶ Начать</button>`;
        if (isToday) {
          actionButton += `<button class="btn btn-warning btn-small btn-postpone" data-id="${workout.id}">⏩ Перенести на завтра</button>`;
        }
        break;
      case 'in_progress':
        statusText = 'В процессе';
        statusClass = 'status-in-progress';
        actionButton = `<button class="btn btn-outline btn-small btn-continue" data-id="${workout.id}" onclick="window.location.href='/workout?id=${workout.id}'">⏵ Продолжить</button>`;
        break;
      case 'paused':
        statusText = 'На паузе';
        statusClass = 'status-paused';
        actionButton = `<button class="btn btn-outline btn-small btn-continue" data-id="${workout.id}" onclick="window.location.href='/workout?id=${workout.id}'">⏵ Продолжить</button>`;
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
          <h3>${escapeHtml(workout.workoutName || 'Базовая программа')}</h3>
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

  document.querySelectorAll('.btn-postpone').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const workoutId = e.target.dataset.id;
      if (confirm('✅ Перенести тренировку на завтра?')) {
        try {
          await fetchWithAuth(`/api/workouts/${workoutId}/postpone`, { method: 'POST' });
          showNotification('Тренировка перенесена на завтра', 'success');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          alert('Ошибка: ' + err.message);
        }
      }
    });
  });
}

async function loadRecommendations() {
  try {
    const response = await fetchWithAuth('/api/analytics/recommendations');
    const data = await response.json();
    
    const hintEl = document.getElementById('adaptationHint');
    if (!hintEl) return;
    
    let messages = [];
    if (data.deloadActive) {
      messages.push(`⚠️ Активна разгрузочная неделя! Интенсивность снижена до ${Math.round(data.deloadFactor * 100)}%.`);
    }
    if (data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach(rec => {
        messages.push(`💡 Рекомендация: замените упражнение (причина: ${rec.reason})`);
      });
    }
    if (data.nextTargets && data.nextTargets.length > 0) {
      const sample = data.nextTargets[0];
      messages.push(`🎯 Новые цели: для упражнения ${sample.exerciseId} вес ${sample.newWeight} кг, повторения ${sample.newReps}`);
    }
    
    if (messages.length > 0) {
      hintEl.innerHTML = messages.join('<br>');
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Не удалось загрузить рекомендации:', err);
  }
}

// Простейшая защита от XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
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

async function loadRecoveryInsights() {
  try {
    const response = await fetchWithAuth('/api/analytics/recovery');
    if (!response.ok) throw new Error('Failed to fetch recovery data');
    const data = await response.json();
    const score = data.recoveryScore || 0;
    const circle = document.getElementById('recoveryScoreCircle');
    circle.textContent = score;
    circle.style.background = `conic-gradient(var(--accent) 0% ${score}%, rgba(255,255,255,0.1) ${score}% 100%)`;
    const fatigue = data.fatigueScore || 0;
    document.getElementById('fatigueBar').style.width = `${fatigue}%`;
    document.getElementById('fatigueValue').textContent = `${fatigue}%`;
    const injury = data.injuryRisk || 0;
    document.getElementById('injuryBar').style.width = `${injury}%`;
    document.getElementById('injuryValue').textContent = `${injury}%`;
    const trend = data.performanceTrend || 0;
    const trendEl = document.getElementById('trendValue');
    trendEl.textContent = trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
    trendEl.style.color = trend >= 0 ? '#4ecca3' : '#e94560';
    const muscleRecovery = data.muscleRecovery || {};
    const muscles = { chest: 'Грудь', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи', arms: 'Руки', core: 'Пресс' };
    const container = document.getElementById('muscleBars');
    container.innerHTML = Object.entries(muscles).map(([key, name]) => {
      const percentage = muscleRecovery[key] !== undefined ? muscleRecovery[key] : 100;
      return `<div class="muscle-bar-item"><span class="muscle-name">${name}</span><div class="muscle-bar-bg"><div class="muscle-bar-fill" style="width: ${percentage}%"></div></div><span class="muscle-percent">${percentage}%</span></div>`;
    }).join('');
  } catch (error) {
    console.error('Recovery insights error:', error);
    document.getElementById('recoveryScoreCircle').textContent = '--';
    document.getElementById('fatigueValue').textContent = '--';
    document.getElementById('injuryValue').textContent = '--';
    document.getElementById('trendValue').textContent = '--';
    document.getElementById('muscleBars').innerHTML = '<p class="error-text">Не удалось загрузить данные восстановления</p>';
  }
}