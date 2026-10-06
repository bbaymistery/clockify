import { connectToDatabase, EntryModel } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
  } catch (err) {
    if (err.message === 'MONGODB_URI_MISSING') {
      return res.status(503).json({
        success: false,
        useLocalStorage: true,
        message: 'MongoDB URI is not configured yet. App can continue using LocalStorage.'
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }

  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET': {
        const entries = await EntryModel.find({}).sort({ date: -1, createdAt: -1 });
        const mapped = entries.map(doc => ({
          id: doc._id.toString(),
          userId: doc.userId || null,
          userName: doc.userName || null,
          userEmail: doc.userEmail || null,
          date: doc.date,
          dayName: doc.dayName,
          hours: doc.hours,
          minutes: doc.minutes,
          seconds: doc.seconds,
          totalSeconds: doc.totalSeconds,
          category: doc.category,
          note: doc.note,
          createdAt: doc.createdAt
        }));
        return res.status(200).json({ success: true, data: mapped });
      }

      case 'POST': {
        const { userId, userName, userEmail, date, dayName, hours, minutes, seconds, totalSeconds, category, note } = body;
        const newDoc = await EntryModel.create({
          userId: userId || null,
          userName: userName || null,
          userEmail: userEmail || null,
          date,
          dayName,
          hours: hours || 0,
          minutes: minutes || 0,
          seconds: seconds || 0,
          totalSeconds,
          category: category || 'Genel Çalışma',
          note: note || ''
        });
        return res.status(201).json({
          success: true,
          data: {
            id: newDoc._id.toString(),
            userId: newDoc.userId,
            userName: newDoc.userName,
            userEmail: newDoc.userEmail,
            date: newDoc.date,
            dayName: newDoc.dayName,
            hours: newDoc.hours,
            minutes: newDoc.minutes,
            seconds: newDoc.seconds,
            totalSeconds: newDoc.totalSeconds,
            category: newDoc.category,
            note: newDoc.note,
            createdAt: newDoc.createdAt
          }
        });
      }

      case 'PUT': {
        const id = query.id || body.id;
        if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

        const updated = await EntryModel.findByIdAndUpdate(id, body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Entry not found' });

        return res.status(200).json({
          success: true,
          data: {
            id: updated._id.toString(),
            userId: updated.userId,
            userName: updated.userName,
            userEmail: updated.userEmail,
            date: updated.date,
            dayName: updated.dayName,
            hours: updated.hours,
            minutes: updated.minutes,
            seconds: updated.seconds,
            totalSeconds: updated.totalSeconds,
            category: updated.category,
            note: updated.note,
            createdAt: updated.createdAt
          }
        });
      }

      case 'DELETE': {
        if (query.clearAll === 'true') {
          await EntryModel.deleteMany({});
          return res.status(200).json({ success: true, message: 'All entries deleted' });
        }

        const id = query.id;
        if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

        await EntryModel.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Entry deleted' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
