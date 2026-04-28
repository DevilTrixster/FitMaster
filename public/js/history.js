let token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/auth/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadHistory();
  } catch (error) {
    console.error('Ошибка загрузки истории:', error);
    document.getElementById('historyList').innerHTML = 
      '<p style="color: var(--text-secondary); text-align: center;">Ошибка загрузки данных</p>';
  }
});

async function loadHistory() {
  const response = await fetch('/api/workouts/history?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('Failed to load history');
  }

  const data = await response.json();
  renderHistory(data.workouts);
}

function renderHistory(workouts) {
  const container = document.getElementById('historyList');
  
  if (!workouts || workouts.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">История пуста</p>';
    return;
  }

  container.innerHTML = workouts.map(workout => {
    const date = new Date(workout.scheduledDate);
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const statusClass = workout.status === 'completed' ? 'status-completed' : 'status-scheduled';
    const statusText = workout.status === 'completed' ? 'Завершена' : 'Запланирована';
    
    const wellnessStars = workout.wellnessRating 
      ? '⭐'.repeat(workout.wellnessRating) + ` (${workout.wellnessRating}/5)`
      : '-';

    return `
      <div class="card">
        <h3>${workout.workoutName}</h3>
        <div class="workout-meta" style="margin: 0.5rem 0;">
          <span>📅 ${dateStr}</span>
          <span>⏰ ${workout.scheduledTime || '17:00'}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        ${workout.status === 'completed' ? `
          <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
            <div>Самочувствие: ${wellnessStars}</div>
            ${workout.comments ? `<div>Комментарий: ${workout.comments}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}