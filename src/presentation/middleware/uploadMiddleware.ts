import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../public/uploads/avatars');
    // Создаём папку рекурсивно, если её нет
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).userId;
    const ext = path.extname(file.originalname);
    // Очищаем имя файла от спецсимволов
    const safeExt = ext.toLowerCase();
    cb(null, `avatar-${userId}${safeExt}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат изображения. Разрешены: JPG, PNG, GIF, WEBP'));
  }
};

export const uploadAvatar = multer({ 
  storage, 
  // fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB лимит
}).single('avatar');