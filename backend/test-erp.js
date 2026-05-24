/**
 * JKKM Mess ERP - Automated Security & RBAC Integration Test Suite
 * This script runs integration tests against the ERP backend to verify
 * authentication and Role-Based Access Control (RBAC) behavior.
 */

const BASE_URL = process.argv[2] || 'https://jkkm-mess-production.up.railway.app/api/v1';

console.log(`\n======================================================`);
console.log(`⚙️  Starting JKKM Mess ERP Security Test Suite`);
console.log(`🌍 Target Base URL: ${BASE_URL}`);
console.log(`======================================================\n`);

async function testAuthAndRBAC() {
  const results = [];
  const addResult = (testName, expected, actual, passed) => {
    results.push({ testName, expected, actual, passed });
    console.log(`${passed ? '✅' : '❌'} [${passed ? 'PASS' : 'FAIL'}] ${testName}`);
    if (!passed) {
      console.log(`   └─ Expected: ${expected}`);
      console.log(`   └─ Actual:   ${actual}`);
    }
  };

  // ─── TEST CASE 1: Invalid Login ──────────────────────────────────────────
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@jkkm.edu.in', password: 'WrongPassword123' })
    });
    addResult(
      'Login with invalid password should fail',
      '401 Unauthorized',
      `${loginRes.status} ${loginRes.statusText}`,
      loginRes.status === 401
    );
  } catch (err) {
    addResult('Login with invalid password should fail', '401 Unauthorized', `Network Error: ${err.message}`, false);
  }

  // ─── FETCH TOKENS FOR ROLES ──────────────────────────────────────────────
  let adminToken = null;
  let managerToken = null;
  let kitchenToken = null;

  const loginUser = async (email, password, roleName) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.status !== 201 && res.status !== 200) {
        addResult(`Login for ${roleName} (${email})`, '200/201 Success', `${res.status} ${res.statusText}`, false);
        return null;
      }
      const data = await res.json();
      addResult(`Login for ${roleName} (${email})`, '200/201 Success', '201 Created (Token received)', true);
      return data.access_token;
    } catch (err) {
      addResult(`Login for ${roleName} (${email})`, 'Success', `Network Error: ${err.message}`, false);
      return null;
    }
  };

  adminToken = await loginUser('admin@jkkm.edu.in', 'Admin@123', 'Super Admin');
  managerToken = await loginUser('manager@jkkm.edu.in', 'Manager@123', 'Mess Manager');
  kitchenToken = await loginUser('kitchen@jkkm.edu.in', 'Staff@123', 'Kitchen Staff');

  if (!adminToken || !managerToken || !kitchenToken) {
    console.log(`\n⚠️  Critical: Skipping role checks because login tokens could not be retrieved.`);
    printReport(results);
    return;
  }

  // ─── TEST CASE 2: Register User Endpoint (RBAC) ──────────────────────────
  // Only Super Admin should be able to register users
  const registerPayload = {
    name: 'Temporary User',
    email: `temp_${Date.now()}@jkkm.edu.in`,
    phone: '9876543219',
    roleId: 2 // Mess Manager
  };

  // Test with Super Admin (Expect 201 Created)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...registerPayload,
        password: 'Password@123'
      })
    });
    addResult(
      'Super Admin can register new users',
      '201 Created',
      `${res.status} ${res.statusText}`,
      res.status === 201
    );
  } catch (err) {
    addResult('Super Admin can register new users', '201 Created', err.message, false);
  }

  // Test with Mess Manager (Expect 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        ...registerPayload,
        email: `temp_mgr_${Date.now()}@jkkm.edu.in`,
        password: 'Password@123'
      })
    });
    addResult(
      'Mess Manager blocked from registering users',
      '403 Forbidden',
      `${res.status} ${res.statusText}`,
      res.status === 403
    );
  } catch (err) {
    addResult('Mess Manager blocked from registering users', '403 Forbidden', err.message, false);
  }

  // ─── TEST CASE 3: Supplier Deactivation (RBAC) ───────────────────────────
  // Super Admin & Mess Manager allowed. Kitchen Staff blocked.
  // Test with Kitchen Staff on DELETE /suppliers/1 (Expect 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/suppliers/1`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${kitchenToken}`
      }
    });
    addResult(
      'Kitchen Staff blocked from deactivating suppliers',
      '403 Forbidden',
      `${res.status} ${res.statusText}`,
      res.status === 403
    );
  } catch (err) {
    addResult('Kitchen Staff blocked from deactivating suppliers', '403 Forbidden', err.message, false);
  }

  // Test with Mess Manager on DELETE /suppliers/1 (Expect 200 OK or 404/not found but NOT 403)
  try {
    const res = await fetch(`${BASE_URL}/suppliers/1`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${managerToken}`
      }
    });
    addResult(
      'Mess Manager authorized to manage supplier status',
      '200 OK / 404 Not Found',
      `${res.status} ${res.statusText}`,
      res.status === 200 || res.status === 404
    );
  } catch (err) {
    addResult('Mess Manager authorized to manage supplier status', 'Success', err.message, false);
  }

  // ─── TEST CASE 4: Kitchen Issue Endpoint ─────────────────────────────────
  // Super Admin, Mess Manager, and Kitchen Staff allowed.
  // We'll test Kitchen Staff making an issue call (should succeed or return validation 400, but NOT 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/kitchen/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kitchenToken}`
      },
      body: JSON.stringify({
        productId: 9999, // Intentional invalid ID to trigger validation/not found rather than authorization block
        quantity: 10,
        meal: 'LUNCH',
        headcount: 100
      })
    });
    addResult(
      'Kitchen Staff authorized to issue kitchen stock',
      '400 Bad Request / 404 Not Found (Authorized)',
      `${res.status} ${res.statusText}`,
      res.status === 400 || res.status === 404
    );
  } catch (err) {
    addResult('Kitchen Staff authorized to issue kitchen stock', 'Authorized status', err.message, false);
  }

  printReport(results);
}

function printReport(results) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`\n======================================================`);
  console.log(`📊 Security Test Report Summary`);
  console.log(`======================================================`);
  console.log(`📈 Total Tests Run:   ${total}`);
  console.log(`✅ Passed:           ${passed}`);
  console.log(`❌ Failed:           ${failed}`);
  console.log(`======================================================\n`);
}

testAuthAndRBAC();
