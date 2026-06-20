import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

// Load dashboard data
const loadDashboard = async () => {
  checkAuth();

  const user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
  document.getElementById('totalPoints').textContent = user.total_points || 0;

  try {
    // Fetch pickup history
    const history = await apiRequest('/user/pickup/history');
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = '';

    if (history.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No pickups yet.</td></tr>';
    } else {
      history.forEach(p => {
        // Show points earned (if collected)
        const pointsDisplay = p.actual_weight ? 
          `${Math.round(p.actual_weight * 10)} pts` : 
          '—';
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.category_name}</td>
          <td>${p.estimated_weight || 0} kg</td>
          <td>${p.actual_weight ? p.actual_weight + ' kg' : '—'}</td>
          <td>${pointsDisplay}</td>
          <td><span class="badge ${p.status === 'collected' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-secondary'}">${p.status}</span></td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
        `;
        tableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error(error);
  }
};

document.addEventListener('DOMContentLoaded', loadDashboard);