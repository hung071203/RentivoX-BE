// Chữ cái dùng trong seri biển số xe VN — loại trừ I, J, O, Q, R, W (dễ nhầm với số hoặc không dùng)
export const VN_PLATE_LETTERS = 'ABCDEFGHKLMNPSTUVXYZ';

// Cấu trúc: 2 số (mã tỉnh) + 1-2 chữ (seri) + 5-6 số (số thứ tự, có thể kèm 1 số phụ seri xe máy)
// Áp dụng cho biển số ô tô/xe máy dân dụng — không cover biển ngoại giao/quốc tế/quân đội/công an
export const VN_PLATE_REGEX = new RegExp(
  `^\\d{2}[${VN_PLATE_LETTERS}]{1,2}\\d{5,6}$`,
);

// Chuẩn hóa: bỏ mọi ký tự không phải chữ/số (khoảng trắng, dấu gạch ngang, dấu chấm) + viết hoa
export function normalizePlateNumber(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
