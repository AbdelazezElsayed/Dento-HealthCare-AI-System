import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const SALT_ROUNDS = 10;

async function migratePlaintextPasswords() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(uri);

  const users = await UserModel.find({
    password: { $exists: true, $type: 'string' },
    deletedAt: null,
  }).select('password userType');

  let alreadyHashed = 0;
  let migrated = 0;
  const migratedByRole = new Map<string, number>();

  for (const user of users) {
    if (BCRYPT_HASH_PATTERN.test(user.password)) {
      alreadyHashed += 1;
      continue;
    }

    user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    await user.save();

    migrated += 1;
    migratedByRole.set(user.userType, (migratedByRole.get(user.userType) || 0) + 1);
  }

  console.log(JSON.stringify({
    checked: users.length,
    alreadyHashed,
    migrated,
    migratedByRole: Object.fromEntries(migratedByRole),
  }, null, 2));

  await mongoose.disconnect();
}

migratePlaintextPasswords().catch(async (error) => {
  console.error('Password migration failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
