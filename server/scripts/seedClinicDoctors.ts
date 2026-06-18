import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ClinicModel, DoctorModel, UserModel } from '../mongodb';
import { AuthService } from '../services/auth.service';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const SEED_PASSWORD = '02115510Aa';

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
}

interface DoctorSeed {
    clinicAr: string;
    clinicEn: string;
    slug: string;
    aliases: string[];
    name: string;
    username: string;
    phone: string;
}

const doctorsToSeed: DoctorSeed[] = [
    {
        clinicAr: 'التشخيص وعلاج اللثة',
        clinicEn: 'Oral Diagnosis and Periodontology',
        slug: 'oral-diagnosis-periodontology',
        aliases: [
            'التشخيص وعلاج اللثة',
            'Oral Diagnosis and Periodontology',
            'اللثة',
            'Periodontology',
            'التشخيص والأشعة',
            'Diagnosis & Radiology',
            'Diagnosis and Radiology',
        ],
        name: 'Mohamed Ahmed',
        username: 'mohamed12',
        phone: '01000001001',
    },
    {
        clinicAr: 'العلاج التحفظي',
        clinicEn: 'Conservative Dentistry',
        slug: 'conservative-dentistry',
        aliases: ['العلاج التحفظي', 'Conservative Dentistry', 'العلاج التحفظي وطب وجراحة الجذور', 'Conservative & Endodontics'],
        name: 'Ahmed Allam',
        username: 'allam12',
        phone: '01000001002',
    },
    {
        clinicAr: 'طب وجراحة الجذور',
        clinicEn: 'Endodontics',
        slug: 'endodontics',
        aliases: ['طب وجراحة الجذور', 'Endodontics', 'العلاج التحفظي وطب وجراحة الجذور', 'Conservative & Endodontics'],
        name: 'Khaled Mohamed',
        username: 'Khaled12',
        phone: '01000001003',
    },
    {
        clinicAr: 'جراحة الوجه والفكين',
        clinicEn: 'Oral and Maxillofacial Surgery',
        slug: 'oral-maxillofacial-surgery',
        aliases: ['جراحة الوجه والفكين', 'Oral and Maxillofacial Surgery', 'جراحة الفم والفكين', 'Oral & Maxillofacial Surgery'],
        name: 'Saeed Ahmed',
        username: 'Saeed12',
        phone: '01000001004',
    },
    {
        clinicAr: 'جراحة الفم',
        clinicEn: 'Oral Surgery',
        slug: 'oral-surgery',
        aliases: ['جراحة الفم', 'Oral Surgery', 'الجراحة', 'Surgery'],
        name: 'Ibrahem Moataz',
        username: 'Moataz12',
        phone: '01000001005',
    },
    {
        clinicAr: 'التركيبات المتحركة',
        clinicEn: 'Removable Prosthodontics',
        slug: 'removable-prosthodontics',
        aliases: ['التركيبات المتحركة', 'Removable Prosthodontics'],
        name: 'Youssef Salem',
        username: 'Youssef12',
        phone: '01000001006',
    },
    {
        clinicAr: 'التركيبات الثابتة',
        clinicEn: 'Fixed Prosthodontics',
        slug: 'fixed-prosthodontics',
        aliases: ['التركيبات الثابتة', 'Fixed Prosthodontics'],
        name: 'Salma Yosry',
        username: 'Salma12',
        phone: '01000001007',
    },
    {
        clinicAr: 'تجميل الأسنان',
        clinicEn: 'Cosmetic Dentistry',
        slug: 'cosmetic-dentistry',
        aliases: ['تجميل الأسنان', 'Cosmetic Dentistry'],
        name: 'Shimaa Anas',
        username: 'Shimaa12',
        phone: '01000001008',
    },
    {
        clinicAr: 'زراعة الأسنان',
        clinicEn: 'Implant Dentistry',
        slug: 'implant-dentistry',
        aliases: ['زراعة الأسنان', 'Implant Dentistry', 'Implantology', 'Dental Implants'],
        name: 'Alaa Abdelsamea',
        username: 'Alaa12',
        phone: '01000001009',
    },
    {
        clinicAr: 'تقويم الأسنان',
        clinicEn: 'Orthodontics',
        slug: 'orthodontics',
        aliases: ['تقويم الأسنان', 'Orthodontics'],
        name: 'Ahmed Mohamed',
        username: 'Ahmed122',
        phone: '01000001010',
    },
    {
        clinicAr: 'أسنان الأطفال والاحتياجات الخاصة',
        clinicEn: 'Pediatric and Special Care Dentistry',
        slug: 'pediatric-special-care-dentistry',
        aliases: ['أسنان الأطفال والاحتياجات الخاصة', 'Pediatric and Special Care Dentistry', 'أسنان الأطفال', 'Pediatric Dentistry'],
        name: 'Wael Helal',
        username: 'Wael12',
        phone: '01000001011',
    },
];

function normalize(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[_\s]+/g, '-')
        .replace(/[^\w\u0600-\u06FF-]+/g, '');
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findClinic(seed: DoctorSeed) {
    const clinics = await ClinicModel.find({ deletedAt: null });
    const aliasKeys = seed.aliases.map(normalize);

    const clinic = aliasKeys
        .map((aliasKey) =>
            clinics.find((candidate) =>
                [candidate.name, candidate.nameAr].filter(Boolean).some((name) => normalize(name!) === aliasKey)
            )
        )
        .find(Boolean);

    if (clinic) return clinic;

    console.log(`Clinic "${seed.clinicAr}" not found. Creating the missing canonical clinic record.`);
    return ClinicModel.create({
        name: seed.clinicEn,
        nameAr: seed.clinicAr,
        description: `${seed.clinicEn} clinic`,
        color: 'from-teal-600 to-teal-400',
        icon: 'tooth',
        deletedAt: null,
    });
}

async function upsertDoctor(seed: DoctorSeed) {
    const clinic = await findClinic(seed);
    const email = `${seed.username.toLowerCase()}@dento.test`;
    const password = await AuthService.hashPassword(SEED_PASSWORD);

    const existingUser = await UserModel.findOne({
        username: { $regex: `^${escapeRegex(seed.username)}$`, $options: 'i' },
    });

    const user = existingUser || new UserModel({ username: seed.username });
    user.username = seed.username;
    user.password = password;
    user.fullName = seed.name;
    user.email = email;
    user.phone = seed.phone;
    user.userType = 'doctor';
    user.isActive = true;
    user.deletedAt = null;
    await user.save();

    const existingDoctor =
        (await DoctorModel.findOne({ userId: user._id.toString() })) ||
        (await DoctorModel.findOne({ email }));

    const doctor = existingDoctor || new DoctorModel();
    doctor.fullName = seed.name;
    doctor.specialization = seed.clinicAr;
    doctor.phone = seed.phone;
    doctor.email = email;
    doctor.clinicId = seed.slug;
    doctor.userId = user._id.toString();
    doctor.isAvailable = true;
    doctor.deletedAt = null;
    await doctor.save();

    return {
        username: seed.username,
        doctorId: doctor._id.toString(),
        clinicName: `${clinic.nameAr || clinic.name} [${seed.slug}]`,
    };
}

async function seedClinicDoctors() {
    console.log('Starting clinic doctor seed...');

    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to MongoDB');

        const results = [];
        for (const seed of doctorsToSeed) {
            results.push(await upsertDoctor(seed));
        }

        console.log(`Seeded/updated ${results.length} clinic doctors:`);
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.username} -> ${result.clinicName} (${result.doctorId})`);
        });
    } catch (error: any) {
        console.error('Clinic doctor seed failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

seedClinicDoctors();
