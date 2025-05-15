/**
 * Generates a unique reference number for orders
 * Format: PREFIX-YYYY-XXXX where XXXX is a random number
 * @param {string} prefix - The prefix to use (e.g., 'CUST' for custom orders)
 * @returns {string} The generated reference number
 */
export function generateOrderReference(prefix = 'ORD') {
  const date = new Date();
  const year = date.getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  
  return `${prefix}-${year}-${randomNum}`;
}
