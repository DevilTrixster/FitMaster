if (!checkAuth()) throw new Error('Not authenticated');

let weightChartInstance = null;
let repRangeChartInstance = null;
let rpeChartInstance = null;
let muscleDistributionChartInstance = null;

const muscleTranslations = {
  'chest': 'Грудь',
  'back': 'Спина',
  'legs': 'Ноги',
  'shoulders': 'Плечи',
  'arms': 'Руки',
  'core': 'Пресс / Кор',
  'glutes': 'Ягодицы',
  'biceps': 'Бицепс',
  'triceps': 'Трицепс',
  'default': 'Другое'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadExercises();
    await loadMuscleDistributionStats('all');
    await loadOverallStats();
    await loadRPEData();

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadMuscleDistributionStats(e.target.dataset.period);
      });
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) refreshAllData();
    });

    if (sessionStorage.getItem('workoutCompleted') === 'true') {
      sessionStorage.removeItem('workoutCompleted');
      await refreshAllData();
      showNotification('✅ Тренировка завершена! Прогресс обновлён.');
    }
  } catch (error) {
    showError(error.message);
  }
});

async function refreshAllData() {
  try {
    await loadExercises();
    await loadMuscleDistributionStats('all');
    await loadOverallStats();
    await loadRPEData();
  } catch (error) {
    console.error(error);
  }
}

async function loadExercises() {
  const exercises = await (await fetchWithAuth('/api/workouts/exercises')).json();
  const select = document.getElementById('exerciseSelect');
  if (exercises.length === 0) {
    select.innerHTML = '<option value="">Нет доступных упражнений</option>';
    clearExerciseCharts();
    return;
  }
  select.innerHTML = exercises.map(ex =>
    `<option value="${ex.id}">${ex.name} (${ex.muscleGroup})</option>`
  ).join('');

  if (exercises.length > 0) {
    await loadExerciseProgress(exercises[0].id);
  }

  select.addEventListener('change', (e) => {
    const exerciseId = parseInt(e.target.value);
    if (exerciseId) loadExerciseProgress(exerciseId);
  });
}

async function loadExerciseProgress(exerciseId) {
  try {
    const response = await fetchWithAuth(`/api/progress/exercise/${exerciseId}?limit=30`);
    const data = await response.json();
    if (!data.trend || data.trend.length === 0) {
      clearExerciseCharts();
      return;
    }
    renderWeightChart(data.trend);
    renderRepRangeChart(data.trend);
  } catch (error) {
    console.error(error);
    clearExerciseCharts();
  }
}

function clearExerciseCharts() {
  if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }
  if (repRangeChartInstance) { repRangeChartInstance.destroy(); repRangeChartInstance = null; }
}

async function loadMuscleDistributionStats(period = 'all') {
  const stats = await (await fetchWithAuth(`/api/progress/muscle-groups?period=${period}`)).json();
  renderMuscleDistributionChart(stats);
}

async function loadRPEData() {
  try {
    const data = await (await fetchWithAuth('/api/progress/rpe')).json();
    renderRPEChart(data);
  } catch { /* игнорируем */ }
}

async function loadOverallStats() {
  try {
    const stats = await (await fetchWithAuth('/api/progress/muscle-groups?period=all')).json();
    const totalWorkouts = stats.reduce((sum, s) => sum + s.totalWorkouts, 0);
    const totalVolumeTons = stats.reduce((sum, s) => sum + s.totalVolume, 0) / 1000;
    const avgWellness = stats.length > 0
      ? stats.reduce((sum, s) => sum + (s.avgWellnessRating || 0), 0) / stats.length
      : 0;

    document.getElementById('totalWorkouts').textContent = totalWorkouts;
    document.getElementById('avgWellness').textContent = avgWellness.toFixed(1);
    document.getElementById('totalVolume').textContent = Math.round(totalVolumeTons).toLocaleString();
  } catch { /* игнорируем */ }
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
        borderColor: '#e94560',
        backgroundColor: 'rgba(233, 69, 96, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Вес: ${context.parsed.y.toFixed(1)} кг`;
            }
          }
        }
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

