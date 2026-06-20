const PickupModel = require('../models/PickupModel');

// Citizen requests a pickup
const requestPickup = async (req, res) => {
  try {
    const { 
      category_id, 
      estimated_weight, 
      photo_data,  // Now receiving base64 image
      pickup_lat, 
      pickup_lng, 
      pickup_address, 
      scheduled_date 
    } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!category_id || !pickup_lat || !pickup_lng || !pickup_address) {
      return res.status(400).json({ message: 'Category and location are required.' });
    }

    // Optional: Save the base64 image to a file or store directly in DB
    // For simplicity, we'll store the base64 in the database (or you can save to disk)
    let photo_url = null;
    if (photo_data) {
      // You can save to disk here if you want
      // For now, we'll store the base64 string directly
      photo_url = photo_data;
      
      // OPTIONAL: Save as file on server
      // const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      // const filename = `uploads/pickup_${Date.now()}.jpg`;
      // require('fs').writeFileSync(filename, base64Data, 'base64');
      // photo_url = `/uploads/${filename}`;
    }

    const pickupId = await PickupModel.createPickup({
      user_id,
      category_id,
      estimated_weight: estimated_weight || 0,
      photo_url: photo_url,
      pickup_lat,
      pickup_lng,
      pickup_address,
      scheduled_date: scheduled_date || null
    });

    res.status(201).json({ 
      message: 'Pickup requested successfully!', 
      pickupId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while requesting pickup.' });
  }
};

// Get user's pickup history
const getHistory = async (req, res) => {
  try {
    const pickups = await PickupModel.getPickupsByUser(req.user.id);
    res.json(pickups);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { requestPickup, getHistory };