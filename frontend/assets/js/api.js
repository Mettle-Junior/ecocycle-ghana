import { showToast } from './toast.js';

const API_BASE = 'http://localhost:5000/api';

// Spinner control
const showSpinner = () => {
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.classList.add('active');
};
const hideSpinner = () => {
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.classList.remove('active');
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const apiRequest = async (endpoint, method = 'GET', body = null, showLoader = true) => {
  if (showLoader) showSpinner();

  const options = {
    method,
    headers: getAuthHeaders()
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = '/frontend/pages/login.html';
        }, 1500);
      }
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message, 'error');
    throw error;
  } finally {
    if (showLoader) hideSpinner();
  }
};