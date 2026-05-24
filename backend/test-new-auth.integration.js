/**
 * Verification script for the upgraded JKKM Mess ERP security and auth system.
 */
const BASE_URL = 'http://localhost:3001/api/v1';

async function testAuthUpgrades() {
  console.log('🤖 Starting JKKM Mess Auth Verification Tests...\n');

  // --- Test 1: Non-institutional Email rejection ---
  console.log('🔍 Test 1: Attempting login with Gmail account...');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@gmail.com', password: 'Password123' })
    });
    const data = await res.json();
    if (res.status === 403 && data.message.includes('institutional accounts only')) {
      console.log('✅ Test 1 Passed: Gmail correctly rejected with 403 Forbidden: ' + data.message);
    } else {
      console.log('❌ Test 1 Failed:', res.status, data);
    }
  } catch (err) {
    console.log('❌ Test 1 Failed with network error:', err.message);
  }

  // --- Test 2: Account lockout after 5 failed attempts ---
  console.log('\n🔍 Test 2: Simulating 5 failed login attempts for admin@jkkm.edu.in...');
  let wasLocked = false;
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@jkkm.edu.in', password: 'WrongPassword' })
      });
      const data = await res.json();
      console.log(`   Attempt ${i}: Status = ${res.status}, Message = ${data.message}`);
      if (data.message && data.message.includes('locked')) {
        wasLocked = true;
      }
    } catch (err) {
      console.log(`   Attempt ${i} failed:`, err.message);
    }
  }
  if (wasLocked) {
    console.log('✅ Test 2 Passed: Admin account successfully locked out.');
  } else {
    console.log('❌ Test 2 Failed: Admin account did not lock out.');
  }
}

testAuthUpgrades();
