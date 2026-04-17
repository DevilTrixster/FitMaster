// Проверка авторизации
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
}

let currentWorkout = null;
let restTimerInterval = null;
let restSeconds = 60;
let selectedWellness = 3;

// Получаем ID тренировки из URL
const urlParams = new URLSearchParams(window.location.search);
const workoutId = urlParams.get('id');

if (!workoutId) {
  alert('Не указан ID тренировки');
  window.location.href = '/dashboard';
}

// Загрузка тренировки
async function loadWorkout() {
  try {
    const response = await fetch(`/api/workouts/current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error('Ошибка загрузки тренировки');
    }

    const data = await response.json();
    currentWorkout = data.workout;
    
    document.getElementById('workoutName').textContent = currentWorkout.name;
    renderExercises();
  } catch (error) {
    console.error('Ошибка:', error);
    document.getElementById('exercisesList').innerHTML = 
      `<div class="error">Ошибка: ${error.message}</div>`;
  }
}

// Отрисовка упражнений
function renderExercises() {
  const container = document.getElementById('exercisesList');
  
  if (!currentWorkout || !currentWorkout.exercises || currentWorkout.exercises.length === 0) {
    container.innerHTML = '<div class="empty">Нет упражнений</div>';
    return;
  }

  const html = currentWorkout.exercises.map((exercise, exIndex) => {
    return `<div class="exercise-card" data-exercise-id="${exercise.id}" data-exercise-index="${exIndex}">
      <div class="exercise-header">
        <h3>${exercise.name}</h3>
        <span class="muscle-group">${exercise.muscleGroup || 'N/A'}</span>
      </div>
      <div class="exercise-targets">
        <span>Подходы: ${exercise.sets}</span>
        <span>Повторения: ${exercise.repMin}–${exercise.repMax}</span>
        <span>Вес: ${exercise.targetWeight || 'Собственный'} кг</span>
        <span>Отдых: ${exercise.restSeconds || 60} сек</span>
      </div>
      <div class="sets-container" id="sets-${exercise.id}">
        ${Array.from({ length: exercise.sets }, (_, i) => {
          return `<div class="set-row" data-set="${i + 1}">
            <span class="set-label">Подход ${i + 1}</span>
            <input type="number" class="set-reps" placeholder="Повторения" min="1" value="${exercise.repMin}">
            <input type="number" class="set-weight" placeholder="Вес (кг)" step="0.5" ${exercise.targetWeight ? `value="${exercise.targetWeight}"` : 'disabled'}>
            <button class="btn btn-primary btn-small complete-set" 
                    data-exercise="${exercise.id}" 
                    data-set="${i + 1}">
              Выполнено
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  container.innerHTML = html;

  // Добавляем обработчики кнопок
  document.querySelectorAll('.complete-set').forEach(btn => {
    btn.addEventListener('click', handleSetComplete);
  });
}

// Обработка завершения подхода
function handleSetComplete(e) {
  const exerciseId = parseInt(e.target.dataset.exercise);
  const setNumber = parseInt(e.target.dataset.set);
  
  const exerciseCard = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
  const setRow = exerciseCard.querySelector(`[data-set="${setNumber}"]`);
  
  const repsInput = setRow.querySelector('.set-reps');
  const weightInput = setRow.querySelector('.set-weight');
  
  const exercise = currentWorkout.exercises.find(ex => ex.id === exerciseId);
  
  // Визуально помечаем подход как выполненный
  setRow.classList.add('completed');
  e.target.textContent = '✓';
  e.target.disabled = true;
  
  // Запускаем таймер отдыха
  const restSeconds = exercise.restSeconds || 60;
  startRestTimer(restSeconds);
}

// Таймер отдыха
function startRestTimer(seconds) {
  clearInterval(restTimerInterval);
  restSeconds = seconds;
  updateTimerDisplay();
  
  restTimerInterval = setInterval(() => {
    restSeconds--;
    updateTimerDisplay();
    
    if (restSeconds <= 0) {
      clearInterval(restTimerInterval);
      playNotificationSound();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(restSeconds / 60);
  const seconds = restSeconds % 60;
  document.getElementById('restTimer').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Кнопка старта таймера
document.getElementById('startTimerBtn').addEventListener('click', () => {
  if (currentWorkout && currentWorkout.exercises && currentWorkout.exercises[0]) {
    startRestTimer(currentWorkout.exercises[0].restSeconds || 60);
  } else {
    startRestTimer(60);
  }
});

// Кнопка сброса таймера
document.getElementById('resetTimerBtn').addEventListener('click', () => {
  clearInterval(restTimerInterval);
  restSeconds = 0;
  updateTimerDisplay();
});

// Выбор оценки самочувствия
document.querySelectorAll('#wellnessRating span').forEach(star => {
  star.addEventListener('click', () => {
    selectedWellness = parseInt(star.dataset.rating);
    document.querySelectorAll('#wellnessRating span').forEach((s, i) => {
      s.style.opacity = i < selectedWellness ? '1' : '0.3';
    });
  });
});

// Завершение тренировки
document.getElementById('finishWorkoutBtn').addEventListener('click', async () => {
  const comments = document.getElementById('workoutComments').value;
  
  if (!confirm('Завершить тренировку?')) return;
  
  try {
    const response = await fetch('/api/workouts/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        workoutId: parseInt(workoutId),
        wellnessRating: selectedWellness,
        comments,
      }),
    });

    if (response.ok) {
      alert('Тренировка завершена! Программа адаптирована.');
      window.location.href = '/dashboard';
    } else {
      const data = await response.json();
      alert('Ошибка: ' + data.error);
    }
  } catch (error) {
    alert('Ошибка соединения');
  }
});

// Звук уведомления
function playNotificationSound() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const gainNode = audio.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audio.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);
  } catch (e) {
    console.log('Audio not supported');
  }
}

// Загрузка при старте
loadWorkout();