import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

const mongoUri = MONGODB_URI;

// Define Clinic Schema (same as in mongodb.ts)
const clinicSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    color: { type: String },
    icon: { type: String },
    deletedAt: { type: Date, default: null }
});

const ClinicModel = mongoose.model('Clinic', clinicSchema);

const clinicsToSeed = [
    {
        name: 'Diagnosis & Radiology',
        nameAr: 'التشخيص والأشعة',
        description: 'أحدث أجهزة التصوير والأشعات للتشخيص الدقيق',
        color: 'from-blue-600 to-blue-400',
        icon: 'scan'
    },
    {
        name: 'Conservative & Endodontics',
        nameAr: 'العلاج التحفظي وطب وجراحة الجذور',
        description: 'علاجات حفظية متقدمة وحشوات جمالية',
        color: 'from-green-600 to-green-400',
        icon: 'tooth'
    },
    {
        name: 'Oral & Maxillofacial Surgery',
        nameAr: 'جراحة الفم والفكين',
        description: 'جراحات متقدمة بأحدث التقنيات',
        color: 'from-red-600 to-red-400',
        icon: 'surgery'
    },
    {
        name: 'Removable Prosthodontics',
        nameAr: 'التركيبات المتحركة',
        description: 'تركيبات متحركة مريحة وجمالية',
        color: 'from-purple-600 to-purple-400',
        icon: 'denture'
    },
    {
        name: 'Fixed Prosthodontics',
        nameAr: 'التركيبات الثابتة',
        description: 'تاجات وجسور بتقنيات حديثة',
        color: 'from-amber-600 to-amber-400',
        icon: 'crown'
    },
    {
        name: 'Periodontology',
        nameAr: 'اللثة',
        description: 'علاجات متخصصة لصحة اللثة',
        color: 'from-pink-600 to-pink-400',
        icon: 'gums'
    },
    {
        name: 'Oral Surgery',
        nameAr: 'الجراحة',
        description: 'جراحات الفم المتقدمة',
        color: 'from-red-700 to-red-500',
        icon: 'scalpel'
    },
    {
        name: 'Cosmetic Dentistry',
        nameAr: 'تجميل الأسنان',
        description: 'تحسينات جمالية للابتسامة',
        color: 'from-rose-600 to-rose-400',
        icon: 'sparkles'
    },
    {
        name: 'Implantology',
        nameAr: 'زراعة الأسنان',
        description: 'زراعات متقدمة مع ضمانات',
        color: 'from-cyan-600 to-cyan-400',
        icon: 'implant'
    },
    {
        name: 'Orthodontics',
        nameAr: 'تقويم الأسنان',
        description: 'تقويم بأحدث الأسلاك والأقواس',
        color: 'from-teal-600 to-teal-400',
        icon: 'braces'
    },
    {
        name: 'Pediatric Dentistry',
        nameAr: 'أسنان الأطفال',
        description: 'علاجات آمنة وودودة للأطفال',
        color: 'from-indigo-600 to-indigo-400',
        icon: 'child'
    }
];

async function seedClinics() {
    console.log('🌱 Starting clinic seeding process...\n');

    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Check if clinics already exist
        const existingCount = await ClinicModel.countDocuments({ deletedAt: null });
        console.log(`📊 Current clinics in database: ${existingCount}`);

        if (existingCount > 0) {
            console.log('⚠️  Warning: Clinics already exist in the database!');
            console.log('   Do you want to:');
            console.log('   1. Skip seeding (keep existing data)');
            console.log('   2. Clear and reseed (delete all and insert fresh data)');
            console.log('\n   This script will SKIP seeding to prevent duplicates.');
            console.log('   To force reseed, manually delete clinics from MongoDB first.\n');
            await mongoose.connection.close();
            return;
        }

        // Insert clinics
        console.log(`\n🚀 Inserting ${clinicsToSeed.length} clinics...`);
        const inserted = await ClinicModel.insertMany(clinicsToSeed);
        console.log(`✅ Successfully inserted ${inserted.length} clinics!\n`);

        // Display inserted clinics
        console.log('📋 Inserted Clinics:');
        inserted.forEach((clinic, index) => {
            console.log(`   ${index + 1}. ${clinic.nameAr} (${clinic.name})`);
        });

        console.log('\n✨ Seeding completed successfully!');

    } catch (error: any) {
        console.error('\n❌ Error during seeding:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed.');
    }
}

// Run the seed function
seedClinics();
