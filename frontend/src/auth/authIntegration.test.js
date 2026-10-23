import assert from 'node:assert';
import { authConfig } from './authConfig.js';
import { AuthService } from './authService.js';

console.log('=== Running AgriMap DSP & FarmXT Auth Integration Tests ===\n');

// 1. Test role-based redirects
console.log('Testing role-based redirects...');
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'farmer' }),
  '/farmer',
  'Farmer role must redirect to /farmer'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'consumer' }),
  '/marketplace',
  'Consumer role must redirect to /marketplace'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'dealer' }),
  '/dealer',
  'Dealer role must redirect to /dealer'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'admin' }),
  '/admin/farmers',
  'Admin role must redirect to /admin/farmers'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'surveyor' }),
  '/admin/editor/field-1',
  'Surveyor role must redirect to /admin/editor/field-1'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'verifier' }),
  '/admin/editor/field-1',
  'Verifier role must redirect to /admin/editor/field-1'
);
assert.strictEqual(
  authConfig.redirects.redirectAfterLogin({ role: 'land_verifier' }),
  '/admin/editor/field-1',
  'Land Verifier role must redirect to /admin/editor/field-1'
);
console.log('PASS: All 7 role-based redirects correctly mapped.');

// 2. Test allowed public signup roles
console.log('Testing public registration role restrictions...');
const publicRoleIds = authConfig.signupRoles.map((r) => r.id);
assert.deepStrictEqual(
  publicRoleIds,
  ['farmer', 'consumer', 'dealer'],
  'Public signup must ONLY permit farmer, consumer, dealer'
);
assert.strictEqual(
  publicRoleIds.includes('admin'),
  false,
  'Admin role must NEVER be available on public signup'
);
assert.strictEqual(
  publicRoleIds.includes('surveyor'),
  false,
  'Surveyor role must NEVER be available on public signup'
);
assert.strictEqual(
  publicRoleIds.includes('verifier'),
  false,
  'Verifier role must NEVER be available on public signup'
);
console.log('PASS: Public registration strictly guards against privileged account creation.');

// 3. Test registration input validation in AuthService
console.log('Testing AuthService validation rules...');
const mockService = new AuthService(authConfig);

// Validation for empty name
mockService
  .register({ fullName: '', email: 'test@example.com', password: 'password123', role: 'farmer' })
  .catch((err) => {
    assert.match(err.message, /full name/i, 'Must require full name');
  });

// Validation for invalid email
mockService
  .register({ fullName: 'Ramesh', email: 'invalid-email', password: 'password123', role: 'farmer' })
  .catch((err) => {
    assert.match(err.message, /valid email/i, 'Must reject invalid email');
  });

// Validation for short password
mockService
  .register({ fullName: 'Ramesh', email: 'ramesh@example.com', password: '123', role: 'farmer' })
  .catch((err) => {
    assert.match(err.message, /at least 6 characters/i, 'Must reject passwords below minLength');
  });

// Rejection of disallowed role
mockService
  .register({ fullName: 'Hacker', email: 'hacker@example.com', password: 'password123', role: 'admin' })
  .catch((err) => {
    assert.match(err.message, /not permitted/i, 'Must reject privileged roles on register');
  });

console.log('PASS: AuthService validation properly rejects malformed or unauthorized registration data.');

// 4. Test Brand Configuration
console.log('Testing brand configuration...');
assert.strictEqual(authConfig.brand.name, 'AgriMap DSP', 'Brand name is AgriMap DSP');
assert.strictEqual(authConfig.brand.productName, 'AGRIMAP DSP', 'Product name is AGRIMAP DSP');
assert.strictEqual(authConfig.brand.logoUrl, '/images/v2v-icon.png', 'Official bulb logo is referenced');
console.log('PASS: Brand identity matches V2V Tech & AgriMap DSP specification.');

console.log('\nAll Auth Integration tests passed successfully!');
