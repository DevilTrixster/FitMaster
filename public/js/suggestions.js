const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/auth/login.html';
}

// Загрузка рекомендаций
async function loadSuggestions() {
  try {
    const response = await fetch('/api/substitutions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить рекомендации');
    }

    const data = await response.json();
    renderSuggestions(data.substitutions || []);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    document.getElementById('suggestionsList').innerHTML = 
      '<div class="error-message">Ошибка загрузки рекомендаций</div>';
  }
}

// Отображение рекомендаций
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
        
        <div class="reason-text">
          📝 ${sub.reason}
        </div>
        
        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">
          📅 Предложено: ${new Date(sub.suggestedAt).toLocaleDateString('ru-RU')}
        </div>
      </div>
      
      <div class="suggestion-actions">
        <button class="btn btn-accept" onclick="acceptSubstitution(${sub.originalExercise.id}, ${sub.alternativeExercise.id})">
          ✓ Принять
        </button>
        <button class="btn btn-dismiss" onclick="dismissSuggestion(this)">
          Отклонить
        </button>
      </div>
    </div>
  `).join('');
}

// Принять замену
async function acceptSubstitution(originalId, alternativeId) {
  try {
    const response = await fetch('/api/substitutions/accept', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalExerciseId: originalId,
        alternativeExerciseId: alternativeId
      })
    });

    if (response.ok) {
      alert('✅ Замена принята! Она будет применена в следующей тренировке.');
      loadSuggestions(); // Перезагрузить список
    } else {
      throw new Error('Не удалось принять замену');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    alert('Ошибка при принятии замены');
  }
}

// Отклонить рекомендацию
function dismissSuggestion(button) {
  const card = button.closest('.suggestion-card');
  card.style.opacity = '0';
  card.style.transform = 'translateX(-20px)';
  setTimeout(() => {
    card.remove();
    // Проверить, остались ли карточки
    const remaining = document.querySelectorAll('.suggestion-card');
    if (remaining.length === 0) {
      document.getElementById('suggestionsList').innerHTML = '';
      document.getElementById('emptyState').classList.remove('hidden');
    }
  }, 300);
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/auth/login.html';
});

// Загрузить при старте
document.addEventListener('DOMContentLoaded', loadSuggestions);