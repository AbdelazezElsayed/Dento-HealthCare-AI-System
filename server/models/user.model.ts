import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  userType: 'patient' | 'doctor' | 'student' | 'graduate' | 'admin';
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  username:  { type: String, required: true, unique: true, trim: true },
  password:  { type: String, required: true },
  fullName:  { type: String, required: true, trim: true },
  email: {
    type: String, unique: true, sparse: true, lowercase: true, trim: true,
    validate: {
      validator: (v: string) => !v || /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
      message: 'Invalid email format',
    },
  },
  phone: {
    type: String, unique: true, sparse: true, trim: true,
    validate: {
      validator: (v: string) => !v || /^01[0-9]{9}$/.test(v),
      message: 'Invalid phone format (must be 11 digits starting with 01)',
    },
  },
  userType:  { type: String, required: true, enum: ['patient', 'doctor', 'student', 'graduate', 'admin'] },
  isActive:  { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ deletedAt: 1 });

export const UserModel = mongoose.model<IUser>('User', userSchema);
