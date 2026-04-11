document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById('message');
  const form = e.target;
  const formData = new FormData(form);

  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  
  if (password !== confirmPassword) {
    showMessage('Пароли не совпадают', 'error');
    return;
  }

  const data = {
    nickname: formData.get('nickname'),
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    password: password,
    birthDate: formData.get('birthDate'),
    gender: formData.get('gender'),
    height: formData.get('height'),
    weight: formData.get('weight'),
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      showMessage('Регистрация успешна! Программа тренировок создана', 'success');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } else {
      showMessage(result.error || 'Ошибка регистрации', 'error');
    }
  } catch (error) {
    showMessage('Ошибка соединения с сервером', 'error');
  }
});

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}