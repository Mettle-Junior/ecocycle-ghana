import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

// Global chart instances to allow updates
let wasteChart, pickupsChart, topRecyclersChart;

// Load all analytics data
const loadAnalytics = async () => {
  checkAuth();

  try {
    // 1. Load summary stats
    const summary = await apiRequest('/admin/stats/summary');
    document.getElementById('totalPickups').textContent = summary.totalPickups;
    document.getElementById('totalPoints').textContent = summary.totalPointsIssued;
    document.getElementById('vouchersRedeemed').textContent = summary.vouchersRedeemed;
    document.getElementById('activeCitizens').textContent = summary.activeCitizens;

    // 2. Load waste by category (pie chart)
    const wasteData = await apiRequest('/admin/stats/waste-by-category');
    createWasteChart(wasteData);

    // 3. Load pickups over time (bar chart)
    const pickupsData = await apiRequest('/admin/stats/pickups-over-time?days=7');
    createPickupsChart(pickupsData);

    // 4. Load top recyclers (horizontal bar)
    const topRecyclers = await apiRequest('/admin/stats/top-recyclers?limit=5');
    createTopRecyclersChart(topRecyclers);

  } catch (error) {
    console.error('Error loading analytics:', error);
    alert('Error loading analytics data.');
  }
};

// Create Waste Category Pie Chart
const createWasteChart = (data) => {
  const ctx = document.getElementById('wasteChart').getContext('2d');
  
  const labels = data.map(item => item.category);
  const weights = data.map(item => parseFloat(item.total_weight) || 0);

  // Generate colors
  const colors = ['#0b3b2c', '#1e5a44', '#f5c842', '#27ae60', '#e67e22', '#c0392b'];

  if (wasteChart) wasteChart.destroy();
  
  wasteChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: weights,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
};

// Create Pickups Over Time Bar/Line Chart
const createPickupsChart = (data) => {
  const ctx = document.getElementById('pickupsChart').getContext('2d');
  
  const labels = data.map(item => item.date);
  const counts = data.map(item => item.count);

  if (pickupsChart) pickupsChart.destroy();

  pickupsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pickups',
        data: counts,
        backgroundColor: '#0b3b2c',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
};

// Create Top Recyclers Horizontal Bar Chart
const createTopRecyclersChart = (data) => {
  const ctx = document.getElementById('topRecyclersChart').getContext('2d');
  
  const labels = data.map(user => `${user.first_name} ${user.last_name}`);
  const points = data.map(user => user.total_points);

  if (topRecyclersChart) topRecyclersChart.destroy();

  topRecyclersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Points',
        data: points,
        backgroundColor: '#f5c842',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y', // horizontal bar
      responsive: true,
      scales: {
        x: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
};

// Initial load
document.addEventListener('DOMContentLoaded', loadAnalytics);