console.log('--- ENVIRONMENT VARIABLES ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VITE_FIREBASE_API_KEY present:', !!process.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_PROJECT_ID present:', !!process.env.VITE_FIREBASE_PROJECT_ID);
console.log('PORT:', process.env.PORT);
console.log('CWD:', process.cwd());
import fs from 'fs';
console.log('Is dist folder present?', fs.existsSync('dist'));
if (fs.existsSync('dist')) {
  console.log('Contents of dist:', fs.readdirSync('dist'));
}
