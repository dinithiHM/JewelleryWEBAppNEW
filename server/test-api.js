import fetch from 'node-fetch';

// Order ID to update
const orderId = 36; // Use the order ID from your error message
const newStatus = 'In Progress';
const supplierNotes = 'Test notes from API test script';

// API endpoint
const endpoint = `http://localhost:3002/custom-orders/${orderId}/status`;

// Payload
const payload = {
  order_status: newStatus,
  supplier_notes: supplierNotes
};

// Make the API call
async function testApi() {
  try {
    console.log('Making API request to:', endpoint);
    console.log('With payload:', payload);

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Get the response text first
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    // Try to parse as JSON if possible
    try {
      const responseData = JSON.parse(responseText);
      console.log('Response data (parsed):', responseData);
    } catch (e) {
      console.log('Response is not valid JSON');
    }

    if (!response.ok) {
      console.error('API request failed');
    } else {
      console.log('API request successful!');
    }
  } catch (error) {
    console.error('Error making API request:', error);
  }
}

testApi();
