if (!checkAuth()) throw new Error('Not authenticated');

async function loadSuggestions() {
  try {
    const data = await (await fetchWithAuth('/api/substitutions')).json();
    renderSuggestions(data.substitutions || []);
  } catch (error) {
    document.getElementById('suggestionsList').innerHTML =
      '<div class="error-message">Ошибка загрузки рекомендаций</div>';
  }
}

function renderSuggestions(substitutions) {
  const container = document.getElementById('suggestionsList');
  const emptyState = document.getElementById('emptyState');

  if (!substitutions || substitutions.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = substitutions.map(sub => `
    <div class="suggestion-card">
      <div class="suggestion-header">
        <span>💡</span>
        <span>Рекомендуется замена</span>
      </div>
      <div class="suggestion-body">
        <div class="exercise-comparison">
          <div class="exercise-item original">
            <div>${sub.originalExercise.name}</div>
            <small>${sub.originalExercise.muscleGroup}</small>
          </div>
          <div class="arrow">→</div>
          <div class="exercise-item alternative">
            <div>${sub.alternativeExercise.name}</div>
            <small>${sub.alternativeExercise.muscleGroup}</small>
          </div>
        </div>
        <div class="reason-text">📝 ${sub.reason}</div>
        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">
          📅 Предложено: ${new Date(sub.suggestedAt).toLocaleDateString('ru-RU')}
        </div>
      </div>
      <div class="suggestion-actions">
        <button class="btn btn-accept" onclick="acceptSubstitution(${sub.originalExercise.id}, ${sub.alternativeExercise.id})">✓ Принять</button>
        <button class="btn btn-dismiss" onclick="dismissSuggestion(this)">Отклонить</button>
      </div>
    </div>
  `).join('');
}

async function acceptSubstitution(originalId, alternativeId) {
  try {
    await fetchWithAuth('/api/substitutions/accept', {
      method: 'POST',
      body: JSON.stringify({ originalExerciseId: originalId, alternativeExerciseId: alternativeId })
    });
    alert('✅ Замена принята!');
    loadSuggestions();
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

function dismissSuggestion(button) {
  const card = button.closest('.suggestion-card');
  card.style.opacity = '0';
  card.style.transform = 'translateX(-20px)';
  setTimeout(() => {
    card.remove();
    if (document.querySelectorAll('.suggestion-card').length === 0) {
      document.getElementById('suggestionsList').innerHTML = '';
      document.getElementById('emptyState').classList.remove('hidden');
    }
  }, 300);
}

document.addEventListener('DOMContentLoaded', loadSuggestions);