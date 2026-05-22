if (!checkAuth()) throw new Error('Not authenticated');

let userLikes = {}; // { exerciseId: true/false }
let currentWorkout = null;
let selectedRating = 3;
let timerInterval = null;
let timerSeconds = 0;

const urlParams = new URLSearchParams(window.location.search);
let workoutId = urlParams.get('id') || localStorage.getItem('currentWorkoutId');
if (!workoutId) {
  window.location.href = '/dashboard';
}

function checkAllSetsCompleted() {
  const incompleteSets = document.querySelectorAll('.set-row:not(.completed):not(.skipped)');
  if (incompleteSets.length > 0) {
    return confirm(`Осталось ${incompleteSets.length} незавершённых подходов. Завершить тренировку?`);
  }
  return true;
}

document.getElementById('finishBtn').onclick = () => {
  if (!checkAllSetsCompleted()) return;
  document.getElementById('completionSection').classList.remove('hidden');
  document.getElementById('exercisesList').style.display = 'none';
  document.getElementById('finishBtn').disabled = true;
};

// ========== 1. Загрузка лайков пользователя ==========
async function loadUserLikes() {
  try {
    const res = await fetchWithAuth('/api/likes');
    userLikes = await res.json();
  } catch (err) {
    console.error('Не удалось загрузить лайки:', err);
    userLikes = {};
  }
}

// ========== 2. Загрузка тренировки ==========
async function loadWorkout() {
  try {
    const res = await fetchWithAuth('/api/workouts/current');
    const data = await res.json();
    currentWorkout = data.workout;
    localStorage.setItem('currentWorkoutId', currentWorkout.id);

    await loadUserLikes();          // сначала лайки
    renderWorkout();                // отрисовка
    await showAdaptationHint();     // подсказка адаптации

  } catch (err) {
    alert('Ошибка загрузки: ' + err.message);
  }
}

