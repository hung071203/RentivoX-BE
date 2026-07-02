import { UserRole } from '../enums';

// Route map dùng bởi tool `getFrontendPageLink` — hướng người dùng đến đúng trang trên FE theo role
export const ROLE_PAGE_LINKS: Record<
  UserRole,
  Record<string, { path: string; label: string }>
> = {
  [UserRole.SUPER_ADMIN]: {
    dashboard: { path: '/admin/dashboard', label: 'Tổng quan hệ thống' },
    users: { path: '/admin/users', label: 'Quản lý tài khoản admin & chủ trọ' },
    properties: { path: '/admin/properties', label: 'Nhà trọ toàn hệ thống' },
    profile: { path: '/profile', label: 'Hồ sơ cá nhân' },
  },
  [UserRole.ADMIN]: {
    dashboard: { path: '/admin/dashboard', label: 'Tổng quan hệ thống' },
    users: { path: '/admin/users', label: 'Quản lý tài khoản chủ trọ' },
    properties: { path: '/admin/properties', label: 'Nhà trọ toàn hệ thống' },
    profile: { path: '/profile', label: 'Hồ sơ cá nhân' },
  },
  [UserRole.LANDLORD]: {
    dashboard: { path: '/dashboard', label: 'Tổng quan' },
    properties: { path: '/properties', label: 'Dãy nhà trọ' },
    rooms: { path: '/rooms', label: 'Phòng' },
    services: {
      path: '/properties',
      label: 'Dịch vụ — bấm "Quản lý dịch vụ" trên từng nhà trọ',
    },
    tenants: { path: '/tenants', label: 'Khách thuê' },
    contracts: { path: '/contracts', label: 'Hợp đồng' },
    meter_readings: { path: '/meter-readings', label: 'Chỉ số dịch vụ' },
    invoices: { path: '/invoices', label: 'Hóa đơn' },
    payments: { path: '/payments', label: 'Thanh toán' },
    profile: { path: '/profile', label: 'Hồ sơ cá nhân' },
  },
  [UserRole.TENANT]: {
    dashboard: { path: '/tenant/dashboard', label: 'Tổng quan' },
    contracts: {
      path: '/tenant/contracts',
      label: 'Hợp đồng của tôi (bao gồm thông tin phòng đang ở)',
    },
    invoices: { path: '/tenant/invoices', label: 'Hóa đơn của tôi' },
    payments: { path: '/tenant/payments', label: 'Thanh toán của tôi' },
    profile: { path: '/profile', label: 'Hồ sơ cá nhân' },
  },
};

export const PAGE_TOPICS = [
  'dashboard',
  'users',
  'properties',
  'rooms',
  'services',
  'tenants',
  'contracts',
  'meter_readings',
  'invoices',
  'payments',
  'profile',
];
