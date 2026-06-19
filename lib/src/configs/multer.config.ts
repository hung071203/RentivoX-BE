import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

export type UploadFolder = 'id-cards' | 'contracts';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function multerConfig(
  folder: UploadFolder,
  type: 'image' | 'doc' = 'image',
): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dest = join(process.cwd(), 'uploads', folder);
        mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = type === 'image' ? ALLOWED_IMAGE_MIMES : ALLOWED_DOC_MIMES;
      if (!allowed.includes(file.mimetype)) {
        return cb(
          new BadRequestException(
            `Định dạng không hợp lệ. Chấp nhận: ${allowed.join(', ')}`,
          ),
          false,
        );
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  };
}
