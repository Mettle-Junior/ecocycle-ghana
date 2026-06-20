// Toast notification system
export const showToast = (message, type = 'success', duration = 4000) => {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  container.appendChild(toast);
  
  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    closeToast(toast);
  });
  
  // Auto close after duration
  setTimeout(() => {
    closeToast(toast);
  }, duration);
  
  return toast;
};

const createToastContainer = () => {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
};

const closeToast = (toast) => {
  toast.classList.add('toast-exit');
  setTimeout(() => {
    toast.remove();
  }, 300);
};

// Replace window.alert with toast (optional)
// You can still use alert for debugging, but we'll override in our code.