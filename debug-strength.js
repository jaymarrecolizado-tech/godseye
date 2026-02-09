/**
 * Debug Password Strength Calculation
 */

const { calculatePasswordStrength } = require('./backend/src/utils/passwordValidator');

const testPasswords = [
  'Pass1',
  'Pass123!',
  'VeryStrongP@ssw0rdWithL3ngth!'
];

const calculateScore = (password) => {
  let score = 0;
  const reasons = [];

  if (password.length >= 12) { score += 1; reasons.push('Length >= 12'); }
  if (password.length >= 16) { score += 1; reasons.push('Length >= 16'); }
  if (/[A-Z]/.test(password)) { score += 1; reasons.push('Has uppercase'); }
  if (/[a-z]/.test(password)) { score += 1; reasons.push('Has lowercase'); }
  if (/\d/.test(password)) { score += 1; reasons.push('Has numbers'); }
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) { score += 1; reasons.push('Has special chars'); }
  if (!/(.)\1{2,}/.test(password)) { score += 1; reasons.push('No repeating chars'); }
  else { reasons.push('Has repeating chars (-1)'); }

  let strength = 'weak';
  if (score > 3) strength = 'medium';
  if (score > 5) strength = 'strong';

  return { score, reasons, strength };
};

console.log('Password Strength Calculation Debug\n');
console.log('='.repeat(70));

testPasswords.forEach(password => {
  console.log(`\nPassword: "${password}"`);
  console.log(`Length: ${password.length}`);

  const { score, reasons, strength } = calculateScore(password);
  console.log(`Score: ${score}/7`);
  console.log(`Factors: ${reasons.join(', ')}`);
  console.log(`Strength: ${strength}`);
});

console.log('\n' + '='.repeat(70));
