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

// Загрузка тренировки
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

// Отрисовка
function renderWorkout() {
  document.querySelector('.nav-brand').textContent = currentWorkout.name;
  const container = document.getElementById('exercisesList');
  container.innerHTML = '';

  currentWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    
    // Формируем текст рекомендации
    const repRecommendation = `${ex.repMin}-${ex.repMax}`;
    const weightRecommendation = ex.targetWeight > 0 ? `${ex.targetWeight} кг` : 'Вес';
    
    card.innerHTML = `
      <div class="exercise-header">
        <h2>${ex.name}</h2>
        <span class="muscle-tag">${ex.muscleGroup}</span>
      </div>
      <div class="exercise-meta">
        <span>🔁 ${ex.sets} подхода</span>
        <span>🔄 ${ex.repMin}–${ex.repMax} повт.</span>
        <span>⏱️ Отдых: ${ex.restSeconds} сек</span>
      </div>
      <div class="sets-list" id="sets-${exIdx}">
        ${Array.from({length: ex.sets}, (_, i) => `
          <div class="set-row" id="set-${exIdx}-${i}">
            <span class="set-label">Подход ${i + 1}</span>
            <input type="number" 
                   class="set-input reps-input" 
                   id="reps-${exIdx}-${i}" 
                   placeholder="${repRecommendation}"
                   min="0" 
                   max="${ex.repMax + 5}">
            <input type="number" 
                   class="set-input weight-input" 
                   id="weight-${exIdx}-${i}" 
                   placeholder="${weightRecommendation}"
                   step="0.5" 
                   min="0">
            <div class="set-actions">
              <button class="btn-set-complete" onclick="completeSet(${exIdx}, ${i})">✓</button>
              <button class="btn-set-skip" onclick="skipSet(${exIdx}, ${i})">Пропустить</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById('finishBtn').disabled = false;
}

// Глобальная функция для кнопки подхода
window.completeSet = async (exIdx, setIdx) => {
  const ex = currentWorkout.exercises[exIdx];
  const reps = parseInt(document.getElementById(`reps-${exIdx}-${setIdx}`).value) || ex.repMin;
  const weight = parseFloat(document.getElementById(`weight-${exIdx}-${setIdx}`).value) || ex.targetWeight || 0;
  
  const btn = document.querySelector(`#sets-${exIdx} .set-row:nth-child(${setIdx+1}) .btn-set-complete`);
  btn.disabled = true;
  btn.textContent = '✅';

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
        actualReps: reps,
        actualWeight: weight,
        completed: true
      })
    });
    startRestTimer(ex.restSeconds);
  } catch (e) {
    alert('Ошибка сохранения подхода');
    btn.disabled = false;
  }
};

// Глобальная функция для выполнения подхода
window.completeSet = async (exIdx, setIdx) => {
  const ex = currentWorkout.exercises[exIdx];
  const repsInput = document.getElementById(`reps-${exIdx}-${setIdx}`);
  const weightInput = document.getElementById(`weight-${exIdx}-${setIdx}`);
  const reps = parseInt(repsInput.value) || 0;
  const weight = parseFloat(weightInput.value) || 0;
  
  if (reps === 0) {
    alert('Введите количество повторений');
    return;
  }
  
  const setRow = document.getElementById(`set-${exIdx}-${setIdx}`);
  const completeBtn = setRow.querySelector('.btn-set-complete');
  const skipBtn = setRow.querySelector('.btn-set-skip');
  
  completeBtn.disabled = true;
  skipBtn.disabled = true;
  setRow.classList.add('completed');
  
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
        actualReps: reps,
        actualWeight: weight,
        completed: true,
        skipped: false
      })
    });
    startRestTimer(ex.restSeconds);
  } catch (e) {
    alert('Ошибка сохранения подхода');
    completeBtn.disabled = false;
    skipBtn.disabled = false;
    setRow.classList.remove('completed');
  }
};

// Глобальная функция для пропуска подхода
window.skipSet = async (exIdx, setIdx) => {
  const ex = currentWorkout.exercises[exIdx];
  const setRow = document.getElementById(`set-${exIdx}-${setIdx}`);
  const completeBtn = setRow.querySelector('.btn-set-complete');
  const skipBtn = setRow.querySelector('.btn-set-skip');
  
  if (!confirm('Пропустить этот подход?')) return;
  
  skipBtn.disabled = true;
  completeBtn.disabled = true;
  setRow.classList.add('skipped');
  
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
        actualReps: null,
        actualWeight: null,
        completed: false,
        skipped: true
      })
    });
  } catch (e) {
    alert('Ошибка при пропуске подхода');
    skipBtn.disabled = false;
    completeBtn.disabled = false;
    setRow.classList.remove('skipped');
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
      // Можно добавить звук или вибрацию
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

// Звёзды рейтинга
document.querySelectorAll('.star').forEach(star => {
  star.onclick = () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < selectedRating);
    });
  };
});

// Завершение тренировки
// Кнопка "Завершить" (показывает форму оценки)
const finishBtn = document.getElementById('finishBtn');
if (finishBtn) {
  finishBtn.onclick = () => {
    document.getElementById('completionSection').classList.remove('hidden');
    document.getElementById('exercisesList').style.display = 'none';
    finishBtn.disabled = true;
  };
}

// Кнопка "Сохранить и вернуться"
const submitFinishBtn = document.getElementById('submitFinishBtn');
if (submitFinishBtn) {
  submitFinishBtn.onclick = async () => {
    const workoutId = currentWorkout?.id;
    if (!workoutId) {
      alert('Ошибка: ID тренировки не найден');
      return;
    }

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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Не удалось завершить тренировку');
      }

      // Очищаем состояние активной тренировки
      localStorage.removeItem('currentWorkoutId');

      // Устанавливаем флаг для обновления прогресса
      sessionStorage.setItem('workoutCompleted', 'true');

      alert('✅ Тренировка успешно завершена!');
      window.location.href = '/progress'; // Перенаправляем на страницу прогресса
    } catch (err) {
      console.error('❌ Ошибка завершения:', err);
      alert('Ошибка: ' + err.message);
      submitFinishBtn.disabled = false;
    }
  };
}

// Старт
loadWorkout();