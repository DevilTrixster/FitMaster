const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html';
}

let currentPage = 1;
const limit = 10;

async function loadHistory(page = 1) {
  try {
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);
    
    const response = await fetch(`/api/workouts/history?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Ошибка загрузки');

    const data = await response.json();
    renderHistory(data.workouts, page === 1);
  } catch (error) {
    document.getElementById('historyList').innerHTML = 
      `<div class="error">Ошибка: ${error.message}</div>`;
  }
}

function renderHistory(workouts, clear = true) {
  const container = document.getElementById('historyList');
  
  if (clear) {
    container.innerHTML = '';
  }
  
  if (workouts.length === 0 && clear) {
    container.innerHTML = '<div class="empty">История пуста</div>';
    document.getElementById('loadMoreBtn').style.display = 'none';
    return;
  }

  const html = workouts.map(workout => `
    <div class="history-item ${workout.status}" onclick="showWorkoutDetails(${workout.id})">
      <div class="item-header">
        <h4>${workout.workoutName}</h4>
        <span class="status-badge ${workout.status}">${getStatusText(workout.status)}</span>
      </div>
      <div class="item-details">
        <span class="date">📅 ${formatDate(workout.scheduledDate)}</span>
        <span class="time">⏰ ${workout.scheduledTime}</span>
      </div>
      ${workout.wellnessRating ? `
        <div class="wellness">
          Самочувствие: ${'⭐'.repeat(workout.wellnessRating)} (${workout.wellnessRating}/5)
        </div>
      ` : ''}
      ${workout.comments ? `
        <div class="comments-preview">
          💬 ${workout.comments.substring(0, 100)}${workout.comments.length > 100 ? '...' : ''}
        </div>
      ` : ''}
      <div class="item-stats">
        <span>Упражнений: ${workout.exercisesCount || 6}</span>
        <span>Успешность: ${workout.successRate || 0}%</span>
      </div>
    </div>
  `).join('');

  container.insertAdjacentHTML('beforeend', html);
  
  if (workouts.length < limit) {
    document.getElementById('loadMoreBtn').style.display = 'none';
  }
}

document.getElementById('loadMoreBtn').addEventListener('click', () => {
  currentPage++;
  loadHistory(currentPage);
});

document.getElementById('statusFilter').addEventListener('change', () => {
  currentPage = 1;
  loadHistory(1);
});

function getStatusText(status) {
  const map = {
    'completed': 'Завершена',
    'skipped': 'Пропущена',
    'in_progress': 'В процессе',
  };
  return map[status] || status;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
}

// Загрузка при старте
loadHistory(1);