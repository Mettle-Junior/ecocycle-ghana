import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';
import { showToast } from './toast.js';

const loadUsers = async () => {
  checkAuth();
  
  try {
    const users = await apiRequest('/admin/users');
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found.</td></tr>';
      return;
    }

    users.forEach((user, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.first_name} ${user.last_name}</td>
        <td>${user.username}</td>
        <td>${user.email || '—'}</td>
        <td>${user.phone}</td>
        <td>${user.total_points || 0}</td>
        <td>
          <span class="badge ${user.role === 'admin' ? 'badge-warning' : user.role === 'employee' ? 'badge-secondary' : 'badge-success'}">
            ${user.role}
          </span>
        </td>
        <td>
          <select class="role-select" id="role_${user.id}">
            <option value="citizen" ${user.role === 'citizen' ? 'selected' : ''}>Citizen</option>
            <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>Employee</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button class="btn btn-primary btn-sm btn-save-role" onclick="updateRole(${user.id})">Update</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
  }
};

window.updateRole = async (userId) => {
  const select = document.getElementById(`role_${userId}`);
  const role = select.value;
  
  if (!confirm(`Change this user's role to "${role}"?`)) return;
  
  try {
    await apiRequest(`/admin/users/${userId}/role`, 'PUT', { role });
    showToast('User role updated successfully!', 'success');
    loadUsers(); // Refresh table
  } catch (error) {
    // already handled
  }
};

document.addEventListener('DOMContentLoaded', loadUsers);