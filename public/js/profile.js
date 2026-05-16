if (!checkAuth()) throw new Error('Not authenticated');

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// Загрузка профиля (включая уровень и цель)
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
    document.getElementById('experienceLevel').value = user.experienceLevel || 'novice';
    document.getElementById('fitnessGoal').value = user.fitnessGoal || 'maintenance';

    const avatarSrc = user.avatarUrl 
      ? user.avatarUrl 
      : '/uploads/avatars/default-avatar.png';
    document.getElementById('avatarPreview').src = avatarSrc;
  } catch (err) {
    showNotification('Не удалось загрузить профиль', 'error');
  }
}

// Загрузка предпочтительных дней
async function loadPreferredDays() {
  try {
    const res = await fetchWithAuth('/api/profile/preferred-days');
    const { days } = await res.json();
    document.querySelectorAll('.days-checkboxes input').forEach(cb => {
      cb.checked = days.includes(parseInt(cb.value));
    });
  } catch (err) {
    console.error(err);
  }
}

// Сохранение дней тренировок
async function savePreferredDays() {
  const checkboxes = document.querySelectorAll('.days-checkboxes input:checked');
  console.log('🔍 Checked checkboxes:', checkboxes);
  
  const days = Array.from(checkboxes)
    .map(cb => {
      const val = parseInt(cb.value);
      console.log(`  - Checkbox with value ${cb.value} -> ${val}`);
      return val;
    })
    .sort((a,b) => a-b);
  
  console.log('📤 Sending days to server:', days);
  
  if (days.length === 0 || days.length > 3) {
    alert('Выберите от 1 до 3 дней');
    return;
  }
  
  try {
    const response = await fetchWithAuth('/api/profile/preferred-days', {
      method: 'PUT',
      body: JSON.stringify({ days })
    });
    const data = await response.json();
    console.log('✅ Server response:', data);
    showNotification('Дни тренировок сохранены! Расписание обновлено.', 'success');
    await loadCalendar(currentYear, currentMonth);
  } catch (err) {
    console.error('❌ Error saving days:', err);
    alert('Ошибка: ' + err.message);
  }
}

// Календарь
async function loadCalendar(year, month) {
  try {
    const res = await fetchWithAuth(`/api/workouts/calendar?year=${year}&month=${month}`);
    const { calendar } = await res.json();
    renderCalendar(year, month, calendar);
  } catch (err) {
    console.error(err);
    document.getElementById('calendarGrid').innerHTML = '<div class="error">Ошибка загрузки календаря</div>';
  }
}

function renderCalendar(year, month, calendarData) {
  const firstDay = new Date(year, month - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  weekdays.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  let offset = (startWeekday === 0 ? 6 : startWeekday - 1);
  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = calendarData[dateStr];
    let statusClass = '';
    if (dayData) {
      if (dayData.status === 'completed') statusClass = 'completed';
      else if (dayData.status === 'skipped') statusClass = 'skipped';
      else if (dayData.status === 'scheduled' || dayData.status === 'in_progress' || dayData.status === 'rescheduled') {
        statusClass = 'scheduled';
      }
    } else {
      statusClass = 'empty';
    }
    const cell = document.createElement('div');
    cell.className = `calendar-day ${statusClass}`;
    cell.textContent = d;
    grid.appendChild(cell);
  }

  let legend = document.querySelector('.calendar-legend');
  if (!legend) {
    legend = document.createElement('div');
    legend.className = 'calendar-legend';
    grid.parentNode.appendChild(legend);
  }
  legend.innerHTML = `
    <span><span class="legend-color completed"></span> Завершена</span>
    <span><span class="legend-color skipped"></span> Пропущена</span>
    <span><span class="legend-color scheduled"></span> Запланирована</span>
  `;
}

function updateCalendar() {
  document.getElementById('currentMonthYear').textContent = `${currentMonth}/${currentYear}`;
  loadCalendar(currentYear, currentMonth);
}

// Аватар
document.getElementById('uploadAvatarBtn').addEventListener('click', () => {
  document.getElementById('avatarInput').click();
});

document.getElementById('avatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) {
    alert('Разрешены только JPG, PNG, GIF, WEBP');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetchWithAuth('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Ошибка загрузки');
    }

    const { avatarUrl } = await res.json();
    const avatarImg = document.getElementById('avatarPreview');
    if (avatarImg) avatarImg.src = avatarUrl;

    const navAvatar = document.querySelector('.nav-avatar-img');
    if (navAvatar) navAvatar.src = avatarUrl;

    showNotification('✅ Аватар обновлён!', 'success');
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки: ' + err.message);
  }
});

// Переключение месяца
document.getElementById('prevMonthBtn').addEventListener('click', () => {
  if (currentMonth === 1) {
    currentMonth = 12;
    currentYear--;
  } else {
    currentMonth--;
  }
  updateCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
  if (currentMonth === 12) {
    currentMonth = 1;
    currentYear++;
  } else {
    currentMonth++;
  }
  updateCalendar();
});

// Сохранение профиля (включая уровень и цель)
const form = document.getElementById('profileForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    nickname: document.getElementById('nickname').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    height: document.getElementById('height').value,
    weight: document.getElementById('weight').value,
    preferredWorkoutTime: document.getElementById('preferredWorkoutTime').value,
    experienceLevel: document.getElementById('experienceLevel').value,
    fitnessGoal: document.getElementById('fitnessGoal').value
  };
  try {
    await fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(formData) });
    showNotification('✅ Профиль успешно обновлен!');
    loadCalendar(currentYear, currentMonth);
  } catch (err) {
    showNotification(err.message, 'error');
  }
});

document.getElementById('saveDaysBtn').addEventListener('click', savePreferredDays);

loadProfile();
loadPreferredDays();
updateCalendar();