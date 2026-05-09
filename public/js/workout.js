const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/login.html';

const urlParams = new URLSearchParams(window.location.search);
let workoutId = urlParams.get('id') || localStorage.getItem('currentWorkoutId');

if (!workoutId) {
  alert('Тренировка не найдена');
  window.location.href = '/dashboard';
}

let currentWorkout = null;
let selectedRating = 3;
let timerInterval = null;
let timerSeconds = 0;

async function loadWorkout() {
  try {
    const res = await fetch(`/api/workouts/current`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Не удалось загрузить тренировку');

    currentWorkout = (await res.json()).workout;
    localStorage.setItem('currentWorkoutId', currentWorkout.id);
    renderWorkout();
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки: ' + err.message);
  }
}

// Генератор поля ввода по метрике (тип, значение по умолчанию, единицы)
function createMetricInput(metric, exIdx, setIdx) {
  const { metricType, defaultValue, unit } = metric;
  const id = `metric-${exIdx}-${setIdx}-${metricType}`;
  const unitLabels = {
    count: 'повторений',
    kg: 'кг',
    sec: 'сек',
    m: 'м',
    kcal: 'ккал'
  };
  const placeholder =
    defaultValue !== undefined ? `${defaultValue} ${unitLabels[unit] || unit || ''}`.trim() : '';

  switch (metricType) {
    case 'reps':
      return `
        <div class="metric-group">
          <label class="metric-label">Повторения</label>
          <input type="number" id="${id}" class="set-input"
                 placeholder="${placeholder}" step="1" min="0">
        </div>`;
    case 'weight':
      return `
        <div class="metric-group">
          <label class="metric-label">Вес</label>
          <input type="number" id="${id}" class="set-input"
                 placeholder="${placeholder}" step="0.5" min="0">
        </div>`;
    case 'duration':
      return `
        <div class="metric-group">
          <label class="metric-label">Время</label>
          <input type="number" id="${id}" class="set-input"
                 placeholder="${placeholder}" step="1" min="0">
        </div>`;
    case 'distance':
      return `
        <div class="metric-group">
          <label class="metric-label">Дистанция</label>
          <input type="number" id="${id}" class="set-input"
                 placeholder="${placeholder}" step="0.1" min="0">
        </div>`;
    default:
      return `
        <div class="metric-group">
          <label class="metric-label">${metricType}</label>
          <input type="number" id="${id}" class="set-input"
                 placeholder="${placeholder}" step="any" min="0">
        </div>`;
  }
}

function renderWorkout() {
  document.querySelector('.nav-brand').textContent = currentWorkout.name;
  const container = document.getElementById('exercisesList');
  container.innerHTML = '';

  currentWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    const templates = ex.metricTemplates || [];

    card.innerHTML = `
      <div class="exercise-header">
        <h3>${ex.name}</h3>
        <span class="muscle-tag">${ex.muscleGroup}</span>
      </div>
      <div class="exercise-stats">
        <span class="stat-badge">📐 ${ex.sets} подхода</span>
        <span class="stat-badge">⏱️ ${ex.restSeconds} сек</span>
      </div>
      <div class="sets-container" id="sets-${exIdx}">
        ${Array.from({ length: ex.sets }, (_, setIdx) => {
          const inputs = templates.map(m => createMetricInput(m, exIdx, setIdx)).join('');
          return `
            <div id="set-${exIdx}-${setIdx}" class="set-row">
              <span class="set-number">${setIdx + 1}</span>
              <div class="set-inputs">${inputs}</div>
              <div class="set-actions">
                <button class="btn-set-complete" onclick="completeSet(${exIdx}, ${setIdx})" title="Выполнено">✓</button>
                <button class="btn-set-skip" onclick="skipSet(${exIdx}, ${setIdx})" title="Пропустить">↷</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById('finishBtn').disabled = false;
}

// Выполнение подхода
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
      if (!isNaN(val)) {
        metrics.push({ metricType: tmpl.metricType, value: val, unit: tmpl.unit });
      }
    }
  }

  if (metrics.length === 0) {
    alert('Введите хотя бы одно значение');
    return;
  }

  completeBtn.disabled = true;
  skipBtn.disabled = true;

  try {
    await fetch('/api/workouts/save-set', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workoutId: currentWorkout.id,
        exerciseId: ex.id,
        setNumber: setIdx + 1,
        setType: 'normal',
        metrics: metrics
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

// Пропуск подхода
window.skipSet = async (exIdx, setIdx) => {
  const setRow = document.getElementById(`set-${exIdx}-${setIdx}`);
  const completeBtn = setRow.querySelector('.btn-set-complete');
  const skipBtn = setRow.querySelector('.btn-set-skip');

  if (!confirm('Пропустить этот подход?')) return;

  completeBtn.disabled = true;
  skipBtn.disabled = true;

  try {
    await fetch('/api/workouts/save-set', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workoutId: currentWorkout.id,
        exerciseId: currentWorkout.exercises[exIdx].id,
        setNumber: setIdx + 1,
        setType: 'normal',
        metrics: [] // пропущенный подход без метрик
      })
    });
    setRow.classList.add('skipped');
  } catch (e) {
    alert('Ошибка при пропуске подхода');
    completeBtn.disabled = false;
    skipBtn.disabled = false;
  }
};

// Таймер
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

// Рейтинг звёздами
document.querySelectorAll('.star').forEach(star => {
  star.onclick = () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < selectedRating);
    });
  };
});

// Завершение тренировки
const finishBtn = document.getElementById('finishBtn');
if (finishBtn) {
  finishBtn.onclick = () => {
    document.getElementById('completionSection').classList.remove('hidden');
    document.getElementById('exercisesList').style.display = 'none';
    finishBtn.disabled = true;
  };
}

const submitFinishBtn = document.getElementById('submitFinishBtn');
if (submitFinishBtn) {
  submitFinishBtn.onclick = async () => {
    const workoutId = currentWorkout?.id;
    if (!workoutId) return alert('Ошибка: ID тренировки не найден');
    const wellnessRating = selectedRating || 3;
    const comments = document.getElementById('commentsInput')?.value || '';

    try {
      const response = await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workoutId, wellnessRating, comments })
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Не удалось завершить тренировку');
      localStorage.removeItem('currentWorkoutId');
      sessionStorage.setItem('workoutCompleted', 'true');
      alert('✅ Тренировка успешно завершена!');
      window.location.href = '/progress';
    } catch (err) {
      console.error(err);
      alert('Ошибка: ' + err.message);
      submitFinishBtn.disabled = false;
    }
  };
}

loadWorkout();