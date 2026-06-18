/**
 * Database Seed Script
 * Run with: npx tsx server/db/seed.ts
 *
 * Creates:
 *  - Admin user (Abdelazez)
 *  - 10 dental clinics
 *  - Default clinic prices (500 EGP each)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { ClinicModel } from '../models/clinic.model';
import { ClinicPriceModel } from '../models/clinic-price.model';

const CLINICS = [
  { name: 'Diagnosis & Radiology',          nameAr: 'التشخيص والأشعة',                      color: '#0ea5e9', icon: '🔬' },
  { name: 'Conservative & Endodontics',      nameAr: 'العلاج التحفظي وطب وجراحة الجذور',      color: '#10b981', icon: '🦷' },
  { name: 'Oral & Maxillofacial Surgery',    nameAr: 'جراحة الفم والفكين',                    color: '#ef4444', icon: '⚕️' },
  { name: 'Removable Prosthodontics',        nameAr: 'التركيبات المتحركة',                    color: '#f59e0b', icon: '🦷' },
  { name: 'Fixed Prosthodontics',            nameAr: 'التركيبات الثابتة',                     color: '#8b5cf6', icon: '👑' },
  { name: 'Periodontics',                    nameAr: 'اللثة',                                 color: '#ec4899', icon: '🩺' },
  { name: 'Surgery',                         nameAr: 'الجراحة',                               color: '#dc2626', icon: '🔪' },
  { name: 'Cosmetic Dentistry',              nameAr: 'تجميل الأسنان',                         color: '#06b6d4', icon: '✨' },
  { name: 'Dental Implants',                 nameAr: 'زراعة الأسنان',                         color: '#6366f1', icon: '🔩' },
  { name: 'Orthodontics',                    nameAr: 'تقويم الأسنان',                         color: '#14b8a6', icon: '😁' },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  // ── 1. Admin User ──────────────────────────────────────────────────────
  console.log('👤 Creating admin user...');
  const existingAdmin = await UserModel.findOne({ username: 'Abdelazez' });
  if (existingAdmin) {
    console.log('   ⚠️  Admin already exists — skipping');
  } else {
    const hashed = await bcrypt.hash('02115510Aa**#', 10);
    await UserModel.create({
      username: 'Abdelazez',
      password: hashed,
      fullName: 'Abdelazez Elsayed',
      email: 'abdelazezhamoud3@gmail.com',
      userType: 'admin',
      isActive: true,
    });
    console.log('   ✅ Admin created — username: Abdelazez');
  }

  // ── 2. Clinics ─────────────────────────────────────────────────────────
  console.log('\n🏥 Creating clinics...');
  const existingCount = await ClinicModel.countDocuments({ deletedAt: null });
  if (existingCount > 0) {
    console.log(`   ⚠️  ${existingCount} clinics already exist — skipping`);
  } else {
    const clinics = await ClinicModel.insertMany(
      CLINICS.map(c => ({ name: c.name, nameAr: c.nameAr, color: c.color, icon: c.icon }))
    );
    console.log(`   ✅ ${clinics.length} clinics created`);

    // ── 3. Default Clinic Prices ────────────────────────────────────────
    console.log('\n💰 Setting default clinic prices (500 EGP)...');
    await ClinicPriceModel.insertMany(
      clinics.map(c => ({
        clinicId:     c._id.toString(),
        sessionPrice: 500,
        updatedBy:    'seed',
        updatedAt:    new Date(),
      }))
    );
    console.log(`   ✅ ${clinics.length} clinic prices set`);
  }

  console.log('\n🎉 Seed complete! You can now start the server.\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
