import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI environment variable is not defined.');
}

/**
 * Global connection cache for Serverless environment (Vercel)
 */
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

// Mongoose Schema for Work Entry
const entrySchema = new mongoose.Schema({
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
