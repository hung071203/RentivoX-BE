export enum RoomType {
  SHARED = 'shared',
  PRIVATE = 'private',
}

export enum RoomStatus {
  AVAILABLE = 'available', // có thể cho thuê
  OCCUPIED = 'occupied', // đang có người thuê
  MAINTENANCE = 'maintenance', // đang bảo trì, không thể cho thuê
  RESERVED = 'reserved', // đã được đặt trước nhưng chưa có hợp đồng
}
