import { apiRequest } from './api.js';
import { checkAuth } from './auth.js';

const form = document.getElementById('pickupForm');
const photoInput = document.getElementById('photoInput');
const cameraBtn = document.getElementById('cameraBtn');
const uploadBtn = document.getElementById('uploadBtn');
const photoPreview = document.getElementById('photoPreview');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const photoData = document.getElementById('photoData');

// Camera button - opens camera directly
cameraBtn?.addEventListener('click', () => {
  photoInput.click();
});

// Upload button - opens file picker
uploadBtn?.addEventListener('click', () => {
  photoInput.click();
});

// Handle photo selection/capture
photoInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      photoPreviewImg.src = event.target.result;
      photoPreview.style.display = 'block';
      photoData.value = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Get current location
document.getElementById('getLocationBtn')?.addEventListener('click', () => {
  const status = document.getElementById('locationStatus');
  status.textContent = '📍 Getting your location...';
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        document.getElementById('pickup_lat').value = lat;
        document.getElementById('pickup_lng').value = lng;
        status.textContent = `✅ Location detected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        // Optional: Reverse geocode using a free API
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
          .then(res => res.json())
          .then(data => {
            if (data.locality || data.city) {
              document.getElementById('pickup_address').value = 
                `${data.locality || ''} ${data.city || ''} ${data.countryName || ''}`.trim();
            }
          })
          .catch(() => {
            // If reverse geocode fails, user can enter address manually
          });
      },
      (error) => {
        status.textContent = '❌ Could not get location. Please enter address manually.';
        console.error(error);
      }
    );
  } else {
    status.textContent = '❌ Geolocation not supported. Please enter address manually.';
  }
});

// Handle manual address entry (fallback if Google Maps not loaded)
document.getElementById('pickup_address')?.addEventListener('change', (e) => {
  // If lat/lng are empty, set default coordinates for Accra
  if (!document.getElementById('pickup_lat').value) {
    document.getElementById('pickup_lat').value = 5.6037;
    document.getElementById('pickup_lng').value = -0.1870;
  }
});

// Form submission
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check auth
    checkAuth();

    const formData = new FormData(form);
    
    // Debug: Log all form data
    console.log('=== FORM DATA ===');
    console.log('category_id:', formData.get('category_id'));
    console.log('estimated_weight:', formData.get('estimated_weight'));
    console.log('photo_data:', formData.get('photo_data') ? '✅ Photo present' : '❌ NO PHOTO');
    console.log('pickup_lat:', formData.get('pickup_lat'));
    console.log('pickup_lng:', formData.get('pickup_lng'));
    console.log('pickup_address:', formData.get('pickup_address'));
    console.log('scheduled_date:', formData.get('scheduled_date'));

    // Validate required fields
    if (!formData.get('category_id') || formData.get('category_id') === '') {
      alert('Please select a waste category.');
      return;
    }

    if (!formData.get('pickup_lat') || !formData.get('pickup_lng')) {
      alert('Please set your pickup location. Click "Use My Current Location" or enter an address.');
      return;
    }

    if (!formData.get('pickup_address') || formData.get('pickup_address').trim() === '') {
      alert('Please enter your pickup address.');
      return;
    }

    if (!formData.get('photo_data')) {
      alert('Please take a photo of your waste before submitting.');
      return;
    }

    const data = {
      category_id: formData.get('category_id'),
      estimated_weight: formData.get('estimated_weight') || 0,
      photo_data: formData.get('photo_data'),
      pickup_lat: formData.get('pickup_lat'),
      pickup_lng: formData.get('pickup_lng'),
      pickup_address: formData.get('pickup_address'),
      scheduled_date: formData.get('scheduled_date') || null
    };

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      console.log('📤 Sending request to server...', data);
      const result = await apiRequest('/user/pickup/request', 'POST', data);
      console.log('✅ Response:', result);
      
      alert('✅ Pickup requested successfully! Your waste will be collected soon.');
      window.location.href = 'user-dashboard.html';
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Pickup Request';
    }
  });
}