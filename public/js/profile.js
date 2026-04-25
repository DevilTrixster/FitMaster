const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/login.html';

const form = document.getElementById('profileForm');
const messageDiv = document.getElementById('message');

// Загрузка данных профиля
async function loadProfile() {
  try {
    const res = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки');
    
    const user = await res.json();
    
    document.getElementById('nickname').value = user.nickname || '';
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('height').value = user.height || '';
    document.getElementById('weight').value = user.weight || '';
    document.getElementById('email').value = user.email || '';
  } catch (err) {
    showMessage('Не удалось загрузить данные профиля', 'error');
  }
}

// Сохранение профиля
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    nickname: document.getElementById('nickname').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    height: document.getElementById('height').value,
    weight: document.getElementById('weight').value,
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка сохранения');
    }

    showMessage('✅ Профиль успешно обновлен!', 'success');
  } catch (err) {
    showMessage('❌ ' + err.message, 'error');
  }
});

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  setTimeout(() => {
    messageDiv.className = 'message hidden';
  }, 3000);
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/auth/login.html';
});

loadProfile();