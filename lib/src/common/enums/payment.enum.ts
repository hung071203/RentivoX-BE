export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

export enum PaymentSource {
  MANUAL = 'manual',       // Chủ trọ ghi nhận thủ công
  AUTOMATIC = 'automatic', // Tự động qua cổng thanh toán bên thứ 3
}
