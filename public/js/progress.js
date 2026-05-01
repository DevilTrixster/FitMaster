// ============================================
// FitMaster - Progress Page Logic
// Аналитика прогресса и нагрузок
// ============================================

let token = localStorage.getItem('token');
let volumeIntensityChartInstance = null;
let muscleLoadChartInstance = null;
let rpeChartInstance = null;

// 🌍 Словарь переводов мышечных групп
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

// ============================================
// Инициализация при загрузке страницы
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('📊 Загрузка страницы прогресса...');
    
    await loadOverallStats();
    await loadVolumeIntensityData();
    await loadMuscleLoadData();
    await loadRPEData();

    // Обработчик обновления после тренировки
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        refreshAllData();
      }
    });

    // Проверяем флаг завершения тренировки
    const shouldRefresh = sessionStorage.getItem('workoutCompleted');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      await refreshAllData();
      showNotification('✅ Тренировка завершена! Прогресс обновлён.');
    }

    console.log('✅ Страница прогресса загружена успешно');
  } catch (error) {
    console.error('❌ Ошибка загрузки прогресса:', error);
    showError('Ошибка загрузки данных: ' + error.message);
  }
});

// ============================================
// Полное обновление всех данных
// ============================================
async function refreshAllData() {
  try {
    console.log('🔄 Обновление всех данных прогресса...');
    await Promise.all([
      loadOverallStats(),
      loadVolumeIntensityData(),
      loadMuscleLoadData(),
      loadRPEData()
    ]);
    console.log('✅ Все данные обновлены');
  } catch (error) {
    console.error('❌ Ошибка обновления данных:', error);
  }
}

// ============================================
// 1. ОБЩАЯ СТАТИСТИКА (Карточки сверху)
// ============================================
async function loadOverallStats() {
  try {
    const response = await fetch('/api/progress/muscle-groups', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const stats = await response.json();
    
    const totalWorkouts = stats.reduce((sum, s) => sum + (s.totalWorkouts || 0), 0);
    const totalVolume = stats.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    
    // Расчёт среднего RPE (если есть данные)
    const workoutsWithRPE = stats.filter(s => s.avgWellnessRating);
    const avgRPE = workoutsWithRPE.length > 0
      ? workoutsWithRPE.reduce((sum, s) => sum + (s.avgWellnessRating || 0), 0) / workoutsWithRPE.length
      : 0;

    // Обновляем карточки
    const totalWorkoutsEl = document.getElementById('totalWorkouts');
    const totalVolumeEl = document.getElementById('totalVolume');
    const avgRPEEl = document.getElementById('avgWellness');

    if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
    if (totalVolumeEl) totalVolumeEl.textContent = Math.round(totalVolume).toLocaleString();
    if (avgRPEEl) avgRPEEl.textContent = avgRPE > 0 ? avgRPE.toFixed(1) : '-';

  } catch (error) {
    console.error('Ошибка загрузки общей статистики:', error);
  }
}

// ============================================
// 2. ГРАФИК: Объём и Интенсивность
// ============================================
async function loadVolumeIntensityData() {
  try {
    // 🔥 ВРЕМЕННО: Используем mock-данные
    // Замените на реальный API endpoint когда будет готов
    const mockData = [
      { date: '01 Май', volume: 4500, intensity: 60 },
      { date: '03 Май', volume: 5200, intensity: 75 },
      { date: '05 Май', volume: 4800, intensity: 65 },
      { date: '08 Май', volume: 5800, intensity: 80 },
      { date: '10 Май', volume: 6200, intensity: 85 },
      { date: '12 Май', volume: 5500, intensity: 70 },
      { date: '15 Май', volume: 6800, intensity: 88 },
    ];

    // Когда будет API:
    // const response = await fetch('/api/progress/volume-intensity?limit=10', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to load volume data');
    // const data = await response.json();

    renderVolumeIntensityChart(mockData);

  } catch (error) {
    console.error('Ошибка загрузки данных объёма:', error);
    showError('Не удалось загрузить график объёма');
  }
}

function renderVolumeIntensityChart(data) {
  const ctx = document.getElementById('volumeIntensityChart');
  if (!ctx) return;

  // Уничтожаем старый график если есть
  if (volumeIntensityChartInstance) {
    volumeIntensityChartInstance.destroy();
  }

  volumeIntensityChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'Общий объём (кг)',
          data: data.map(d => d.volume),
          backgroundColor: 'rgba(233, 69, 96, 0.7)',
          borderColor: '#e94560',
          borderWidth: 2,
          yAxisID: 'y',
          order: 2,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'Интенсивность (%)',
          data: data.map(d => d.intensity),
          type: 'line',
          borderColor: '#4ecca3',
          backgroundColor: 'rgba(78, 204, 163, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#4ecca3',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#ffffff',
            font: { size: 13 },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                if (context.dataset.yAxisID === 'y1') {
                  label += Math.round(context.parsed.y) + '%';
                } else {
                  label += Math.round(context.parsed.y).toLocaleString() + ' кг';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Тоннаж (кг)',
            color: '#e94560',
            font: { size: 13, weight: 'bold' }
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(233, 69, 96, 0.7)',
            callback: function(value) {
              return value.toLocaleString() + ' кг';
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Интенсивность (%)',
            color: '#4ecca3',
            font: { size: 13, weight: 'bold' }
          },
          grid: {
            drawOnChartArea: false,
            drawBorder: false
          },
          ticks: {
            color: 'rgba(78, 204, 163, 0.7)',
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// ============================================
// 3. ГРАФИК: Нагрузка по мышечным группам
// ============================================
async function loadMuscleLoadData() {
  try {
    const response = await fetch('/api/progress/muscle-groups', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load muscle data');
    const data = await response.json();

    renderMuscleLoadChart(data);

  } catch (error) {
    console.error('Ошибка загрузки данных по мышцам:', error);
    showError('Не удалось загрузить график нагрузки');
  }
}

function renderMuscleLoadChart(stats) {
  const ctx = document.getElementById('muscleLoadChart');
  if (!ctx) return;

  if (muscleLoadChartInstance) {
    muscleLoadChartInstance.destroy();
  }

  // Переводим названия и готовим данные
  const labels = stats.map(s => muscleTranslations[s.muscleGroup] || s.muscleGroup);
  const volumes = stats.map(s => s.totalVolume || 0);

  // Красивая палитра цветов
  const colors = [
    '#e94560', // Красный (Грудь)
    '#3a86ff', // Синий (Спина)
    '#4ecca3', // Зелёный (Ноги)
    '#ff006e', // Розовый (Плечи)
    '#fb5607', // Оранжевый (Руки)
    '#8338ec'  // Фиолетовый (Пресс)
  ];

  muscleLoadChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Объём нагрузки (кг)',
        data: volumes,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c + 'cc'),
        borderWidth: 2,
        borderRadius: 10,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Скрываем легенду, цвета и так понятны
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${Math.round(value).toLocaleString()} кг (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)',
            callback: function(value) {
              return value.toLocaleString() + ' кг';
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#fff',
            font: { size: 13, weight: '600' }
          }
        }
      }
    }
  });
}

