import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI_MISSING');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatarColor: { type: String, default: '#6366f1' },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Work Entry Schema (with User tracking for girlfriend & partner sharing!)
const entrySchema = new mongoose.Schema({
  userId: { type: String, required: false },
  userName: { type: String, required: false },
  userEmail: { type: String, required: false },
  date: { type: String, required: true },
  dayName: { type: String, required: true },
  hours: { type: Number, default: 0 },
  minutes: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  totalSeconds: { type: Number, required: true },
  category: { type: String, default: 'Genel Çalışma' },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export const EntryModel = mongoose.models.Entry || mongoose.model('Entry', entrySchema);
