import readline from 'readline';
import { connectDB, disconnectDB } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { findUserByEmail, provisionInternalUser } from '../modules/users/user.service.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

function ask(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      parsed[key] = value;
    }
  }
  return parsed;
}

async function run() {
  const args = parseCliArgs();

  console.log('\n======================================================');
  console.log('CivicFix — Administrative User Provisioning Tool');
  console.log('======================================================\n');

  try {
    await connectDB();

    const email = (args.email || (await ask('Email Address: '))).toLowerCase();
    if (!email || !email.includes('@')) {
      console.error('Error: Valid email address is required.');
      process.exit(1);
    }

    const existing = await findUserByEmail(email);
    const isRotate = args.rotate === true || args.reset === true;

    if (existing && !isRotate) {
      console.error(`Error: User with email "${email}" already exists (Current role: ${existing.role}).`);
      console.error('To rotate this user\'s password securely, pass the --rotate flag:');
      console.error(`  node server/src/scripts/seed-admin.js --email "${email}" --rotate`);
      process.exit(1);
    }

    let name = existing ? existing.name : args.name;
    if (!existing && !name) {
      name = await ask('Full Name: ');
      if (!name || name.length < 2) {
        console.error('Error: Name must be at least 2 characters long.');
        process.exit(1);
      }
    }

    let roleInput = existing ? existing.role : null;
    if (!existing) {
      roleInput = (args.role || (await ask('Role [staff / admin]: '))).toLowerCase();
      if (![ROLES.STAFF, ROLES.ADMIN].includes(roleInput)) {
        console.error('Error: Role must be either "staff" or "admin".');
        process.exit(1);
      }
    }

    const minLen = process.env.NODE_ENV === 'production' ? 12 : 8;
    const password = args.password || (await ask(`Password (min ${minLen} chars, 1 uppercase, 1 lowercase, 1 number, 1 special): `));
    if (password.length < minLen) {
      console.error(`Error: Password must be at least ${minLen} characters long.`);
      process.exit(1);
    }

    // Complexity checks
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      console.error('Error: Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol.');
      process.exit(1);
    }

    // Prohibit sample/default passwords in production
    if (process.env.NODE_ENV === 'production') {
      const forbiddenSamplePasswords = [
        'AdminPassword123!',
        'StaffPassword123!',
        'Password123!',
        'Admin1234!',
        'CivicFix123!'
      ];
      if (forbiddenSamplePasswords.includes(password)) {
        console.error('FATAL SECURITY ERROR: Sample development passwords are strictly prohibited in production environments.');
        process.exit(1);
      }
    }

    const passwordHash = await hashPassword(password);

    if (existing && isRotate) {
      existing.passwordHash = passwordHash;
      await existing.save();
      console.log('\n[SUCCESS] Credentials rotated securely:');
      console.log(`- Email: ${existing.email}`);
      console.log(`- Role: ${existing.role}`);
      console.log(`- Status: ${existing.status}`);
      console.log('- Security: Password rotated with memory-hard Argon2id hash.');
    } else {
      const user = await provisionInternalUser({
        name,
        email,
        passwordHash,
        role: roleInput
      });

      console.log('\n[SUCCESS] User provisioned securely:');
      console.log(`- ID: ${user._id}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Status: ${user.status}`);
    }
    console.log('\nNo passwords or raw credentials are displayed or stored unhashed.\n');
  } catch (err) {
    logger.error('Provisioning error:', err.message);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

run();

