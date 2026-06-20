import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

const loadWallet = async () => {
  checkAuth();

  // Get user points
  const user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('walletPoints').textContent = user.total_points || 0;

  try {
    // Fetch available vouchers (public endpoint)
    const vouchers = await apiRequest('/admin/vouchers');
    const list = document.getElementById('voucherList');
    list.innerHTML = '';

    if (vouchers.length === 0) {
      list.innerHTML = '<p>No vouchers available at the moment.</p>';
    } else {
      vouchers.forEach(v => {
        const card = document.createElement('div');
        card.className = 'voucher-card';
        const canAfford = user.total_points >= v.points_required;
        card.innerHTML = `
          <div class="info">
            <h3>${v.voucher_code}</h3>
            <p>${v.reward_type.toUpperCase()} — Value: GHS ${v.value_ghs}</p>
            <p>Points required: <span class="points-badge">${v.points_required} pts</span></p>
          </div>
          <button class="btn-redeem" data-id="${v.id}" ${!canAfford ? 'disabled' : ''}>
            ${canAfford ? 'Redeem' : 'Insufficient Points'}
          </button>
        `;
        list.appendChild(card);
      });

      // Add event listeners to redeem buttons
      document.querySelectorAll('.btn-redeem[data-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const voucherId = e.target.dataset.id;
          if (confirm('Redeem this voucher? The required points will be deducted.')) {
            try {
              const result = await apiRequest(`/admin/vouchers/redeem/${voucherId}`, 'POST');
              alert(`✅ Voucher redeemed! Code: ${result.voucher_code}`);
              // Update user points in localStorage
              const updatedUser = JSON.parse(localStorage.getItem('user'));
              updatedUser.total_points = result.remaining_points;
              localStorage.setItem('user', JSON.stringify(updatedUser));
              loadWallet(); // refresh page
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });
    }

    // Load redeemed vouchers (optional: create endpoint for user's redeemed vouchers)
    // For now we skip, you can later add GET /user/vouchers/redeemed

  } catch (error) {
    console.error(error);
    document.getElementById('voucherList').innerHTML = '<p>Error loading vouchers.</p>';
  }
};

document.addEventListener('DOMContentLoaded', loadWallet);