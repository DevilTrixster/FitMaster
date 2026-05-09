if (!checkAuth()) throw new Error('Not authenticated');

const form = document.getElementById('profileForm');
const messageDiv = document.getElementById('message');

async function loadProfile() {
  try {
    const user = await (await fetchWithAuth('/api/profile')).json();
    document.getElementById('nickname').value = user.nickname || '';
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('height').value = user.height || '';
    document.getElementById('weight').value = user.weight || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('preferredWorkoutTime').value = user.preferredWorkoutTime || '';
  } catch (err) {
    showNotification('Не удалось загрузить данные профиля', 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    nickname: document.getElementById('nickname').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    height: document.getElementById('height').value,
    weight: document.getElementById('weight').value,
    preferredWorkoutTime: document.getElementById('preferredWorkoutTime').value,
  };

  try {
    await fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(formData) });
    showNotification('✅ Профиль успешно обновлен!');
  } catch (err) {
    showNotification(err.message, 'error');
  }
});

loadProfile();