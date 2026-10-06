import { connectToDatabase, UserModel, EntryModel } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
  } catch (err) {
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  }

  try {
    const users = await UserModel.find({}, 'name email avatarColor createdAt').lean();
    const entries = await EntryModel.find({}).lean();

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

    const userStats = users.map(user => {
      const userEntries = entries.filter(e => e.userEmail === user.email || e.userId === user._id.toString());
      
      const totalSec = userEntries.reduce((sum, e) => sum + e.totalSeconds, 0);
      
      const todaySec = userEntries
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + e.totalSeconds, 0);

      const yesterdaySec = userEntries
        .filter(e => e.date === yesterdayStr)
        .reduce((sum, e) => sum + e.totalSeconds, 0);

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor || '#6366f1',
        totalEntries: userEntries.length,
        totalSeconds: totalSec,
        todaySeconds: todaySec,
        yesterdaySeconds: yesterdaySec,
        createdAt: user.createdAt
      };
    });

    return res.status(200).json({ success: true, data: userStats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
