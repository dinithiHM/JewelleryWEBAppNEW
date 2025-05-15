import axios from 'axios';

// Test the forgot password endpoint
async function testForgotPassword() {
  try {
    console.log('Testing forgot password endpoint...');
    
    const response = await axios.post('http://localhost:3002/auth/forgot-password', {
      email: 'admin@test.com'
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testForgotPassword();
