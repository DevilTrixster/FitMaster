if (!checkAuth()) throw new Error('Not authenticated');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetchWithAuth('/api/workouts/history?limit=20');
    const data = await response.json();
    renderHistory(data.workouts || []);
  } catch (error) {
    document.getElementById('historyList').innerHTML =
      `<p style="text-align:center; color: var(--accent); padding: 2rem;">${error.message}</p>`;
  }
});

function renderHistory(workouts) {
  const container = document.getElementById('historyList');
  if (!workouts || workouts.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem;">История тренировок пуста</p>';
    return;
  }

  container.innerHTML = workouts.map(workout => {
    const dateObj = new Date(workout.scheduledDate);
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = workout.scheduledTime ? workout.scheduledTime.substring(0, 5) : '—';

    const statusMap = {
      completed: 'Завершена',
      scheduled: 'Запланирована',
      skipped: 'Пропущена',
      in_progress: 'В процессе'
    };
    const statusText = statusMap[workout.status] || workout.status;
    const itemClass = workout.status === 'completed' ? 'completed' : (workout.status === 'skipped' ? 'skipped' : '');
    const statusBadgeClass = workout.status === 'completed' ? 'status-completed' : 'status-scheduled';

    const wellnessHtml = workout.wellnessRating
      ? `<div class="wellness">Самочувствие: ${'⭐'.repeat(workout.wellnessRating)} (${workout.wellnessRating}/5)</div>`
      : '';
    const commentsHtml = workout.comments
      ? `<div class="comments-preview">💬 ${workout.comments}</div>`
      : '';

    return `
      <div class="workout-history-item ${itemClass}">
        <div class="history-header">
          <h4>${workout.workoutName || 'Без названия'}</h4>
          <span class="status-badge ${statusBadgeClass}">${statusText}</span>
        </div>
        <div class="history-details">
          <span>📅 ${dateStr}</span>
          <span>⏰ ${timeStr}</span>
        </div>
        ${wellnessHtml}
        ${commentsHtml}
      </div>`;
  }).join('');
}