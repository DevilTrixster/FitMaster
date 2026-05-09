if (!checkAuth()) throw new Error('Not authenticated');

const urlParams = new URLSearchParams(window.location.search);
let workoutId = urlParams.get('id') || localStorage.getItem('currentWorkoutId');
if (!workoutId) {
  window.location.href = '/dashboard';
}

let currentWorkout = null;
let selectedRating = 3;
let timerInterval = null;
let timerSeconds = 0;

async function loadWorkout() {
  try {
    const res = await fetchWithAuth('/api/workouts/current');
    currentWorkout = (await res.json()).workout;
    localStorage.setItem('currentWorkoutId', currentWorkout.id);
    renderWorkout();
  } catch (err) {
    alert('Ошибка загрузки: ' + err.message);
  }
}

function createMetricInput(metric, exIdx, setIdx) {
  const { metricType, defaultValue, unit } = metric;
  const id = `metric-${exIdx}-${setIdx}-${metricType}`;

  // Перевод единиц измерения
  const unitLabels = {
    count: 'повторений',
    kg: 'кг',
    sec: 'сек',
    m: 'м',
    kcal: 'ккал'
  };

  // Перевод названий метрик
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

  const placeholder =
    defaultValue !== undefined
      ? `${defaultValue} ${unitLabels[unit] || unit || ''}`.trim()
      : '';

  return `
    <div class="metric-group">
      <label class="metric-label">${labelMap[metricType] || metricType}</label>
      <input type="number" id="${id}" class="set-input"
             placeholder="${placeholder}"
             step="${stepMap[metricType] || 'any'}" min="0">
    </div>`;
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
        ${Array.from({ length: ex.sets }, (_, setIdx) => `
          <div id="set-${exIdx}-${setIdx}" class="set-row">
            <span class="set-number">${setIdx + 1}</span>
            <div class="set-inputs">
              ${templates.map(m => createMetricInput(m, exIdx, setIdx)).join('')}
            </div>
            <div class="set-actions">
              <button class="btn-set-complete" onclick="completeSet(${exIdx}, ${setIdx})" title="Выполнено">✓</button>
              <button class="btn-set-skip" onclick="skipSet(${exIdx}, ${setIdx})" title="Пропустить">↷</button>
            </div>
          </div>`).join('')}
      </div>`;
    container.appendChild(card);
  });

  document.getElementById('finishBtn').disabled = false;
}

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

  if (metrics.length === 0) { alert('Введите хотя бы одно значение'); return; }

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

document.querySelectorAll('.star').forEach(star => {
  star.onclick = () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
  };
});

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

loadWorkout();