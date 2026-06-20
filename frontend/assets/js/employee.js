import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

// Load employee dashboard
const loadDashboard = async () => {
  checkAuth();

  // Show employee name
  const user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('employeeName').textContent = `${user.first_name} ${user.last_name}`;

  try {
    // Load assigned pickups
    const assigned = await apiRequest('/employee/pickups/assigned');
    const list = document.getElementById('assignedList');
    list.innerHTML = '';

    if (assigned.length === 0) {
      list.innerHTML = '<p>🎉 No assigned pickups at the moment.</p>';
    } else {
      assigned.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pickup-card';
        card.innerHTML = `
          <div class="info">
            <div>
              <strong>Citizen:</strong> ${p.first_name} ${p.last_name}<br>
              <strong>Phone:</strong> ${p.phone}
            </div>
            <div>
              <strong>Category:</strong> ${p.category_name}<br>
              <strong>Est. Weight:</strong> ${p.estimated_weight || 0} kg
            </div>
            <div>
              <strong>Address:</strong> ${p.pickup_address}<br>
              <strong>Requested:</strong> ${new Date(p.created_at).toLocaleDateString()}
            </div>
          </div>
          <div class="actions">
            <label style="display:flex;align-items:center;gap:0.5rem;">
              Actual Weight (kg):
              <input type="number" id="weight_${p.id}" class="weight-input" step="0.5" min="0.1" placeholder="0.0">
            </label>
            <button class="btn btn-success" onclick="collectPickup(${p.id})">✅ Mark Collected</button>
          </div>
        `;
        list.appendChild(card);
      });
    }

    // Load history
    const history = await apiRequest('/employee/pickups/history');
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No collections yet.</td></tr>';
    } else {
      history.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.first_name} ${p.last_name}</td>
          <td>${p.category_name}</td>
          <td>${p.actual_weight || p.estimated_weight || 0} kg</td>
          <td>${p.pickup_address}</td>
          <td>${new Date(p.collected_at).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
      });
    }

  } catch (error) {
    console.error(error);
    document.getElementById('assignedList').innerHTML = '<p>Error loading assigned pickups.</p>';
  }
};

// Collect pickup
window.collectPickup = async (pickupId) => {
  const weightInput = document.getElementById(`weight_${pickupId}`);
  const weight = weightInput.value;

  if (!weight || weight <= 0) {
    alert('Please enter a valid actual weight in kg.');
    return;
  }

  if (!confirm(`Mark this pickup as collected with weight ${weight} kg? Points will be awarded to the citizen.`)) {
    return;
  }

  try {
    const result = await apiRequest(`/employee/pickups/collect/${pickupId}`, 'PUT', { actual_weight: weight });
    alert(`✅ Pickup collected! ${result.pointsEarned} points awarded.`);
    // Reload page to refresh lists
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

document.addEventListener('DOMContentLoaded', loadDashboard);