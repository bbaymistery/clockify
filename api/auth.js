import { connectToDatabase, UserModel } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB URI is not configured yet.'
    });
  }

  const { method, body } = req;

  if (method === 'POST') {
    const { action, name, email, password, confirmPassword, newPassword } = body;

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen geçerli bir e-posta adresi girin (örn: isim@domain.com).'
      });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (action === 'register') {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Lütfen geçerli bir isim girin (en az 2 karakter).' });
      }
      if (!password || password.length < 4) {
        return res.status(400).json({ success: false, message: 'Şifreniz en az 4 karakter olmalıdır.' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Şifre ve Şifre Tekrarı eşleşmiyor.' });
      }

      const existingUser = await UserModel.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı. Giriş yapabilirsiniz.' });
      }

      const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const user = await UserModel.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        avatarColor: randomColor
      });

      return res.status(201).json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor
        }
      });
    } 
    
    else if (action === 'login') {
      if (!cleanEmail || !password) {
        return res.status(400).json({ success: false, message: 'E-posta ve şifre zorunludur.' });
      }

      const user = await UserModel.findOne({ email: cleanEmail });
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı.' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor
        }
      });
    }

    else if (action === 'reset_password') {
      if (!cleanEmail || !newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'Geçerli bir e-posta ve yeni şifre (en az 4 karakter) girin.' });
      }

      const user = await UserModel.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Bu e-posta adresine ait kayıtlı kullanıcı bulunamadı.' });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.'
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
