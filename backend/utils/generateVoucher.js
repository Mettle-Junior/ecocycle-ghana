const generateVoucher = () => {
  const prefix = 'ECO';
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${random}-${timestamp}`;
};

module.exports = { generateVoucher };