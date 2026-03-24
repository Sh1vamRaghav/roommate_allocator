// Shared API utils
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };
  const config = { ...defaults, ...options };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    if (res.status === 401) {
      logout();
      return;
    }
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    alert('Network error');
  }
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

async function onAppLoad() {
  const token = getToken();
  if (!token) return;
  const decoded = parseJwt(token);
  if (!decoded?.role) return;
  const currentPath = window.location.pathname.split('/').pop();
  if (decoded.role === 'ADMIN' && !currentPath.includes('admin-dashboard.html')) {
    window.location.href = '/admin-dashboard.html';
  } else if (decoded.role !== 'ADMIN' && !currentPath.includes('student-dashboard.html')) {
    window.location.href = '/student-dashboard.html';
  }
}

// Form handler helper
function handleFormSubmit(form, endpoint, afterSuccess) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      alert('Success!');
      if (afterSuccess) afterSuccess(result);
    }
  });
}

// Global load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    onAppLoad();
    onAppLoad();
    // Attach logout listeners
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', logout);
    });
    // Attach admin run alloc
    // Nav links for student dashboard
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.dataset.section;
        if (sectionId && typeof window.showSection === 'function') {
          window.showSection(sectionId);
        }
      });
    });
  });
} else {
  onAppLoad();
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', logout);
  });
  document.querySelectorAll('.run-alloc-btn').forEach(btn => {
    btn.addEventListener('click', window.runAllocation || (() => {}));
  });
}
