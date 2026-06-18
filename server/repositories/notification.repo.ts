import mongoose from 'mongoose';
import { NotificationModel } from '../models/notification.model';

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

export const NotificationRepo = {
  async findByUser(userId: string, unreadOnly = false) {
    const query: any = { userId };
    if (unreadOnly) query.read = false;
    return (await NotificationModel.find(query).sort({ createdAt: -1 })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await NotificationModel.findById(id));
  },

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: 'appointment' | 'payment' | 'system' | 'reminder' | 'alert';
    relatedEntityType?: string;
    relatedEntityId?: string;
    titleEn?: string;
    messageEn?: string;
  }) {
    return toPlain(await NotificationModel.create({ ...data, read: false }));
  },

  async findByRelated(userId: string, relatedEntityType: string, relatedEntityId: string) {
    return toPlain(await NotificationModel.findOne({ userId, relatedEntityType, relatedEntityId }));
  },

  async markRead(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await NotificationModel.findByIdAndUpdate(id, { read: true }, { new: true }));
  },

  async markAllRead(userId: string) {
    await NotificationModel.updateMany({ userId, read: false }, { read: true });
  },

  async delete(id: string) {
    if (!isValidId(id)) return;
    await NotificationModel.findByIdAndDelete(id);
  },

  async countUnread(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, read: false });
  },
};
