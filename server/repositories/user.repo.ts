import mongoose from 'mongoose';
import { UserModel, IUser } from '../models/user.model';

function toPlain(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const UserRepo = {
  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await UserModel.findOne({ _id: id, deletedAt: null }));
  },

  async findByUsername(username: string) {
    const trimmedUsername = username.trim();
    const exactUser = await UserModel.findOne({ username: trimmedUsername, deletedAt: null });
    if (exactUser) return toPlain(exactUser);

    return toPlain(await UserModel.findOne({
      username: { $regex: new RegExp(`^${escapeRegExp(trimmedUsername)}$`, 'i') },
      deletedAt: null,
    }));
  },

  async findByEmail(email: string) {
    return toPlain(await UserModel.findOne({ email: email.toLowerCase(), deletedAt: null }));
  },

  /** Supports login with email OR username */
  async findByEmailOrUsername(identifier: string) {
    const isEmail = identifier.includes('@');
    return isEmail
      ? UserRepo.findByEmail(identifier)
      : UserRepo.findByUsername(identifier);
  },

  async create(data: Partial<IUser>) {
    return toPlain(await UserModel.create(data));
  },

  async softDelete(id: string) {
    await UserModel.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false });
  },

  async setActive(id: string, isActive: boolean) {
    await UserModel.findByIdAndUpdate(id, { isActive });
  },

  async getAll() {
    return (await UserModel.find({ deletedAt: null })).map(toPlain);
  },
};
