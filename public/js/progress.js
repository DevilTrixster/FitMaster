// Progress page logic
let token = localStorage.getItem('token');
let weightChartInstance = null;
let volumeChartInstance = null;
let muscleGroupChartInstance = null;


// СЛОВАРЬ ПЕРЕВОДОВ
const muscleTranslations = {
  'chest': 'Грудь',
  'back': 'Спина',
  'legs': 'Ноги',
  'shoulders': 'Плечи',
  'arms': 'Руки',
  'core': 'Пресс / Кор',
  'default': 'Другое'
};

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
    // Добавляем обработчик для обновления при возврате на страницу
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Страница загружена из кэша - обновляем данные
        refreshAllData();
      }
    });

    // Проверяем, есть ли флаг обновления после тренировки
    const shouldRefresh = sessionStorage.getItem('workoutCompleted');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      await refreshAllData();
      showNotification('✅ Тренировка завершена! Прогресс обновлён.');
    }
  } catch (error) {
    showError('Ошибка загрузки данных: ' + error.message);
  }
});

// Функция полного обновления всех данных
async function refreshAllData() {
  try {
    await loadExercises();
    await loadMuscleGroupStats();
    await loadOverallStats();
  } catch (error) {
    console.error('Ошибка обновления данных:', error);
  }
}

// Показ уведомления
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #43e97b;
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
// Загрузка списка упражнений
async function loadExercises() {
  const response = await fetch('/api/workouts/exercises', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to load exercises');
  
  const exercises = await response.json();
  const select = document.getElementById('exerciseSelect');  
  if (exercises.length === 0) {
    select.innerHTML = '<option value="">Нет доступных упражнений</option>';
    clearCharts();
    return;
  }
  
  select.innerHTML = exercises.map(ex => 
    `<option value="${ex.id}">${ex.name} (${ex.muscleGroup})</option>`
  ).join('');

  // Загружаем график для первого упражнения
  if (exercises.length > 0) {
    await loadExerciseProgress(exercises[0].id);
  }

  // Обработчик изменения
  select.addEventListener('change', (e) => {
    const exerciseId = parseInt(e.target.value);
    if (exerciseId) {
      loadExerciseProgress(exerciseId);
    }
  });
}

// Загрузка прогресса по упражнению
async function loadExerciseProgress(exerciseId) {
  try {
    const response = await fetch(`/api/progress/exercise/${exerciseId}?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      clearCharts();
      return;
    }
    
    const data = await response.json();

    if (!data.trend || data.trend.length === 0) {
      clearCharts();
      return;
    }
    
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

  // 1. Переводим названия групп мышц
  const translatedLabels = stats.map(s => {
    return muscleTranslations[s.muscleGroup] || s.muscleGroup;
  });

  // 2. Данные (Volume)
  const dataValues = stats.map(s => s.totalVolume);

  // 3. Цвета для диаграммы (красивая палитра под стиль сайта)
  const bgColors = [
    '#e94560', // Red (Chest)
    '#3a86ff', // Blue (Back)
    '#4ecca3', // Green (Legs)
    '#ff006e', // Pink (Shoulders)
    '#fb5607', // Orange (Arms)
    '#8338ec'  // Purple (Core)
  ];

  // 4. Создаем график
  muscleGroupChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: translatedLabels, //  Используем переведенные названия
      datasets: [{
        data: dataValues,
        backgroundColor: bgColors,
        borderColor: '#1a1a2e', // Цвет фона сайта для обводки
        borderWidth: 3,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, //  Позволяет графику растягиваться
      layout: {
        padding: 20
      },
      plugins: {
        legend: {
          position: 'right', // Легенда СПРАВА (исправляет пустоту слева)
          align: 'center',
          labels: {
            color: '#ffffff',
            font: {
              size: 14,
              family: "'Segoe UI', sans-serif"
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'rectRounded', // Квадратики в легенде
            boxWidth: 15,
            boxHeight: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          padding: 15,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) label += ': ';
              let value = context.parsed;
              return label + Math.round(value).toLocaleString() + ' кг';
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