// ========== 3. Подсказка адаптации (рабочая) ==========
async function showAdaptationHint() {
  const hintEl = document.getElementById('adaptationHint');
  if (!hintEl) return;

  try {
    const res = await fetchWithAuth('/api/analytics/adaptations?limit=1');
    const adaptations = await res.json();
    if (adaptations && adaptations.length > 0) {
      const last = adaptations[0];
      hintEl.textContent = `💡 Рекомендация: ${last.reason || 'Корректировка нагрузки'}`;
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Не удалось загрузить рекомендации адаптации:', err);
    hintEl.classList.add('hidden');
  }
}

// ========== 4. Вспомогательная функция для инпутов ==========
function createMetricInput(metric, exIdx, setIdx, targetReps, targetWeight) {
  const { metricType, defaultValue, unit } = metric;
  const id = `metric-${exIdx}-${setIdx}-${metricType}`;

  const unitLabels = {
    count: 'повторений',
    kg: 'кг',
    sec: 'сек',
    m: 'м',
    kcal: 'ккал'
  };
  const labelMap = {
    reps: 'Повторения',
    weight: 'Вес',
    duration: 'Время',
    distance: 'Дистанция'
  };
  const stepMap = {
    reps: 1,
    weight: 0.5,
    duration: 1,
    distance: 0.1
  };

  let effectiveDefault = defaultValue;
  if (metricType === 'reps' && targetReps !== undefined) effectiveDefault = targetReps;
  if (metricType === 'weight' && targetWeight !== undefined) effectiveDefault = targetWeight;

  const placeholder = effectiveDefault !== undefined
    ? `${effectiveDefault} ${unitLabels[unit] || unit || ''}`.trim()
    : '';

  const targetText = effectiveDefault !== undefined
    ? `<span class="target-hint">Цель: ${effectiveDefault} ${unitLabels[unit] || unit}</span>`
    : '';

  return `
    <div class="metric-group">
      <label class="metric-label">${labelMap[metricType] || metricType}</label>
      <input type="number" id="${id}" class="set-input"
             placeholder="${placeholder}"
             step="${stepMap[metricType] || 'any'}" min="0">
      ${targetText}
    </div>`;
}

// ========== 5. Отрисовка тренировки (с кнопками лайков) ==========
function renderWorkout() {
  document.querySelector('.nav-brand').textContent = currentWorkout.name;
  const container = document.getElementById('exercisesList');
  container.innerHTML = '';

  currentWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    const templates = ex.metricTemplates || [];
    const targetReps = ex.targetReps;
    const targetWeight = ex.targetWeight;

    // Определяем активные классы для кнопок лайков
    const isLiked = userLikes[ex.id] === true;
    const isDisliked = userLikes[ex.id] === false;

    card.innerHTML = `
      <div class="exercise-header">
        <h3>${escapeHtml(ex.name)}</h3>
        <span class="muscle-tag">${escapeHtml(ex.muscleGroup)}</span>
      </div>
      <div class="exercise-stats">
        <span class="stat-badge">📐 ${ex.sets} подхода</span>
        <span class="stat-badge">⏱️ ${ex.restSeconds} сек</span>
      </div>
      <div class="sets-container" id="sets-${exIdx}">
        ${Array.from({ length: ex.sets }, (_, setIdx) => `
          <div id="set-${exIdx}-${setIdx}" class="set-row">
            <span class="set-number">${setIdx + 1}</span>
            <div class="set-inputs">
              ${templates.map(m => createMetricInput(m, exIdx, setIdx, targetReps, targetWeight)).join('')}
            </div>
            <div class="set-actions">
              <button class="btn-set-complete" onclick="completeSet(${exIdx}, ${setIdx})" title="Выполнено">✓</button>
              <button class="btn-set-skip" onclick="skipSet(${exIdx}, ${setIdx})" title="Пропустить">↷</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="exercise-likes">
        <button class="like-btn ${isLiked ? 'active' : ''}" data-exercise-id="${ex.id}" data-liked="true">👍 Нравится</button>
        <button class="dislike-btn ${isDisliked ? 'active' : ''}" data-exercise-id="${ex.id}" data-liked="false">👎 Не нравится</button>
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById('finishBtn').disabled = false;
}

// Простая защита от XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ========== 6. Обработчики подходов ==========
window.completeSet = async (exIdx, setIdx) => {
  const ex = currentWorkout.exercises[exIdx];
  const setRow = document.getElementById(`set-${exIdx}-${setIdx}`);
  const completeBtn = setRow.querySelector('.btn-set-complete');
  const skipBtn = setRow.querySelector('.btn-set-skip');

  const templates = ex.metricTemplates || [];
  const metrics = [];
  for (const tmpl of templates) {
    const input = document.getElementById(`metric-${exIdx}-${setIdx}-${tmpl.metricType}`);
    if (input) {
      const val = parseFloat(input.value);
      if (!isNaN(val)) metrics.push({ metricType: tmpl.metricType, value: val, unit: tmpl.unit });
    }
  }

  if (metrics.length === 0) {
    alert('Введите хотя бы одно значение');
    return;
  }

  completeBtn.disabled = true;
  skipBtn.disabled = true;

  try {
    await fetchWithAuth('/api/workouts/save-set', {
      method: 'POST',
      body: JSON.stringify({
        workoutId: currentWorkout.id,
        exerciseId: ex.id,
        setNumber: setIdx + 1,
        setType: 'normal',
        metrics
      })
    });
    setRow.classList.add('completed');
    startRestTimer(ex.restSeconds);
  } catch (e) {
    alert('Ошибка сохранения подхода');
    completeBtn.disabled = false;
    skipBtn.disabled = false;
  }
};

window.skipSet = async (exIdx, setIdx) => {
  const setRow = document.getElementById(`set-${exIdx}-${setIdx}`);
  const completeBtn = setRow.querySelector('.btn-set-complete');
  const skipBtn = setRow.querySelector('.btn-set-skip');

  if (!confirm('Пропустить этот подход?')) return;

  completeBtn.disabled = true;
  skipBtn.disabled = true;

  try {
    await fetchWithAuth('/api/workouts/save-set', {
      method: 'POST',
      body: JSON.stringify({
        workoutId: currentWorkout.id,
        exerciseId: currentWorkout.exercises[exIdx].id,
        setNumber: setIdx + 1,
        setType: 'normal',
        metrics: []
      })
    });
    setRow.classList.add('skipped');
  } catch (e) {
    alert('Ошибка при пропуске подхода');
    completeBtn.disabled = false;
    skipBtn.disabled = false;
  }
};

// ========== 7. Таймер ==========
function startRestTimer(seconds) {
  clearInterval(timerInterval);
  timerSeconds = seconds;
  document.getElementById('timerDisplay').textContent = formatTime(timerSeconds);
  timerInterval = setInterval(() => {
    timerSeconds--;
    document.getElementById('timerDisplay').textContent = formatTime(timerSeconds);
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timerDisplay').textContent = '00:00';
    }
  }, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

document.getElementById('startTimerBtn').onclick = () => startRestTimer(60);
document.getElementById('resetTimerBtn').onclick = () => {
  clearInterval(timerInterval);
  document.getElementById('timerDisplay').textContent = '00:00';
};

// ========== 8. Звёзды самочувствия ==========
document.querySelectorAll('.star').forEach(star => {
  star.onclick = () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
  };
});

// ========== 9. Завершение тренировки ==========
document.getElementById('finishBtn').onclick = () => {
  document.getElementById('completionSection').classList.remove('hidden');
  document.getElementById('exercisesList').style.display = 'none';
  document.getElementById('finishBtn').disabled = true;
};

document.getElementById('submitFinishBtn').onclick = async () => {
  const workoutId = currentWorkout?.id;
  if (!workoutId) return alert('Ошибка: ID тренировки не найден');
  const wellnessRating = selectedRating;
  const comments = document.getElementById('commentsInput')?.value || '';

  try {
    await fetchWithAuth('/api/workouts/complete', {
      method: 'POST',
      body: JSON.stringify({ workoutId, wellnessRating, comments })
    });
    localStorage.removeItem('currentWorkoutId');
    sessionStorage.setItem('workoutCompleted', 'true');
    alert('✅ Тренировка успешно завершена!');
    window.location.href = '/progress';
  } catch (err) {
    alert('Ошибка: ' + err.message);
    document.getElementById('submitFinishBtn').disabled = false;
  }
};

// ========== 10. Обработчик лайков (делегирование) ==========
document.getElementById('exercisesList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.like-btn, .dislike-btn');
  if (!btn) return;
  e.preventDefault();

  const exerciseId = parseInt(btn.dataset.exerciseId);
  const liked = btn.dataset.liked === 'true';

  try {
    await fetchWithAuth(`/api/likes/${exerciseId}`, {
      method: 'POST',
      body: JSON.stringify({ liked })
    });
    // Обновить локальное состояние
    userLikes[exerciseId] = liked;
    // Обновить UI только для этой карточки
    const parent = btn.closest('.exercise-likes');
    if (parent) {
      const likeBtn = parent.querySelector('.like-btn');
      const dislikeBtn = parent.querySelector('.dislike-btn');
      if (likeBtn) likeBtn.classList.toggle('active', liked === true);
      if (dislikeBtn) dislikeBtn.classList.toggle('active', liked === false);
    }
  } catch (err) {
    alert('Ошибка при сохранении оценки: ' + err.message);
  }
});

// ========== 11. Инициализация и старт ==========
document.addEventListener('DOMContentLoaded', () => {
  // Установка начальных звёзд
  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    star.classList.toggle('active', index < 3);
  });
  selectedRating = 3;

  loadWorkout();
});