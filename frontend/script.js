// ── API config ──────────────────────────────────────────────
const API_BASE = '/api';

// ── Token helpers ────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }

function setToken(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// ── JWT parser ───────────────────────────────────────────────
function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

// ── API fetch wrapper ────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (res.status === 401) { logout(); return null; }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Return the error object so callers can inspect it
    return { __error: true, status: res.status, ...data };
  }

  return data;
}

// ── UI helpers ───────────────────────────────────────────────
function showAlert(container, message, type = 'error') {
  const icon = type === 'error' ? '✕' : '✓';
  container.innerHTML = `<div class="alert alert-${type}"><span>${icon}</span>${message}</div>`;
}

function clearAlert(container) { container.innerHTML = ''; }

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Please wait…`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ── Route guard: redirect already-logged-in users ────────────
function redirectIfLoggedIn() {
  const token = getToken();
  if (!token) return;
  const decoded = parseJwt(token);
  if (!decoded?.role) return;
  const page = window.location.pathname.split('/').pop();
  if (decoded.role === 'ADMIN' && !page.includes('admin-dashboard')) {
    window.location.href = '/admin-dashboard.html';
  } else if (decoded.role === 'STUDENT' && !page.includes('student-dashboard')) {
    window.location.href = '/student-dashboard.html';
  }
}

// ── Init on DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();

  document.querySelectorAll('.logout-btn').forEach(btn =>
    btn.addEventListener('click', logout)
  );

  document.querySelectorAll('.nav-link').forEach(link =>
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.dataset.section;
      if (sectionId && typeof window.showSection === 'function') {
        window.showSection(sectionId);
      }
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    })
  );
});
