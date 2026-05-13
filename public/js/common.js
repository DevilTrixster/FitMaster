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
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
    backdrop-filter: blur(10px);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function initNavAvatar() {
  const navUser = document.querySelector('.nav-user');
  if (!navUser) return;

  // Найти ссылку "Профиль"
  const profileLink = Array.from(navUser.querySelectorAll('a')).find(a => a.textContent.trim() === 'Профиль');
  if (!profileLink) return;

  // Получить аватар пользователя
  let avatarUrl = '/default-avatar.png';
  try {
    const user = await (await fetchWithAuth('/api/profile')).json();
    if (user.avatarUrl) avatarUrl = user.avatarUrl;
  } catch (e) {
    console.warn('Не удалось загрузить аватар');
  }

  // Создать элемент аватара
  const avatarImg = document.createElement('img');
  avatarImg.src = avatarUrl;
  avatarImg.className = 'nav-avatar-img';
  avatarImg.alt = 'Avatar';
  avatarImg.style.width = '40px';
  avatarImg.style.height = '40px';
  avatarImg.style.borderRadius = '50%';
  avatarImg.style.cursor = 'pointer';
  avatarImg.style.objectFit = 'cover';
  avatarImg.style.border = '2px solid var(--accent)';
  avatarImg.style.transition = 'transform 0.2s, box-shadow 0.2s';

  // Заменить ссылку на аватар
  const parent = profileLink.parentElement;
  parent.replaceChild(avatarImg, profileLink);

  // Создать выпадающее меню
  const dropdown = document.createElement('div');
  dropdown.className = 'avatar-dropdown';
  dropdown.innerHTML = `
    <a href="/profile">👤 Профиль</a>
    <button id="logoutBtnDropdown">🚪 Выход</button>
  `;
  parent.appendChild(dropdown);

  // Обработчики
  avatarImg.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => dropdown.classList.remove('show'));

  const logoutBtn = dropdown.querySelector('#logoutBtnDropdown');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
  initNavAvatar();
});