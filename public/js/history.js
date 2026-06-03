if (!checkAuth()) throw new Error('Not authenticated');

// === Защита от XSS ===
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

let currentOffset = 0;
const LIMIT = 30;
let totalWorkouts = 0;
let currentFilters = {
  sortBy: 'scheduled_date',
  sortOrder: 'DESC',
  dateFrom: '',
  dateTo: '',
  exerciseId: '',
  muscleGroup: ''
};

let exercisesList = [];

// Загрузка списка упражнений для фильтра
async function loadExercises() {
  try {
    const res = await fetchWithAuth('/api/workouts/exercises');
    exercisesList = await res.json();
    const select = document.getElementById('exerciseFilter');
    select.innerHTML = '<option value="">Все</option>';
    exercisesList.forEach(ex => {
      const option = document.createElement('option');
      option.value = ex.id;
      option.textContent = `${ex.name} (${ex.muscleGroup})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Ошибка загрузки упражнений', err);
  }
}

// Загрузка истории с текущими фильтрами и offset
async function loadHistory(reset = false) {
  if (reset) currentOffset = 0;
  
  const params = new URLSearchParams({
    limit: LIMIT,
    offset: currentOffset,
    sortBy: currentFilters.sortBy,
    sortOrder: currentFilters.sortOrder
  });
  if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
  if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
  if (currentFilters.exerciseId) params.append('exerciseId', currentFilters.exerciseId);
  if (currentFilters.muscleGroup) params.append('muscleGroup', currentFilters.muscleGroup);

  try {
    const res = await fetchWithAuth(`/api/workouts/history?${params.toString()}`);
    const data = await res.json();
    totalWorkouts = data.total;
    if (reset) {
      document.getElementById('historyList').innerHTML = '';
    }
    renderWorkouts(data.workouts);
    // Показать/скрыть кнопку "Загрузить ещё"
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (data.hasMore && currentOffset + LIMIT < totalWorkouts) {
      loadMoreBtn.style.display = 'inline-block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  } catch (err) {
    document.getElementById('historyList').innerHTML = `<div class="error-message">Ошибка загрузки: ${err.message}</div>`;
  }
}

// Рендер списка карточек
function renderWorkouts(workouts) {
  const container = document.getElementById('historyList');
  if (!workouts.length && container.children.length === 0) {
    container.innerHTML = '<div class="loading">Нет завершённых тренировок</div>';
    return;
  }

  workouts.forEach(workout => {
    const card = document.createElement('div');
    card.className = 'workout-card';
    card.dataset.id = workout.id;
    
    const dateObj = new Date(workout.scheduledDate);
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = workout.scheduledTime ? workout.scheduledTime.substring(0,5) : '';
    
    card.innerHTML = `
      <div class="workout-header">
        <div class="workout-title">${escapeHtml(workout.workoutName)}</div>
        <div class="workout-date">${dateStr} ${timeStr}</div>
        <div class="workout-badge">Самочувствие: ${'⭐'.repeat(workout.wellnessRating || 0)}</div>
        <div class="expand-icon">▼</div>
      </div>
      <div class="workout-details">
        <div class="details-loading">Загрузка деталей...</div>
      </div>
    `;
    
    // Обработчик клика по заголовку (раскрытие)
    const header = card.querySelector('.workout-header');
    header.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isExpanded = card.classList.contains('expanded');
      if (!isExpanded) {
        // Загружаем детали, если ещё не загружены
        const detailsDiv = card.querySelector('.workout-details');
        if (detailsDiv.querySelector('.details-loading')) {
          try {
            const details = await fetchWithAuth(`/api/workouts/${workout.id}/details`);
            const data = await details.json();
            renderWorkoutDetails(card, data);
          } catch (err) {
            detailsDiv.innerHTML = `<div class="error-message">Ошибка загрузки: ${err.message}</div>`;
          }
        }
      }
      card.classList.toggle('expanded');
    });
    
    container.appendChild(card);
  });
}

// Отрисовка деталей тренировки (упражнения, подходы)
function renderWorkoutDetails(card, data) {
  const detailsDiv = card.querySelector('.workout-details');
  if (!data.exercises || data.exercises.length === 0) {
    detailsDiv.innerHTML = '<div class="loading">Нет данных об упражнениях</div>';
    return;
  }
  
  let html = '';
  for (const ex of data.exercises) {
    html += `
      <div class="details-exercise">
        <h4>${escapeHtml(ex.exercise.name)} <span style="font-size:0.8rem; color:#aaa;">(${ex.exercise.muscleGroup})</span></h4>
        <table class="sets-table">
          <thead>
            <tr><th>Подход</th><th>Тип</th><th>Показатели</th></tr>
          </thead>
          <tbody>
    `;
    if (ex.completedSets && ex.completedSets.length) {
      ex.completedSets.forEach(set => {
        const metricsHtml = set.metrics.map(m => 
          `<span class="metric-item">${m.metricType === 'reps' ? 'Повт' : m.metricType === 'weight' ? 'Вес' : m.metricType}: ${m.value} ${m.unit || ''}</span>`
        ).join('');
        html += `
          <tr>
            <td>${set.setNumber}</td>
            <td>${set.setType === 'skip' ? 'Пропущен' : 'Выполнен'}</td>
            <td><div class="metrics-list">${metricsHtml || '—'}</div></td>
          </tr>
        `;
      });
    } else {
      html += `<tr><td colspan="3">Нет выполненных подходов</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  
  if (data.comments) {
    html += `<div class="workout-comments">💬 ${escapeHtml(data.comments)}</div>`;
  }
  
  detailsDiv.innerHTML = html;
}

// Применение фильтров
function applyFilters() {
  currentFilters.sortBy = document.getElementById('sortBy').value;
  currentFilters.sortOrder = document.getElementById('sortOrder').value;
  currentFilters.dateFrom = document.getElementById('dateFrom').value;
  currentFilters.dateTo = document.getElementById('dateTo').value;
  currentFilters.exerciseId = document.getElementById('exerciseFilter').value;
  currentFilters.muscleGroup = document.getElementById('muscleGroupFilter').value;
  loadHistory(true);
}

function resetFilters() {
  document.getElementById('sortBy').value = 'scheduled_date';
  document.getElementById('sortOrder').value = 'DESC';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  document.getElementById('exerciseFilter').value = '';
  document.getElementById('muscleGroupFilter').value = '';
  applyFilters();
}

// Загрузка ещё
function loadMore() {
  currentOffset += LIMIT;
  loadHistory(false);
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  await loadExercises();
  await loadHistory(true);
  
  document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
});