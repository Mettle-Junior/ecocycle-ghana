import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

// Load reward rates
const loadRewardRates = async () => {
  try {
    const rates = await apiRequest('/admin/reward-rates');
    const tableBody = document.getElementById('rewardRatesTable');
    tableBody.innerHTML = '';

    rates.forEach(rate => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${rate.category_name}</td>
        <td>
          <input type="number" id="rate_${rate.id}" value="${rate.points_per_kg}" style="width:80px;">
        </td>
        <td>
          <button class="btn btn-success btn-sm" onclick="updateRate(${rate.id})">Update</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
  }
};

// Update reward rate
window.updateRate = async (rateId) => {
  const input = document.getElementById(`rate_${rateId}`);
  const points_per_kg = input.value;
  
  try {
    await apiRequest(`/admin/reward-rates/${rateId}`, 'PUT', { points_per_kg });
    alert('Reward rate updated successfully!');
  } catch (error) {
    alert(error.message);
  }
};

// Load vouchers
const loadVouchers = async () => {
  try {
    const vouchers = await apiRequest('/admin/vouchers');
    const tableBody = document.getElementById('vouchersTable');
    tableBody.innerHTML = '';

    vouchers.forEach(v => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${v.voucher_code}</strong></td>
        <td>${v.points_required} pts</td>
        <td><span class="badge">${v.reward_type}</span></td>
        <td>GHS ${v.value_ghs}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
  }
};

// Create voucher
const voucherForm = document.getElementById('voucherForm');
if (voucherForm) {
  voucherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(voucherForm);
    const data = Object.fromEntries(formData);

    try {
      await apiRequest('/admin/vouchers', 'POST', data);
      alert('Voucher created successfully!');
      voucherForm.reset();
      loadVouchers();
    } catch (error) {
      alert(error.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadRewardRates();
  loadVouchers();
});