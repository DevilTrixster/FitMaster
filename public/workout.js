const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html';
}

const socket = io();
const user = JSON.parse(localStorage.getItem('user') || '{}');

socket.emit('authenticate', { 
  token, 
  userId: user.id // Добавляем userId
});

let currentWorkout = null;
let restTimerInterval = null;
let restSeconds = 0;
let selectedWellness = 3;

const urlParams = new URLSearchParams(window.location.search);
const workoutId = urlParams.get('id');

async function loadWorkout() {
  try {
    const response = await fetch('/api/workouts/current', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Ошибка загрузки');

    const data = await response.json();
    currentWorkout = data.workout;
    
    document.getElementById('workoutName').textContent = currentWorkout.name;
    renderExercises();
  } catch (error) {
    document.getElementById('exercisesList').innerHTML = 
      `<div class="error">Ошибка: ${error.message}</div>`;
  }
}

function renderExercises() {
  const container = document.getElementById('exercisesList');
  
  const html = currentWorkout.exercises.map((exercise, exIndex) => `
    <div class="exercise-card" data-exercise-id="${exercise.id}">
      <div class="exercise-header">
        <h3>${exercise.name}</h3>
        <span class="muscle-group">${exercise.muscleGroup}</span>
      </div>
      <div class="exercise-targets">
        <span>Подходы: ${exercise.sets}</span>
        <span>Повторения: ${exercise.repMin}–${exercise.repMax}</span>
        <span>Вес: ${exercise.targetWeight || 'Собственный'} кг</span>
        <span>Отдых: ${exercise.restSeconds} сек</span>
      </div>
      <div class="sets-container" id="sets-${exercise.id}">
        ${Array.from({ length: exercise.sets }, (_, i) => `
          <div class="set-row" data-set="${i + 1}">
            <span class="set-label">Подход ${i + 1}</span>
            <input type="number" class="set-reps" placeholder="Повторения" min="1">
            <input type="number" class="set-weight" placeholder="Вес (кг)" step="0.5" ${exercise.targetWeight ? '' : 'disabled'}>
            <button class="btn btn-primary btn-small complete-set" 
                    data-exercise="${exercise.id}" 
                    data-set="${i + 1}">
              Выполнено
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = html;

  document.querySelectorAll('.complete-set').forEach(btn => {
    btn.addEventListener('click', handleSetComplete);
  });
}

function handleSetComplete(e) {
  const exerciseId = parseInt(e.target.dataset.exercise);
  const setNumber = parseInt(e.target.dataset.set);
  
  const exerciseCard = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
  const setRow = exerciseCard.querySelector(`[data-set="${setNumber}"]`);
  
  const repsInput = setRow.querySelector('.set-reps');
  const weightInput = setRow.querySelector('.set-weight');
  
  const exercise = currentWorkout.exercises.find(ex => ex.id === exerciseId);
  
  const actualReps = parseInt(repsInput.value) || exercise.repMin;
  const actualWeight = parseFloat(weightInput.value) || exercise.targetWeight || 0;
  
  const setResult = {
    setNumber,
    targetReps: exercise.repMin,
    targetWeight: exercise.targetWeight,
    actualReps,
    actualWeight,
    completed: true,
    completedAt: new Date(),
  };

  socket.emit('workout:set:complete', {
    workoutId: parseInt(workoutId),
    exerciseId,
    setResult,
  });

  setRow.classList.add('completed');
  e.target.textContent = '✓';
  e.target.disabled = true;

  startRestTimer(exercise.restSeconds);
}

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

document.getElementById('startTimerBtn').addEventListener('click', () => {
  const exercise = currentWorkout.exercises[0];
  if (exercise && exercise.restSeconds) {
    startRestTimer(exercise.restSeconds);
  } else {
    startRestTimer(60); // Значение по умолчанию
  }
});

document.getElementById('resetTimerBtn').addEventListener('click', () => {
  clearInterval(restTimerInterval);
  restSeconds = 0;
  updateTimerDisplay();
});

document.querySelectorAll('#wellnessRating span').forEach(star => {
  star.addEventListener('click', () => {
    selectedWellness = parseInt(star.dataset.rating);
    document.querySelectorAll('#wellnessRating span').forEach((s, i) => {
      s.style.opacity = i < selectedWellness ? '1' : '0.3';
    });
  });
});

document.getElementById('finishWorkoutBtn').addEventListener('click', async () => {
  const comments = document.getElementById('workoutComments').value;
  
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

function playNotificationSound() {
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gainNode = audio.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audio.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.value = 0.1;
  
  oscillator.start();
  setTimeout(() => oscillator.stop(), 200);
}

socket.on('workout:set:success', (data) => {
  console.log('Подход сохранён:', data);
});

socket.on('workout:set:error', (data) => {
  alert('Ошибка сохранения: ' + data.error);
});

loadWorkout();