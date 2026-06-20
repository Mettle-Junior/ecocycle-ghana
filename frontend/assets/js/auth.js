import { apiRequest } from './api.js';
import { showToast } from './toast.js';

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

// Register
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);

    try {
      await apiRequest('/auth/register', 'POST', data);
      showToast('Registration successful! Please login.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (error) {
      // error already shown by apiRequest
    }
  });
}

// Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData);

    try {
      const result = await apiRequest('/auth/login', 'POST', data);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      showToast(`Welcome back, ${result.user.first_name}!`, 'success');

      setTimeout(() => {
        if (result.user.role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else if (result.user.role === 'employee') {
          window.location.href = 'employee-dashboard.html';
        } else {
          window.location.href = 'user-dashboard.html';
        }
      }, 1000);
    } catch (error) {
      // already handled
    }
  });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully.', 'warning');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  });
}

// Auth check
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login first.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  }
  return token;
};