// Рендер гистограммы повторений
function renderRepRangeChart(trend) {
  const ctx = document.getElementById('repRangeChart').getContext('2d');
  if (repRangeChartInstance) {
    repRangeChartInstance.destroy();
  }

  // Анализируем распределение повторений
  const repRanges = {
    strength: { label: 'Сила (1-5)', count: 0, color: '#e94560' },
    hypertrophy: { label: 'Масса (6-12)', count: 0, color: '#4ecca3' },
    endurance: { label: 'Выносливость (13+)', count: 0, color: '#3a86ff' }
  };

  // Подсчитываем повторения из данных
  trend.forEach(session => {
    const avgReps = session.avgReps || 10; // Если нет данных, берем 10
    
    if (avgReps <= 5) {
      repRanges.strength.count++;
    } else if (avgReps <= 12) {
      repRanges.hypertrophy.count++;
    } else {
      repRanges.endurance.count++;
    }
  });

  repRangeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.values(repRanges).map(r => r.label),
      datasets: [{
        label: 'Количество тренировок',
        data: Object.values(repRanges).map(r => r.count),
        backgroundColor: Object.values(repRanges).map(r => r.color),
        borderColor: Object.values(repRanges).map(r => r.color),
        borderWidth: 2,
        borderRadius: 8,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          padding: 15,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              const total = Object.values(repRanges).reduce((sum, r) => sum + r.count, 0);
              const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
              return `${context.parsed.y} тренировок (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Рендер графика распределения по мышцам
function renderMuscleDistributionChart(stats) {
  const ctx = document.getElementById('muscleDistributionChart').getContext('2d');
  if (muscleDistributionChartInstance) {
    muscleDistributionChartInstance.destroy();
  }
  
  // Переводим названия групп мышц
  const translatedLabels = stats.map(s => {
    return muscleTranslations[s.muscleGroup] || s.muscleGroup;
  });
  
  // Данные в тоннах (делим на 1000 для наглядности)
  const dataInTons = stats.map(s => s.totalVolume / 1000);
  
  // Цвета для диаграммы
  const bgColors = [
    '#e94560', // Red (Chest)
    '#3a86ff', // Blue (Back)
    '#4ecca3', // Green (Legs)
    '#ff006e', // Pink (Shoulders)
    '#fb5607', // Orange (Arms)
    '#8338ec', // Purple (Core)
    '#06ffa5'  // Mint (Glutes)
  ];
  
  muscleDistributionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: translatedLabels,
      datasets: [{
        label: 'Объём (тонн)',
        data: dataInTons,
        backgroundColor: bgColors,
        borderColor: bgColors.map(c => c + 'cc'),
        borderWidth: 2,
        borderRadius: 8,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#e94560',
          bodyColor: '#fff',
          padding: 15,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return `Объём: ${value.toFixed(2)} тонн (${Math.round(value * 1000).toLocaleString()} кг)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + ' т';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Рендер графика RPE vs План
// Рендер графика RPE vs План
function renderRPEChart(data) {
  const ctx = document.getElementById('rpeChart').getContext('2d');
  
  if (rpeChartInstance) {
    rpeChartInstance.destroy();
  }

  // Если данных нет (например, нет завершенных тренировок), рисуем сообщение
  if (!data || data.length === 0) {
    ctx.font = "16px 'Segoe UI'";
    ctx.fillStyle = "#rgba(255, 255, 255, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText("Нет данных для отображения", ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  rpeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
      datasets: [
        {
          label: 'Плановая сложность',
          data: data.map(d => d.plannedRPE),
          borderColor: '#4ecca3', // Зеленый
          backgroundColor: 'rgba(78, 204, 163, 0.1)',
          borderWidth: 3,
          borderDash: [5, 5], // Пунктирная линия
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Фактическая (RPE)',
          data: data.map(d => d.actualRPE),
          borderColor: '#e94560', // Красный
          backgroundColor: 'rgba(233, 69, 96, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
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
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#ffffff',
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y}/10`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.7)',
            callback: function(value) {
              return value + '/10';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            display: false
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