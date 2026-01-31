const dotenv = require('dotenv');
const path = require('path');

console.log('Before loading any .env:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('DB_HOST:', process.env.DB_HOST);

const envPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../.env')
  : path.join(__dirname, '../.env.local');

console.log('\nAttempting to load:', envPath);
dotenv.config({ path: envPath });

console.log('\nAfter loading .env:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('DB_HOST:', process.env.DB_HOST);
