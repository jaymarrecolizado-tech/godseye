/**
 * Debug Password Validation
 */

const { validatePasswordStrength, calculatePasswordStrength } = require('./backend/src/utils/passwordValidator');

const testPasswords = [
  'Password123!',
  'MyP@ssw0rd123',
  'Weak1!',
  'MediumPassword123!'
];

console.log('Password Validation Debug\n');
console.log('='.repeat(70));

testPasswords.forEach(password => {
  console.log(`\nPassword: "${password}"`);
  console.log(`Length: ${password.length}`);

  const error = validatePasswordStrength(password);
  console.log(`Validation Error: ${error || 'None'}`);

  const strength = calculatePasswordStrength(password);
  console.log(`Strength: ${strength}`);
});

console.log('\n' + '='.repeat(70));
