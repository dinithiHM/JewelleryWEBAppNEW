/**
 * Generates a unique reference number for orders
 * Format: PREFIX-YYYY-XXXX where XXXX is a sequential number
 * @param {string} prefix - The prefix to use (e.g., 'CUST' for custom orders)
 * @returns {string} The generated reference number
 *
 * Note: This function now returns a placeholder. The actual sequential number
 * is generated in the route handlers by querying the database for the highest
 * existing number and incrementing it.
 */
export function generateOrderReference(prefix = 'ORD') {
  const date = new Date();
  const year = date.getFullYear();

  // Return a placeholder that will be replaced with a sequential number
  // in the route handler
  return `${prefix}-${year}-SEQUENTIAL`;
}

/**
 * The original random reference generator, kept for backward compatibility
 * Format: PREFIX-YYYY-XXXX where XXXX is a random number
 * @param {string} prefix - The prefix to use (e.g., 'CUST' for custom orders)
 * @returns {string} The generated reference number with a random 4-digit number
 */
export function generateRandomOrderReference(prefix = 'ORD') {
  const date = new Date();
  const year = date.getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  return `${prefix}-${year}-${randomNum}`;
}
