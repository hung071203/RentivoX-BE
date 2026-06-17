import { Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { ENV } from '@lib/configs/env.config';

@Injectable()
export class UploadsService {
  getFileUrl(folder: string, filename: string): string {
    return `${ENV.appUrl}/uploads/${folder}/${filename}`;
  }

  // Xóa file cũ khi cập nhật — bỏ qua nếu file không tồn tại
  async deleteFile(fileUrl: string | null): Promise<void> {
    if (!fileUrl) return;
    const relativePath = fileUrl.replace(`${ENV.appUrl}/`, '');
    try {
      await unlink(join(process.cwd(), relativePath));
    } catch {
      // ignore
    }
  }
}
