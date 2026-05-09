function getToken() {
  return localStorage.getItem('token');
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/auth/login.html';
    return false;
  }
  return true;
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Нет токена');

  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(errorMessage || 'Ошибка запроса');
  }

  return response;
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  const bgColor = type === 'error' ? '#e94560' : '#43e97b';
  notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; animation: slideIn 0.3s ease-out;`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

// Привязываем обработчик выхода на всех страницах
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
});