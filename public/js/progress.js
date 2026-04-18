// Progress page logic
let token = localStorage.getItem('token');
let weightChartInstance = null;
let volumeChartInstance = null;
let muscleGroupChartInstance = null;

// Проверка авторизации
if (!token) {
  window.location.href = '/auth/login.html';
}

// Загрузка данных при старте
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadExercises();
    await loadMuscleGroupStats();
    await loadOverallStats();
  } catch (error) {
    showError('Ошибка загрузки данных: ' + error.message);
  }
});

// Загрузка списка упражнений
async function loadExercises() {
  const response = await fetch('/api/workouts/exercises', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to load exercises');
  
  const exercises = await response.json();
  const select = document.getElementById('exerciseSelect');
  
  select.innerHTML = exercises.map(ex => 
    `<option value="${ex.id}">${ex.name} (${ex.muscleGroup})</option>`
  ).join('');

  // Загружаем график для первого упражнения
  if (exercises.length > 0) {
    await loadExerciseProgress(exercises[0].id);
  }

  // Обработчик изменения
  select.addEventListener('change', (e) => {
    loadExerciseProgress(parseInt(e.target.value));
  });
}

// Загрузка прогресса по упражнению
async function loadExerciseProgress(exerciseId) {
  try {
    const response = await fetch(`/api/progress/exercise/${exerciseId}?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      // Если нет данных, просто очищаем графики
      clearCharts();
      return;
    }
    
    const data = await response.json();
    
    // График веса
    renderWeightChart(data.trend);
    
    // График объёма
    renderVolumeChart(data.trend);
  } catch (error) {
    console.error('Ошибка загрузки прогресса:', error);
    clearCharts();
  }
}

// Очистка графиков
function clearCharts() {
  if (weightChartInstance) {
    weightChartInstance.destroy();
    weightChartInstance = null;
  }
  if (volumeChartInstance) {
    volumeChartInstance.destroy();
    volumeChartInstance = null;
  }
  
  // Показываем сообщение
  const weightCtx = document.getElementById('weightChart').getContext('2d');
  const volumeCtx = document.getElementById('volumeChart').getContext('2d');
  
  // Можно добавить отображение "Нет данных"
}

// Загрузка статистики по мышечным группам
async function loadMuscleGroupStats() {
  const response = await fetch('/api/progress/muscle-groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to load muscle group stats');
  
  const data = await response.json();
  renderMuscleGroupChart(data);
}

// Загрузка общей статистики
async function loadOverallStats() {
  // Получаем общую статистику из muscle-groups
  const response = await fetch('/api/progress/muscle-groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const stats = await response.json();
    const totalWorkouts = stats.reduce((sum, s) => sum + s.totalWorkouts, 0);
    const totalVolume = stats.reduce((sum, s) => sum + s.totalVolume, 0);
    const avgWellness = stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.avgWellnessRating, 0) / stats.length 
      : 0;

    document.getElementById('totalWorkouts').textContent = totalWorkouts;
    document.getElementById('avgWellness').textContent = avgWellness.toFixed(1);
    document.getElementById('totalVolume').textContent = Math.round(totalVolume).toLocaleString();
  }
}

// Рендер графика веса
function renderWeightChart(trend) {
  const ctx = document.getElementById('weightChart').getContext('2d');
  
  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(t => t.date),
      datasets: [{
        label: 'Средний вес (кг)',
        data: trend.map(t => t.avgWeight),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: { 
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return value + ' кг';
            }
          }
        }
      }
    }
  });
}

// Рендер графика объёма
function renderVolumeChart(trend) {
  const ctx = document.getElementById('volumeChart').getContext('2d');
  
  if (volumeChartInstance) {
    volumeChartInstance.destroy();
  }

  volumeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: trend.map(t => t.date),
      datasets: [{
        label: 'Объём (кг)',
        data: trend.map(t => t.totalVolume),
        backgroundColor: '#764ba2'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return value.toLocaleString() + ' кг';
            }
          }
        }
      }
    }
  });
}

// Рендер графика мышечных групп
function renderMuscleGroupChart(stats) {
  const ctx = document.getElementById('muscleGroupChart').getContext('2d');
  
  if (muscleGroupChartInstance) {
    muscleGroupChartInstance.destroy();
  }

  muscleGroupChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: stats.map(s => s.muscleGroup),
      datasets: [{
        data: stats.map(s => s.totalVolume),
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#4facfe',
          '#43e97b',
          '#fa709a',
          '#fee140'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { 
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${Math.round(value).toLocaleString()} кг (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function showError(message) {
  const container = document.getElementById('errorContainer');
  container.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  window.location.href = '/auth/login.html';
});