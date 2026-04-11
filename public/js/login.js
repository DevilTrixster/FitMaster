document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById('message');
  const form = e.target;
  const formData = new FormData(form);

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  console.log('Отправка данных:', data); // Для отладки

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify(data), 
    });

    const result = await response.json();
    console.log('Ответ сервера:', result); // Для отладки

    if (response.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      showMessage('Вход успешен! Перенаправление...', 'success');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } else {
      showMessage(result.error || 'Ошибка входа', 'error');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    showMessage('Ошибка соединения с сервером', 'error');
  }
});

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}