// ============================================
// 4. ГРАФИК: RPE (Воспринимаемая нагрузка)
// ============================================
async function loadRPEData() {
  try {
    // 🔥 ВРЕМЕННО: Mock-данные
    const mockData = [
      { date: '01 Май', plannedRPE: 7, actualRPE: 6 },
      { date: '03 Май', plannedRPE: 8, actualRPE: 9 },
      { date: '05 Май', plannedRPE: 7, actualRPE: 7 },
      { date: '08 Май', plannedRPE: 8, actualRPE: 8 },
      { date: '10 Май', plannedRPE: 9, actualRPE: 10 },
      { date: '12 Май', plannedRPE: 7, actualRPE: 6 },
      { date: '15 Май', plannedRPE: 8, actualRPE: 9 },
    ];

    // Когда будет API:
    // const response = await fetch('/api/progress/rpe?limit=10', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to load RPE data');
    // const data = await response.json();

    renderRPEChart(mockData);

  } catch (error) {
    console.error('Ошибка загрузки данных RPE:', error);
    showError('Не удалось загрузить график RPE');
  }
}

function renderRPEChart(data) {
  const ctx = document.getElementById('rpeChart');
  if (!ctx) return;

  if (rpeChartInstance) {
    rpeChartInstance.destroy();
  }

  rpeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'Плановая нагрузка (RPE)',
          data: data.map(d => d.plannedRPE),
          borderColor: 'rgba(255, 255, 255, 0.4)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointBackgroundColor: 'rgba(255, 255, 255, 0.6)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Фактическая нагрузка (RPE)',
          data: data.map(d => d.actualRPE),
          borderColor: '#e94560',
          backgroundColor: 'rgba(233, 69, 96, 0.15)',
          borderWidth: 3,
          pointBackgroundColor: '#e94560',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#ffffff',
            font: { size: 13 },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              label += context.parsed.y + '/10';
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1,
            color: 'rgba(255,255,255,0.7)',
            callback: function(value) {
              return value + '/10';
            }
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false
          },
          title: {
            display: true,
            text: 'Уровень нагрузки (1-10)',
            color: 'rgba(255,255,255,0.6)',
            font: { size: 12 }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// ============================================
// Утилиты
// ============================================

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
    font-weight: 500;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showError(message) {
  const container = document.getElementById('errorContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-message">
      ⚠️ ${message}
    </div>
  `;
  
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