if (!checkAuth()) throw new Error('Not authenticated');

// --- Глобальные переменные ---
let exercises = [];                // [{ id, name, muscleGroup }]
let currentExerciseId = null;
let currentTrendData = null;
let currentRawSets = null;
let currentWeightMode = 'weight';
let currentRepsMode = 'reps';

let weightChart = null;
let repsVolumeChart = null;
let muscleChart = null;
let rpeChart = null;

// --- Вспомогательные функции ---
function translateMuscle(group) {
  const map = {
    chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
    arms: 'Руки', core: 'Пресс', glutes: 'Ягодицы'
  };
  return map[group] || group;
}

function showNoDataMessage(ctx, message) {
  if (!ctx) return;
  ctx.font = "14px 'Segoe UI'";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// --- Загрузка списка упражнений и инициализация комбобокса ---
async function loadExercises() {
  const res = await fetchWithAuth('/api/workouts/exercises');
  exercises = await res.json();
  buildDropdown(exercises);

  // Восстанавливаем выбранное упражнение
  const savedId = localStorage.getItem('selectedExerciseId');
  if (savedId && exercises.some(e => e.id == savedId)) {
    currentExerciseId = parseInt(savedId);
    const ex = exercises.find(e => e.id == currentExerciseId);
    document.getElementById('exerciseSearch').value = `${ex.name} (${translateMuscle(ex.muscleGroup)})`;
  } else if (exercises.length) {
    currentExerciseId = exercises[0].id;
    const ex = exercises[0];
    document.getElementById('exerciseSearch').value = `${ex.name} (${translateMuscle(ex.muscleGroup)})`;
  }
  if (currentExerciseId) await loadAllExerciseData(currentExerciseId);
}

// Построение выпадающего списка (фильтрованный или полный)
function buildDropdown(exercisesArr) {
  const dropdown = document.getElementById('exerciseDropdown');
  dropdown.innerHTML = '';
  exercisesArr.forEach(ex => {
    const li = document.createElement('li');
    li.textContent = `${ex.name} (${translateMuscle(ex.muscleGroup)})`;
    li.dataset.id = ex.id;
    li.addEventListener('click', () => {
      // При клике подставляем значение в поле, закрываем список и загружаем данные
      document.getElementById('exerciseSearch').value = li.textContent;
      currentExerciseId = ex.id;
      localStorage.setItem('selectedExerciseId', currentExerciseId);
      dropdown.classList.remove('show');
      loadAllExerciseData(currentExerciseId);
    });
    dropdown.appendChild(li);
  });
}

// Фильтрация списка при вводе текста
function filterExercises() {
  const input = document.getElementById('exerciseSearch');
  const searchText = input.value.toLowerCase();
  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchText) ||
    translateMuscle(ex.muscleGroup).toLowerCase().includes(searchText)
  );
  buildDropdown(filtered);
  const dropdown = document.getElementById('exerciseDropdown');
  // Показываем список, если есть отфильтрованные элементы
  if (filtered.length) {
    dropdown.classList.add('show');
  } else {
    dropdown.classList.remove('show');
  }
}

// Обработчики комбобокса
function initCombobox() {
  const input = document.getElementById('exerciseSearch');
  const dropdown = document.getElementById('exerciseDropdown');
  const toggleBtn = document.querySelector('.combobox-toggle');

  // Показывать список при фокусе или клике на кнопку
  input.addEventListener('focus', () => {
    buildDropdown(exercises); // показываем полный список
    dropdown.classList.add('show');
  });
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    } else {
      buildDropdown(exercises);
      dropdown.classList.add('show');
    }
  });
  input.addEventListener('input', filterExercises);
  // Скрывать список при клике вне
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

// --- Загрузка данных упражнения ---
async function loadAllExerciseData(exerciseId) {
  try {
    const [trendRes, rawRes] = await Promise.all([
      fetchWithAuth(`/api/progress/exercise/${exerciseId}?limit=30`),
      fetchWithAuth(`/api/progress/exercise/${exerciseId}/raw-sets`)
    ]);
    const trendData = await trendRes.json();
    const rawData = await rawRes.json();
    currentTrendData = trendData.trend || [];
    currentRawSets = rawData || [];
    renderWeightChartOrHeatmap();
    renderRepsOrVolumeChart();
  } catch (err) {
    console.error(err);
    currentTrendData = [];
    currentRawSets = [];
    clearExerciseCharts();
  }
}

function clearExerciseCharts() {
  if (weightChart) { weightChart.destroy(); weightChart = null; }
  if (repsVolumeChart) { repsVolumeChart.destroy(); repsVolumeChart = null; }
}

