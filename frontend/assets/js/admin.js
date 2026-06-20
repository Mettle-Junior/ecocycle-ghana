import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

const loadAdminDashboard = async () => {
  checkAuth();

  try {
    // Load pending pickups
    const pickups = await apiRequest('/admin/pickups/pending');
    const tableBody = document.getElementById('pendingPickupsTable');
    tableBody.innerHTML = '';

    if (pickups.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No pending pickups.</td></tr>';
    } else {
      // Load employees for dropdown
      const employees = await apiRequest('/admin/employees/available');

      pickups.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.first_name} ${p.last_name}</td>
          <td>${p.category_name}</td>
          <td>${p.estimated_weight || 0} kg</td>
          <td>${p.pickup_address}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
          <td>
            <select id="emp_${p.id}" class="form-control">
              <option value="">Select Employee</option>
              ${employees.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} (${e.assigned_region})</option>`).join('')}
            </select>
          </td>
          <td>
            <button class="btn btn-success btn-sm" onclick="assignPickup(${p.id})">Assign</button>
            <button class="btn btn-warning btn-sm" onclick="completePickup(${p.id})">Complete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error(error);
  }
};

// Assign pickup
window.assignPickup = async (pickupId) => {
  const select = document.getElementById(`emp_${pickupId}`);
  const employeeId = select.value;
  if (!employeeId) return alert('Please select an employee.');

  try {
    await apiRequest(`/admin/pickups/assign/${pickupId}`, 'PUT', { employeeId });
    alert('Pickup assigned successfully!');
    location.reload();
  } catch (error) {
    alert(error.message);
  }
};

// Complete pickup (simplified)
window.completePickup = async (pickupId) => {
  const weight = prompt('Enter actual weight in kg:');
  if (!weight) return;
  const rewardType = prompt('Enter reward type (fuel, supermarket, ecg, cash):', 'cash');
  
  try {
    await apiRequest(`/admin/pickups/complete/${pickupId}`, 'PUT', { actual_weight: weight, reward_type: rewardType });
    alert('Pickup completed and reward issued!');
    location.reload();
  } catch (error) {
    alert(error.message);
  }
};

document.addEventListener('DOMContentLoaded', loadAdminDashboard);