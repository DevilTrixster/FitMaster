let token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login'; // Исправлен путь на актуальный
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadHistory();
  } catch (error) {
    console.error('Ошибка загрузки истории:', error);
    document.getElementById('historyList').innerHTML = 
      '<p style="text-align:center; color: var(--accent); padding: 2rem;">Ошибка загрузки данных. Попробуйте обновить страницу.</p>';
  }
});

async function loadHistory() {
  const response = await fetch('/api/workouts/history?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Не удалось загрузить историю`);
  }
  
  const data = await response.json();
  renderHistory(data.workouts || []);
}

function renderHistory(workouts) {
  const container = document.getElementById('historyList');
  
  if (!workouts || workouts.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem;">История тренировок пуста</p>';
    return;
  }

  container.innerHTML = workouts.map(workout => {
    // 1. Форматируем дату
    const dateObj = new Date(workout.scheduledDate);
    const dateStr = dateObj.toLocaleDateString('ru-RU', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });

    // 2. Форматируем время (строго ЧЧ:ММ, безопасно для null/undefined)
    const rawTime = workout.scheduledTime;
    const timeStr = rawTime ? rawTime.substring(0, 5) : '—';

    // 3. Маппинг статусов и классов для CSS
    const statusMap = {
      completed: 'Завершена',
      scheduled: 'Запланирована',
      skipped: 'Пропущена',
      in_progress: 'В процессе'
    };
    const statusText = statusMap[workout.status] || workout.status;
    const itemClass = workout.status === 'completed' ? 'completed' 
                  : workout.status === 'skipped' ? 'skipped' : '';
    const statusBadgeClass = workout.status === 'completed' ? 'status-completed' : 'status-scheduled';

    // 4. Самочувствие и комментарии (только если есть данные)
    const wellnessHtml = workout.wellnessRating 
      ? `<div class="wellness">Самочувствие: ${'⭐'.repeat(workout.wellnessRating)} (${workout.wellnessRating}/5)</div>`
      : '';
      
    const commentsHtml = workout.comments 
      ? `<div class="comments-preview">💬 ${workout.comments}</div>`
      : '';

    // 5. Сборка HTML СТРОГО по структуре из history.css
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
      </div>
    `;
  }).join('');
}