// --- График 1: Динамика веса / тепловая карта ---
function renderWeightChartOrHeatmap() {
  const ctx = document.getElementById('weightChart').getContext('2d');
  const canvas = document.getElementById('weightChart');
  if (weightChart) weightChart.destroy();

  if (currentWeightMode === 'weight') {
    if (!currentTrendData.length) {
      showNoDataMessage(ctx, 'Нет данных для отображения');
      return;
    }
    weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: currentTrendData.map(t => t.date),
        datasets: [{
          label: 'Средний вес (кг)',
          data: currentTrendData.map(t => t.avgWeight),
          borderColor: '#e94560',
          backgroundColor: 'rgba(233,69,96,0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } else {
    if (!currentRawSets.length) {
      showNoDataMessage(ctx, 'Недостаточно данных для тепловой карты');
      return;
    }
    drawHeatmap(canvas, currentRawSets);
  }
}

function drawHeatmap(canvas, rawSets) {
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;

  const repBins = [
    { min: 1, max: 3, label: '1-3' },
    { min: 4, max: 6, label: '4-6' },
    { min: 7, max: 10, label: '7-10' },
    { min: 11, max: 15, label: '11-15' },
    { min: 16, max: Infinity, label: '16+' }
  ];
  const weightStep = 5;
  const weightMap = new Map();
  for (const p of rawSets) {
    const wBin = Math.round(p.weight / weightStep) * weightStep;
    const rLabel = repBins.find(b => p.reps >= b.min && p.reps <= b.max)?.label || '16+';
    if (!weightMap.has(wBin)) weightMap.set(wBin, new Map());
    const repMap = weightMap.get(wBin);
    repMap.set(rLabel, (repMap.get(rLabel) || 0) + 1);
  }
  const weights = Array.from(weightMap.keys()).sort((a,b) => a-b);
  const repLabels = repBins.map(b => b.label);
  let maxCount = 0;
  for (const repMap of weightMap.values()) {
    for (const c of repMap.values()) if (c > maxCount) maxCount = c;
  }

  const cellW = width / (weights.length + 1);
  const cellH = height / (repLabels.length + 1);
  const startX = cellW;
  const startY = cellH;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = '12px "Segoe UI"';
  for (let i = 0; i < weights.length; i++) {
    ctx.fillText(`${weights[i]} кг`, startX + i * cellW + cellW/2 - 15, startY - 5);
  }
  for (let i = 0; i < repLabels.length; i++) {
    ctx.fillText(repLabels[i], startX - 30, startY + i * cellH + cellH/2 + 5);
  }
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    const repMap = weightMap.get(w);
    for (let j = 0; j < repLabels.length; j++) {
      const label = repLabels[j];
      const count = repMap?.get(label) || 0;
      const intensity = maxCount === 0 ? 0 : count / maxCount;
      ctx.fillStyle = `rgba(233, 69, 96, ${0.3 + intensity * 0.7})`;
      ctx.fillRect(startX + i * cellW, startY + j * cellH, cellW - 1, cellH - 1);
      if (count > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Segoe UI"';
        ctx.fillText(count, startX + i * cellW + cellW/2 - 5, startY + j * cellH + cellH/2 + 3);
      }
    }
  }
}

// --- График 2: Средние повторения / Объём ---
function renderRepsOrVolumeChart() {
  const ctx = document.getElementById('repsVolumeChart').getContext('2d');
  if (repsVolumeChart) repsVolumeChart.destroy();
  if (!currentTrendData.length) {
    showNoDataMessage(ctx, 'Нет данных');
    return;
  }
  if (currentRepsMode === 'reps') {
    repsVolumeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: currentTrendData.map(t => t.date),
        datasets: [{
          label: 'Средние повторения',
          data: currentTrendData.map(t => t.maxReps),
          borderColor: '#4ecca3',
          backgroundColor: 'rgba(78,204,163,0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } else {
    repsVolumeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: currentTrendData.map(t => t.date),
        datasets: [{
          label: 'Объём нагрузки (тонн)',
          data: currentTrendData.map(t => t.totalVolume / 1000),
          backgroundColor: '#4ecca3',
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// --- Общие графики ---
async function loadMuscleBalance() {
  try {
    const response = await fetchWithAuth('/api/progress/muscle-balance-radar');
    const data = await response.json();
    // data = [{ muscle: "Грудь", volume: 12500 }, { muscle: "Плечи", volume: 8000 }, ...]
    
    const ctx = document.getElementById('muscleDistributionChart').getContext('2d');
    if (muscleChart) muscleChart.destroy();

    if (!data || data.length === 0) {
      showNoDataMessage(ctx, 'Нет данных');
      return;
    }

    // Находим максимальный объём для нормализации в проценты
    const maxVolume = Math.max(...data.map(d => d.volume), 1);
    const normalizedData = data.map(d => (d.volume / maxVolume) * 100);

    muscleChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.map(d => d.muscle),
        datasets: [{
          label: 'Относительная нагрузка (%)',
          data: normalizedData,
          backgroundColor: 'rgba(233, 69, 96, 0.2)',
          borderColor: '#e94560',
          pointBackgroundColor: '#e94560',
          pointBorderColor: '#fff',
          pointRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              color: '#fff',
              backdropColor: 'transparent'
            },
            grid: { color: 'rgba(255, 255, 255, 0.2)' },
            angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
            pointLabels: { color: '#fff', font: { size: 12 } }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const originalVolume = data[context.dataIndex].volume;
                const percent = context.raw.toFixed(1);
                return `${context.label}: ${percent}% (${(originalVolume / 1000).toFixed(2)} т)`;
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Radar chart error:', err);
    const ctx = document.getElementById('muscleDistributionChart').getContext('2d');
    showNoDataMessage(ctx, 'Ошибка загрузки баланса мышц');
  }
}

async function loadRPEChart() {
  try {
    const response = await fetchWithAuth('/api/progress/rpe');
    const data = await response.json();
    console.log('RPE data from server:', data);

    const ctx = document.getElementById('rpeLineChart').getContext('2d');
    if (rpeChart) rpeChart.destroy();

    if (!data || data.length === 0) {
      showNoDataMessage(ctx, 'Нет данных о самочувствии. Завершите тренировку и оцените самочувствие.');
      return;
    }

    // Нормализуем данные
    let normalized = data.map(item => {
      let rpe = null;
      if (item.actualRPE !== undefined) rpe = item.actualRPE;
      else if (item.actualrpe !== undefined) rpe = item.actualrpe;
      else if (item.wellnessRating !== undefined) rpe = item.wellnessRating;
      return { date: item.date, rpe: rpe };
    }).filter(item => item.rpe !== null && !isNaN(item.rpe));

    if (normalized.length === 0) {
      showNoDataMessage(ctx, 'Нет валидных оценок самочувствия (получены данные: ' + JSON.stringify(data) + ')');
      return;
    }

    // ★★★ РАЗВОРАЧИВАЕМ МАССИВ, чтобы первая дата (самая ранняя) была слева ★★★
    normalized.reverse();

    const labels = normalized.map(d => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    const rpeValues = normalized.map(d => d.rpe);

    rpeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Самочувствие (1–5)',
          data: rpeValues,
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255,193,7,0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#ffc107'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 1, max: 5, ticks: { stepSize: 1, color: '#fff' } },
          x: { ticks: { color: '#fff', maxRotation: 45, autoSkip: true } }
        },
        plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw} / 5` } } }
      }
    });
  } catch (err) {
    console.error('RPE ошибка:', err);
    const ctx = document.getElementById('rpeLineChart').getContext('2d');
    showNoDataMessage(ctx, 'Ошибка загрузки RPE');
  }
}

async function loadOverallStats() {
  try {
    const stats = await (await fetchWithAuth('/api/progress/muscle-groups')).json();
    const totalWorkouts = stats.reduce((s, i) => s + i.totalWorkouts, 0);
    const totalVolumeTons = stats.reduce((s, i) => s + i.totalVolume, 0) / 1000;
    const avgWellness = stats.length ? (stats.reduce((s, i) => s + (i.avgWellnessRating || 0), 0) / stats.length).toFixed(1) : 0;
    document.getElementById('totalWorkouts').textContent = totalWorkouts;
    document.getElementById('avgWellness').textContent = avgWellness;
    document.getElementById('totalVolume').textContent = Math.round(totalVolumeTons).toLocaleString();
  } catch (err) {}
}

// --- Переключатели режимов ---
function initModeSwitches() {
  const weightBtns = document.querySelectorAll('#weightModeSwitch .mode-btn');
  const repsBtns = document.querySelectorAll('#repsVolumeModeSwitch .mode-btn');
  weightBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      weightBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWeightMode = btn.dataset.mode;
      renderWeightChartOrHeatmap();
    });
  });
  repsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      repsBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRepsMode = btn.dataset.mode;
      renderRepsOrVolumeChart();
    });
  });
}

// --- Запуск ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadExercises();
  await loadMuscleBalance();
  await loadRPEChart();
  await loadOverallStats();
  initModeSwitches();
  initCombobox();

  if (sessionStorage.getItem('workoutCompleted') === 'true') {
    sessionStorage.removeItem('workoutCompleted');
    if (currentExerciseId) await loadAllExerciseData(currentExerciseId);
    await loadMuscleBalance();
    await loadRPEChart();
    await loadOverallStats();
    showNotification('✅ Прогресс обновлён');
  }
});