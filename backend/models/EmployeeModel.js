const db = require('../config/db');

const getAvailableEmployees = async () => {
  const [rows] = await db.query(
    `SELECT e.id, e.assigned_region, e.vehicle_number, u.first_name, u.last_name, u.phone 
     FROM employees e 
     JOIN users u ON e.user_id = u.id 
     WHERE e.is_available = true`
  );
  return rows;
};

module.exports = { getAvailableEmployees };