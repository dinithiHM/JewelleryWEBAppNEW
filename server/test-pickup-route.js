import fetch from 'node-fetch';

const orderId = 36; // Replace with the actual order ID
const url = `http://localhost:3002/custom-orders/${orderId}/mark-as-picked-up`;

console.log(`Testing route: ${url}`);

fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pickup_notes: 'Test pickup notes'
  })
})
.then(response => {
  console.log('Response status:', response.status);
  return response.text();
})
.then(text => {
  console.log('Response body:', text);
  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:', json);
  } catch (e) {
    console.error('Error parsing JSON:', e);
  }
})
.catch(error => {
  console.error('Error:', error);
});
