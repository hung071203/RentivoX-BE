import { DataSource } from 'typeorm';
import { AuthUtil } from '@lib/utils/auth.util';
import { User } from '../../entities/user.entity';
import { Property } from '../../entities/property.entity';
import { Room } from '../../entities/room.entity';
import { RoomService as RoomServiceEntity } from '../../entities/room-service.entity';
import { Service } from '../../entities/service.entity';
import { Tenant } from '../../entities/tenant.entity';
import { Contract } from '../../entities/contract.entity';
import { ContractDocument } from '../../entities/contract-document.entity';
import { ContractService } from '../../entities/contract-service.entity';
import { RoomOccupant } from '../../entities/room-occupant.entity';
import { MeterReading } from '../../entities/meter-reading.entity';
import { Invoice } from '../../entities/invoice.entity';
import { InvoiceItem } from '../../entities/invoice-item.entity';
import { Payment } from '../../entities/payment.entity';
import { ContractAmendment } from '../../entities/contract-amendment.entity';
import { ContractAmendmentService } from '../../entities/contract-amendment-service.entity';
import {
  UserRole,
  Gender,
  RoomType,
  RoomStatus,
  ServiceType,
  ContractStatus,
  DocumentType,
  AmendmentType,
  InvoiceStatus,
  PaymentMethod,
  PaymentSource,
} from '../../../src/common/enums';
import { BaseSeeder } from '../base.seeder';

export class DemoDataSeeder extends BaseSeeder {
  name = '002-demo-data';

  async run(dataSource: DataSource) {
    const mgr = dataSource.manager;
    const pw = await AuthUtil.hashPassword('Demo@123456');

    // ── 1. ADMIN USERS ────────────────────────────────────────────────────
    await mgr.save(User, [
      { email: 'admin1@demo.com', passwordHash: pw, role: UserRole.ADMIN, fullName: 'Admin Một', isActive: true },
      { email: 'admin2@demo.com', passwordHash: pw, role: UserRole.ADMIN, fullName: 'Admin Hai', isActive: true },
    ]);

    // ── 2. REAL LANDLORD USERS ────────────────────────────────────────────
    const [ll1, ll2] = await mgr.save(User, [
      { email: 'landlord1@demo.com', passwordHash: pw, role: UserRole.LANDLORD, fullName: 'Nguyễn Minh Khoa', phone: '0901111001', gender: Gender.MALE, isActive: true },
      { email: 'landlord2@demo.com', passwordHash: pw, role: UserRole.LANDLORD, fullName: 'Trần Thị Lan', phone: '0901111002', gender: Gender.FEMALE, isActive: true },
    ]);

    // ── 3. SHELL LANDLORD USERS (19) ──────────────────────────────────────
    const shellLandlordNames = [
      'Phạm Quang Huy', 'Lê Thị Lan', 'Nguyễn Văn Đức', 'Trần Thị Hoa',
      'Bùi Quang Nam', 'Hoàng Thị Thu', 'Vũ Văn Thắng', 'Đặng Thị Nhung',
      'Đinh Văn Toàn', 'Phan Thị Lý', 'Dương Văn Hùng', 'Lý Thị Thảo',
      'Tô Văn Khoa', 'Trịnh Thị Vân', 'Đỗ Văn Hoà', 'Cao Thị Phương',
      'Hà Văn Long', 'Mai Thị Sen', 'Chu Văn Lực',
    ];
    const shellLandlords = await mgr.save(
      User,
      shellLandlordNames.map((fullName, i) => ({
        email: `landlord${String(i + 3).padStart(2, '0')}@test.com`,
        passwordHash: pw,
        role: UserRole.LANDLORD,
        fullName,
        isActive: true,
      })),
    );

    // ── 4. TENANT USERS (4 real) ──────────────────────────────────────────
    const [tu1, tu2, tu3, tu4] = await mgr.save(User, [
      { email: 'tenant1@demo.com', passwordHash: pw, role: UserRole.TENANT, fullName: 'Nguyễn Văn An', phone: '0902111001', gender: Gender.MALE, isActive: true },
      { email: 'tenant2@demo.com', passwordHash: pw, role: UserRole.TENANT, fullName: 'Lê Thị Bình', phone: '0902111002', gender: Gender.FEMALE, isActive: true },
      { email: 'tenant3@demo.com', passwordHash: pw, role: UserRole.TENANT, fullName: 'Phạm Văn Cường', phone: '0902111003', gender: Gender.MALE, isActive: true },
      { email: 'tenant4@demo.com', passwordHash: pw, role: UserRole.TENANT, fullName: 'Hoàng Thị Dung', phone: '0902111004', gender: Gender.FEMALE, isActive: true },
    ]);

    // ── 5. PROPERTIES ─────────────────────────────────────────────────────
    const [prop1L1, prop2L1] = await mgr.save(Property, [
      { landlordId: ll1.id, name: 'Nhà trọ Minh Khoa 1', address: '123 Nguyễn Trãi', ward: 'Phường 2', district: 'Quận 5', province: 'Hồ Chí Minh' },
      { landlordId: ll1.id, name: 'Nhà trọ Minh Khoa 2', address: '456 Lê Văn Sỹ', ward: 'Phường 14', district: 'Quận 3', province: 'Hồ Chí Minh' },
    ]);
    const [prop1L2] = await mgr.save(Property, [
      { landlordId: ll2.id, name: 'Nhà trọ Lan Hà Nội', address: '789 Đường Láng', ward: 'Phường Láng Thượng', district: 'Quận Đống Đa', province: 'Hà Nội' },
    ]);
    const shellProps = await mgr.save(
      Property,
      shellLandlords.map((ll, i) => ({
        landlordId: ll.id,
        name: `Nhà trọ ${ll.fullName}`,
        address: `${100 + i} Đường Số ${i + 1}`,
        ward: 'Phường 1',
        district: i % 2 === 0 ? 'Quận 1' : 'Quận Hoàn Kiếm',
        province: i % 2 === 0 ? 'Hồ Chí Minh' : 'Hà Nội',
      })),
    );

    // ── 6. SERVICES ───────────────────────────────────────────────────────
    const [svcDien1, svcNuoc1, svcWifi1, svcXe1] = await mgr.save(Service, [
      { propertyId: prop1L1.id, name: 'Điện', type: ServiceType.METERED, unit: 'kWh', unitPrice: 3500, isActive: true },
      { propertyId: prop1L1.id, name: 'Nước', type: ServiceType.METERED, unit: 'm³', unitPrice: 15000, isActive: true },
      { propertyId: prop1L1.id, name: 'Wifi', type: ServiceType.FIXED, unitPrice: 100000, isActive: true },
      { propertyId: prop1L1.id, name: 'Gửi xe', type: ServiceType.FIXED, unitPrice: 80000, isActive: true },
    ]);
    const [svcDien1b, svcNuoc1b, svcWifi1b, svcXe1b] = await mgr.save(Service, [
      { propertyId: prop2L1.id, name: 'Điện', type: ServiceType.METERED, unit: 'kWh', unitPrice: 3500, isActive: true },
      { propertyId: prop2L1.id, name: 'Nước', type: ServiceType.METERED, unit: 'm³', unitPrice: 15000, isActive: true },
      { propertyId: prop2L1.id, name: 'Wifi', type: ServiceType.FIXED, unitPrice: 100000, isActive: true },
      { propertyId: prop2L1.id, name: 'Gửi xe', type: ServiceType.FIXED, unitPrice: 80000, isActive: true },
    ]);
    const [svcDien2, svcNuoc2, svcVeSinh2] = await mgr.save(Service, [
      { propertyId: prop1L2.id, name: 'Điện', type: ServiceType.METERED, unit: 'kWh', unitPrice: 3500, isActive: true },
      { propertyId: prop1L2.id, name: 'Nước', type: ServiceType.METERED, unit: 'm³', unitPrice: 15000, isActive: true },
      { propertyId: prop1L2.id, name: 'Vệ sinh', type: ServiceType.FIXED, unitPrice: 50000, isActive: true },
    ]);

    // ── 7. ROOMS ──────────────────────────────────────────────────────────
    // Landlord 1 - Property 1: 11 rooms (101 real + 10 shell)
    const p1ShellStatuses = [
      RoomStatus.AVAILABLE, RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE,
      RoomStatus.RESERVED, RoomStatus.AVAILABLE, RoomStatus.AVAILABLE,
      RoomStatus.MAINTENANCE, RoomStatus.AVAILABLE, RoomStatus.AVAILABLE, RoomStatus.RESERVED,
    ];
    const [room101, ...p1ShellRooms] = await mgr.save(Room, [
      { propertyId: prop1L1.id, roomNumber: '101', floor: 1, roomType: RoomType.PRIVATE, areaM2: 25, basePrice: 4000000, maxOccupants: 4, hasPrivateWc: true, hasKitchen: false, hasAc: true, status: RoomStatus.AVAILABLE },
      ...Array.from({ length: 10 }, (_, i) => ({
        propertyId: prop1L1.id,
        roomNumber: `${102 + i}`,
        floor: Math.floor(i / 4) + 1,
        roomType: RoomType.PRIVATE,
        areaM2: 20,
        basePrice: 3500000,
        maxOccupants: 2,
        hasPrivateWc: false,
        hasKitchen: false,
        hasAc: false,
        status: p1ShellStatuses[i],
      })),
    ]);

    // Landlord 1 - Property 2: 10 rooms (201 real + 9 shell)
    const p2ShellStatuses = [
      RoomStatus.AVAILABLE, RoomStatus.AVAILABLE, RoomStatus.AVAILABLE,
      RoomStatus.MAINTENANCE, RoomStatus.AVAILABLE, RoomStatus.AVAILABLE,
      RoomStatus.RESERVED, RoomStatus.AVAILABLE, RoomStatus.AVAILABLE,
    ];
    const [room201, ...p2ShellRooms] = await mgr.save(Room, [
      { propertyId: prop2L1.id, roomNumber: '201', floor: 2, roomType: RoomType.SHARED, areaM2: 30, basePrice: 2500000, maxOccupants: 4, hasPrivateWc: false, hasKitchen: true, hasAc: true, status: RoomStatus.AVAILABLE },
      ...Array.from({ length: 9 }, (_, i) => ({
        propertyId: prop2L1.id,
        roomNumber: `${202 + i}`,
        floor: Math.floor(i / 3) + 2,
        roomType: RoomType.SHARED,
        areaM2: 25,
        basePrice: 2500000,
        maxOccupants: 4,
        hasPrivateWc: false,
        hasKitchen: false,
        hasAc: false,
        status: p2ShellStatuses[i],
      })),
    ]);

    // Landlord 2 - Property 1: 21 rooms (A01, A02 real + 19 shell)
    const [roomA01, roomA02, ...l2ShellRooms] = await mgr.save(Room, [
      { propertyId: prop1L2.id, roomNumber: 'A01', floor: 1, roomType: RoomType.PRIVATE, areaM2: 35, basePrice: 5000000, maxOccupants: 2, hasPrivateWc: true, hasKitchen: true, hasAc: true, status: RoomStatus.AVAILABLE },
      { propertyId: prop1L2.id, roomNumber: 'A02', floor: 1, roomType: RoomType.PRIVATE, areaM2: 30, basePrice: 4500000, maxOccupants: 2, hasPrivateWc: true, hasKitchen: false, hasAc: true, status: RoomStatus.AVAILABLE },
      ...Array.from({ length: 19 }, (_, i) => ({
        propertyId: prop1L2.id,
        roomNumber: `A${String(i + 3).padStart(2, '0')}`,
        floor: Math.floor(i / 5) + 1,
        roomType: RoomType.PRIVATE,
        areaM2: 25,
        basePrice: 3800000,
        maxOccupants: 2,
        hasPrivateWc: false,
        hasKitchen: false,
        hasAc: false,
        status: i % 4 === 0 ? RoomStatus.MAINTENANCE : RoomStatus.AVAILABLE,
      })),
    ]);

    // Shell landlords: 2–3 rooms each
    for (let i = 0; i < shellProps.length; i++) {
      const count = i % 3 === 0 ? 3 : 2;
      await mgr.save(
        Room,
        Array.from({ length: count }, (_, j) => ({
          propertyId: shellProps[i].id,
          roomNumber: `${101 + j}`,
          floor: 1,
          roomType: RoomType.PRIVATE,
          areaM2: 20,
          basePrice: 3000000,
          maxOccupants: 2,
          hasPrivateWc: false,
          hasKitchen: false,
          hasAc: false,
          status: RoomStatus.AVAILABLE,
        })),
      );
    }

    // ── 8. ROOM SERVICES (real rooms only) ────────────────────────────────
    const [rsDien101, rsNuoc101, rsWifi101, rsXe101] = await mgr.save(RoomServiceEntity, [
      { roomId: room101.id, serviceId: svcDien1.id, unitPrice: 3500 },
      { roomId: room101.id, serviceId: svcNuoc1.id, unitPrice: 15000 },
      { roomId: room101.id, serviceId: svcWifi1.id, unitPrice: 100000 },
      { roomId: room101.id, serviceId: svcXe1.id, unitPrice: 80000 },
    ]);
    const [rsDien201, rsNuoc201, rsWifi201, rsXe201] = await mgr.save(RoomServiceEntity, [
      { roomId: room201.id, serviceId: svcDien1b.id, unitPrice: 3500 },
      { roomId: room201.id, serviceId: svcNuoc1b.id, unitPrice: 15000 },
      { roomId: room201.id, serviceId: svcWifi1b.id, unitPrice: 100000 },
      { roomId: room201.id, serviceId: svcXe1b.id, unitPrice: 80000 },
    ]);
    await mgr.save(RoomServiceEntity, [
      { roomId: roomA01.id, serviceId: svcDien2.id, unitPrice: 3500 },
      { roomId: roomA01.id, serviceId: svcNuoc2.id, unitPrice: 15000 },
      { roomId: roomA01.id, serviceId: svcVeSinh2.id, unitPrice: 50000 },
    ]);
    await mgr.save(RoomServiceEntity, [
      { roomId: roomA02.id, serviceId: svcDien2.id, unitPrice: 3500 },
      { roomId: roomA02.id, serviceId: svcNuoc2.id, unitPrice: 15000 },
      { roomId: roomA02.id, serviceId: svcVeSinh2.id, unitPrice: 50000 },
    ]);

    // ── 9. TENANTS (42 total) ─────────────────────────────────────────────
    // Landlord 1: 21 tenants
    const [t1L1, t2L1, t3L1, t4L1] = await mgr.save(Tenant, [
      // real accounts
      { userId: tu1.id, landlordId: ll1.id, fullName: 'Nguyễn Văn An', phone: '0902111001', email: 'tenant1@demo.com', idCardNumber: '001200001001', dateOfBirth: new Date('1995-03-15'), gender: Gender.MALE, permanentAddress: '123 Đường ABC, Quận 1, Hồ Chí Minh' },
      { userId: tu2.id, landlordId: ll1.id, fullName: 'Lê Thị Bình', phone: '0902111002', email: 'tenant2@demo.com', idCardNumber: '001200001002', dateOfBirth: new Date('1997-07-20'), gender: Gender.FEMALE, permanentAddress: '456 Đường XYZ, Quận 2, Hồ Chí Minh' },
      // shell with contract (phòng ghép C3 + TERMINATED C4)
      { landlordId: ll1.id, fullName: 'Vũ Văn Cường', phone: '0902222001', idCardNumber: '001200002001', dateOfBirth: new Date('1996-05-10'), gender: Gender.MALE },
      { landlordId: ll1.id, fullName: 'Nguyễn Thị Duyên', phone: '0902222002', idCardNumber: '001200002002', dateOfBirth: new Date('1994-11-25'), gender: Gender.FEMALE },
      // 17 pure shells
      ...Array.from({ length: 17 }, (_, i) => ({
        landlordId: ll1.id,
        fullName: `Khách thuê L1-${String(i + 5).padStart(2, '0')}`,
        phone: `0902${String(230000 + i).padStart(6, '0')}`,
        idCardNumber: `00120000${String(i + 3).padStart(4, '0')}`,
        dateOfBirth: new Date('1990-01-01'),
      })),
    ]);

    // Landlord 2: 21 tenants
    const [t1L2, t2L2, t3L2] = await mgr.save(Tenant, [
      // real accounts
      { userId: tu3.id, landlordId: ll2.id, fullName: 'Phạm Văn Cường', phone: '0902111003', email: 'tenant3@demo.com', idCardNumber: '001200003001', dateOfBirth: new Date('1993-08-22'), gender: Gender.MALE, permanentAddress: '789 Đường DEF, Hoàn Kiếm, Hà Nội' },
      { userId: tu4.id, landlordId: ll2.id, fullName: 'Hoàng Thị Dung', phone: '0902111004', email: 'tenant4@demo.com', idCardNumber: '001200003002', dateOfBirth: new Date('1998-12-05'), gender: Gender.FEMALE, permanentAddress: '321 Đường GHI, Hai Bà Trưng, Hà Nội' },
      // shell with expired contract (C6)
      { landlordId: ll2.id, fullName: 'Trần Quốc Anh', phone: '0902333001', idCardNumber: '001200004001', dateOfBirth: new Date('1991-04-18'), gender: Gender.MALE },
      // 18 pure shells
      ...Array.from({ length: 18 }, (_, i) => ({
        landlordId: ll2.id,
        fullName: `Khách thuê L2-${String(i + 4).padStart(2, '0')}`,
        phone: `0902${String(430000 + i).padStart(6, '0')}`,
        idCardNumber: `00120000${String(i + 20).padStart(4, '0')}`,
        dateOfBirth: new Date('1992-01-01'),
      })),
    ]);

    // ── 10. CONTRACTS ─────────────────────────────────────────────────────
    // C1: Room 101, ACTIVE, tenant1
    const c1 = await mgr.save(Contract, {
      contractNumber: 'HD/2025/001', roomId: room101.id,
      rentAmount: 4000000, depositAmount: 4000000,
      startDate: new Date('2025-01-01'), endDate: new Date('2026-12-31'),
      status: ContractStatus.ACTIVE,
    });
    await mgr.save(ContractDocument, { contractId: c1.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2025-101.pdf', fileUrl: '/uploads/contracts/hop-dong-2025-101.pdf', uploadedById: ll1.id });

    // C2: Room 201 shared, ACTIVE, tenant2
    const c2 = await mgr.save(Contract, {
      contractNumber: 'HD/2025/002', roomId: room201.id,
      rentAmount: 2500000, depositAmount: 2500000,
      startDate: new Date('2025-06-01'), endDate: new Date('2026-12-31'),
      status: ContractStatus.ACTIVE,
    });
    await mgr.save(ContractDocument, { contractId: c2.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2025-201a.pdf', fileUrl: '/uploads/contracts/hop-dong-2025-201a.pdf', uploadedById: ll1.id });

    // C3: Room 201 shared, ACTIVE, t3L1 (phòng ghép người thứ 2)
    const c3 = await mgr.save(Contract, {
      contractNumber: 'HD/2025/003', roomId: room201.id,
      rentAmount: 2500000, depositAmount: 2500000,
      startDate: new Date('2025-06-01'), endDate: new Date('2026-12-31'),
      status: ContractStatus.ACTIVE,
    });
    await mgr.save(ContractDocument, { contractId: c3.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2025-201b.pdf', fileUrl: '/uploads/contracts/hop-dong-2025-201b.pdf', uploadedById: ll1.id });

    // C4: Room 201, TERMINATED (lịch sử)
    const c4 = await mgr.save(Contract, {
      contractNumber: 'HD/2024/001', roomId: room201.id,
      rentAmount: 2000000, depositAmount: 2000000,
      startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
      status: ContractStatus.TERMINATED,
      terminatedDate: new Date('2025-05-31'),
      terminatedReason: 'Khách thuê chuyển đi nơi khác',
    });
    await mgr.save(ContractDocument, { contractId: c4.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2024-201.pdf', fileUrl: '/uploads/contracts/hop-dong-2024-201.pdf', uploadedById: ll1.id });

    // C5: Room A01, ACTIVE, sắp hết hạn (endDate = today + 25 ngày)
    const c5 = await mgr.save(Contract, {
      contractNumber: 'HD/2026/001', roomId: roomA01.id,
      rentAmount: 5000000, depositAmount: 5000000,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-07-25'),
      status: ContractStatus.ACTIVE,
    });
    await mgr.save(ContractDocument, { contractId: c5.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2026-A01.pdf', fileUrl: '/uploads/contracts/hop-dong-2026-A01.pdf', uploadedById: ll2.id });

    // C6: Room A02, EXPIRED (lịch sử)
    const c6 = await mgr.save(Contract, {
      contractNumber: 'HD/2024/002', roomId: roomA02.id,
      rentAmount: 4000000, depositAmount: 4000000,
      startDate: new Date('2024-07-01'), endDate: new Date('2025-06-30'),
      status: ContractStatus.EXPIRED,
    });
    await mgr.save(ContractDocument, { contractId: c6.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2024-A02.pdf', fileUrl: '/uploads/contracts/hop-dong-2024-A02.pdf', uploadedById: ll2.id });

    // C7: Room A02, ACTIVE (mới sau khi C6 expired)
    const c7 = await mgr.save(Contract, {
      contractNumber: 'HD/2025/004', roomId: roomA02.id,
      rentAmount: 4500000, depositAmount: 4500000,
      startDate: new Date('2025-08-01'), endDate: new Date('2026-12-31'),
      status: ContractStatus.ACTIVE,
    });
    await mgr.save(ContractDocument, { contractId: c7.id, type: DocumentType.CONTRACT, fileName: 'hop-dong-2025-A02.pdf', fileUrl: '/uploads/contracts/hop-dong-2025-A02.pdf', uploadedById: ll2.id });

    // ── 11. CONTRACT SERVICES ─────────────────────────────────────────────
    const [csC1Dien, csC1Nuoc, csC1Wifi, csC1Xe] = await mgr.save(ContractService, [
      { contractId: c1.id, serviceId: svcDien1.id, unitPrice: 3500 },
      { contractId: c1.id, serviceId: svcNuoc1.id, unitPrice: 15000 },
      { contractId: c1.id, serviceId: svcWifi1.id, unitPrice: 100000 },
      { contractId: c1.id, serviceId: svcXe1.id, unitPrice: 80000 },
    ]);
    const [csC2Dien, csC2Nuoc, csC2Wifi, csC2Xe] = await mgr.save(ContractService, [
      { contractId: c2.id, serviceId: svcDien1b.id, unitPrice: 3500 },
      { contractId: c2.id, serviceId: svcNuoc1b.id, unitPrice: 15000 },
      { contractId: c2.id, serviceId: svcWifi1b.id, unitPrice: 100000 },
      { contractId: c2.id, serviceId: svcXe1b.id, unitPrice: 80000 },
    ]);
    const [csC3Dien, csC3Nuoc, csC3Wifi, csC3Xe] = await mgr.save(ContractService, [
      { contractId: c3.id, serviceId: svcDien1b.id, unitPrice: 3500 },
      { contractId: c3.id, serviceId: svcNuoc1b.id, unitPrice: 15000 },
      { contractId: c3.id, serviceId: svcWifi1b.id, unitPrice: 100000 },
      { contractId: c3.id, serviceId: svcXe1b.id, unitPrice: 80000 },
    ]);
    await mgr.save(ContractService, [
      { contractId: c4.id, serviceId: svcDien1b.id, unitPrice: 3000 },
      { contractId: c4.id, serviceId: svcNuoc1b.id, unitPrice: 12000 },
      { contractId: c4.id, serviceId: svcWifi1b.id, unitPrice: 80000 },
      { contractId: c4.id, serviceId: svcXe1b.id, unitPrice: 60000 },
    ]);
    const [csC5Dien, csC5Nuoc, csC5VeSinh] = await mgr.save(ContractService, [
      { contractId: c5.id, serviceId: svcDien2.id, unitPrice: 3500 },
      { contractId: c5.id, serviceId: svcNuoc2.id, unitPrice: 15000 },
      { contractId: c5.id, serviceId: svcVeSinh2.id, unitPrice: 50000 },
    ]);
    await mgr.save(ContractService, [
      { contractId: c6.id, serviceId: svcDien2.id, unitPrice: 3000 },
      { contractId: c6.id, serviceId: svcNuoc2.id, unitPrice: 12000 },
      { contractId: c6.id, serviceId: svcVeSinh2.id, unitPrice: 40000 },
    ]);
    const [csC7Dien, csC7Nuoc, csC7VeSinh] = await mgr.save(ContractService, [
      { contractId: c7.id, serviceId: svcDien2.id, unitPrice: 3500 },
      { contractId: c7.id, serviceId: svcNuoc2.id, unitPrice: 15000 },
      { contractId: c7.id, serviceId: svcVeSinh2.id, unitPrice: 50000 },
    ]);

    // ── 12. ROOM OCCUPANTS ────────────────────────────────────────────────
    await mgr.save(RoomOccupant, [
      { contractId: c1.id, tenantId: t1L1.id, isOwner: true, movedInDate: new Date('2025-01-01') },
      { contractId: c2.id, tenantId: t2L1.id, isOwner: true, movedInDate: new Date('2025-06-01') },
      { contractId: c3.id, tenantId: t3L1.id, isOwner: true, movedInDate: new Date('2025-06-01') },
      { contractId: c4.id, tenantId: t4L1.id, isOwner: true, movedInDate: new Date('2024-01-01'), movedOutDate: new Date('2025-05-31') },
      { contractId: c5.id, tenantId: t1L2.id, isOwner: true, movedInDate: new Date('2026-01-01') },
      { contractId: c6.id, tenantId: t3L2.id, isOwner: true, movedInDate: new Date('2024-07-01'), movedOutDate: new Date('2025-06-30') },
      { contractId: c7.id, tenantId: t2L2.id, isOwner: true, movedInDate: new Date('2025-08-01') },
    ]);

    // ── 13. UPDATE ROOM STATUS TO OCCUPIED ────────────────────────────────
    await Promise.all([
      mgr.update(Room, { id: room101.id }, { status: RoomStatus.OCCUPIED }),
      mgr.update(Room, { id: room201.id }, { status: RoomStatus.OCCUPIED }),
      mgr.update(Room, { id: roomA01.id }, { status: RoomStatus.OCCUPIED }),
      mgr.update(Room, { id: roomA02.id }, { status: RoomStatus.OCCUPIED }),
    ]);

    // ── 14. METER READINGS ────────────────────────────────────────────────
    const may = new Date('2026-05-01');
    const jun = new Date('2026-06-01');

    await mgr.save(MeterReading, [
      // Room 101
      { roomId: room101.id, serviceId: svcDien1.id, period: may, valueStart: 100, valueEnd: 250, recordedAt: new Date('2026-05-31'), recordedById: ll1.id },
      { roomId: room101.id, serviceId: svcNuoc1.id, period: may, valueStart: 10, valueEnd: 22, recordedAt: new Date('2026-05-31'), recordedById: ll1.id },
      { roomId: room101.id, serviceId: svcDien1.id, period: jun, valueStart: 250, valueEnd: 380, recordedAt: new Date('2026-06-28'), recordedById: ll1.id },
      { roomId: room101.id, serviceId: svcNuoc1.id, period: jun, valueStart: 22, valueEnd: 33, recordedAt: new Date('2026-06-28'), recordedById: ll1.id },
      // Room 201 (shared, contractCount=2)
      { roomId: room201.id, serviceId: svcDien1b.id, period: may, valueStart: 500, valueEnd: 700, recordedAt: new Date('2026-05-31'), recordedById: ll1.id },
      { roomId: room201.id, serviceId: svcNuoc1b.id, period: may, valueStart: 50, valueEnd: 74, recordedAt: new Date('2026-05-31'), recordedById: ll1.id },
      { roomId: room201.id, serviceId: svcDien1b.id, period: jun, valueStart: 700, valueEnd: 878, recordedAt: new Date('2026-06-28'), recordedById: ll1.id },
      { roomId: room201.id, serviceId: svcNuoc1b.id, period: jun, valueStart: 74, valueEnd: 94, recordedAt: new Date('2026-06-28'), recordedById: ll1.id },
      // Room A01
      { roomId: roomA01.id, serviceId: svcDien2.id, period: may, valueStart: 200, valueEnd: 350, recordedAt: new Date('2026-05-31'), recordedById: ll2.id },
      { roomId: roomA01.id, serviceId: svcNuoc2.id, period: may, valueStart: 20, valueEnd: 32, recordedAt: new Date('2026-05-31'), recordedById: ll2.id },
      { roomId: roomA01.id, serviceId: svcDien2.id, period: jun, valueStart: 350, valueEnd: 490, recordedAt: new Date('2026-06-28'), recordedById: ll2.id },
      { roomId: roomA01.id, serviceId: svcNuoc2.id, period: jun, valueStart: 32, valueEnd: 43, recordedAt: new Date('2026-06-28'), recordedById: ll2.id },
      // Room A02
      { roomId: roomA02.id, serviceId: svcDien2.id, period: may, valueStart: 300, valueEnd: 440, recordedAt: new Date('2026-05-31'), recordedById: ll2.id },
      { roomId: roomA02.id, serviceId: svcNuoc2.id, period: may, valueStart: 30, valueEnd: 41, recordedAt: new Date('2026-05-31'), recordedById: ll2.id },
      { roomId: roomA02.id, serviceId: svcDien2.id, period: jun, valueStart: 440, valueEnd: 580, recordedAt: new Date('2026-06-28'), recordedById: ll2.id },
      { roomId: roomA02.id, serviceId: svcNuoc2.id, period: jun, valueStart: 41, valueEnd: 52, recordedAt: new Date('2026-06-28'), recordedById: ll2.id },
    ]);

    // ── 15. INVOICES + ITEMS ──────────────────────────────────────────────
    const dueJun15 = new Date('2026-06-15');
    const dueJul15 = new Date('2026-07-15');

    // inv1: C1 / Tháng 5 / PAID (4,885,000)
    const inv1 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0001', contractId: c1.id, period: may,
      totalAmount: 4885000, status: InvoiceStatus.PAID, dueDate: dueJun15, paidAt: new Date('2026-06-05'),
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv1.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 4000000, amount: 4000000 },
      { invoiceId: inv1.id, description: 'Tiền điện tháng 5/2026 (150 kWh)', contractServiceId: csC1Dien.id, quantity: 150, unitPrice: 3500, amount: 525000 },
      { invoiceId: inv1.id, description: 'Tiền nước tháng 5/2026 (12 m³)', contractServiceId: csC1Nuoc.id, quantity: 12, unitPrice: 15000, amount: 180000 },
      { invoiceId: inv1.id, description: 'Wifi tháng 5/2026', contractServiceId: csC1Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv1.id, description: 'Gửi xe tháng 5/2026', contractServiceId: csC1Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv2: C2 / Tháng 5 / PAID (3,210,000) — phòng ghép ÷2
    const inv2 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0002', contractId: c2.id, period: may,
      totalAmount: 3210000, status: InvoiceStatus.PAID, dueDate: dueJun15, paidAt: new Date('2026-06-08'),
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv2.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 2500000, amount: 2500000 },
      { invoiceId: inv2.id, description: 'Tiền điện tháng 5/2026 (100 kWh ÷ 2)', contractServiceId: csC2Dien.id, quantity: 100, unitPrice: 3500, amount: 350000 },
      { invoiceId: inv2.id, description: 'Tiền nước tháng 5/2026 (12 m³ ÷ 2)', contractServiceId: csC2Nuoc.id, quantity: 12, unitPrice: 15000, amount: 180000 },
      { invoiceId: inv2.id, description: 'Wifi tháng 5/2026', contractServiceId: csC2Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv2.id, description: 'Gửi xe tháng 5/2026', contractServiceId: csC2Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv3: C3 / Tháng 5 / PAID (3,210,000) — phòng ghép ÷2
    const inv3 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0003', contractId: c3.id, period: may,
      totalAmount: 3210000, status: InvoiceStatus.PAID, dueDate: dueJun15, paidAt: new Date('2026-06-08'),
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv3.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 2500000, amount: 2500000 },
      { invoiceId: inv3.id, description: 'Tiền điện tháng 5/2026 (100 kWh ÷ 2)', contractServiceId: csC3Dien.id, quantity: 100, unitPrice: 3500, amount: 350000 },
      { invoiceId: inv3.id, description: 'Tiền nước tháng 5/2026 (12 m³ ÷ 2)', contractServiceId: csC3Nuoc.id, quantity: 12, unitPrice: 15000, amount: 180000 },
      { invoiceId: inv3.id, description: 'Wifi tháng 5/2026', contractServiceId: csC3Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv3.id, description: 'Gửi xe tháng 5/2026', contractServiceId: csC3Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv4: C5 / Tháng 5 / PAID (5,755,000) — 2 lần partial payment
    const inv4 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0004', contractId: c5.id, period: may,
      totalAmount: 5755000, status: InvoiceStatus.PAID, dueDate: dueJun15, paidAt: new Date('2026-06-10'),
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv4.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 5000000, amount: 5000000 },
      { invoiceId: inv4.id, description: 'Tiền điện tháng 5/2026 (150 kWh)', contractServiceId: csC5Dien.id, quantity: 150, unitPrice: 3500, amount: 525000 },
      { invoiceId: inv4.id, description: 'Tiền nước tháng 5/2026 (12 m³)', contractServiceId: csC5Nuoc.id, quantity: 12, unitPrice: 15000, amount: 180000 },
      { invoiceId: inv4.id, description: 'Vệ sinh tháng 5/2026', contractServiceId: csC5VeSinh.id, quantity: 1, unitPrice: 50000, amount: 50000 },
    ]);

    // inv5: C7 / Tháng 5 / CANCELLED (lần đầu bị hủy)
    const inv5 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0005', contractId: c7.id, period: may,
      totalAmount: 5205000, status: InvoiceStatus.CANCELLED, dueDate: dueJun15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv5.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 4500000, amount: 4500000 },
      { invoiceId: inv5.id, description: 'Tiền điện tháng 5/2026 (140 kWh)', contractServiceId: csC7Dien.id, quantity: 140, unitPrice: 3500, amount: 490000 },
      { invoiceId: inv5.id, description: 'Tiền nước tháng 5/2026 (11 m³)', contractServiceId: csC7Nuoc.id, quantity: 11, unitPrice: 15000, amount: 165000 },
      { invoiceId: inv5.id, description: 'Vệ sinh tháng 5/2026', contractServiceId: csC7VeSinh.id, quantity: 1, unitPrice: 50000, amount: 50000 },
    ]);

    // inv6: C7 / Tháng 5 / PAID (tạo lại sau khi hủy)
    const inv6 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202605-0006', contractId: c7.id, period: may,
      totalAmount: 5205000, status: InvoiceStatus.PAID, dueDate: dueJun15, paidAt: new Date('2026-06-12'),
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv6.id, description: 'Tiền phòng tháng 5/2026', quantity: 1, unitPrice: 4500000, amount: 4500000 },
      { invoiceId: inv6.id, description: 'Tiền điện tháng 5/2026 (140 kWh)', contractServiceId: csC7Dien.id, quantity: 140, unitPrice: 3500, amount: 490000 },
      { invoiceId: inv6.id, description: 'Tiền nước tháng 5/2026 (11 m³)', contractServiceId: csC7Nuoc.id, quantity: 11, unitPrice: 15000, amount: 165000 },
      { invoiceId: inv6.id, description: 'Vệ sinh tháng 5/2026', contractServiceId: csC7VeSinh.id, quantity: 1, unitPrice: 50000, amount: 50000 },
    ]);

    // inv7: C1 / Tháng 6 / UNPAID trong hạn (4,800,000)
    const inv7 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202606-0001', contractId: c1.id, period: jun,
      totalAmount: 4800000, status: InvoiceStatus.UNPAID, dueDate: dueJul15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv7.id, description: 'Tiền phòng tháng 6/2026', quantity: 1, unitPrice: 4000000, amount: 4000000 },
      { invoiceId: inv7.id, description: 'Tiền điện tháng 6/2026 (130 kWh)', contractServiceId: csC1Dien.id, quantity: 130, unitPrice: 3500, amount: 455000 },
      { invoiceId: inv7.id, description: 'Tiền nước tháng 6/2026 (11 m³)', contractServiceId: csC1Nuoc.id, quantity: 11, unitPrice: 15000, amount: 165000 },
      { invoiceId: inv7.id, description: 'Wifi tháng 6/2026', contractServiceId: csC1Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv7.id, description: 'Gửi xe tháng 6/2026', contractServiceId: csC1Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv8: C2 / Tháng 6 / UNPAID quá hạn (3,141,500) — dueDate = 15/6 < today
    const inv8 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202606-0002', contractId: c2.id, period: jun,
      totalAmount: 3141500, status: InvoiceStatus.UNPAID, dueDate: dueJun15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv8.id, description: 'Tiền phòng tháng 6/2026', quantity: 1, unitPrice: 2500000, amount: 2500000 },
      { invoiceId: inv8.id, description: 'Tiền điện tháng 6/2026 (89 kWh ÷ 2)', contractServiceId: csC2Dien.id, quantity: 89, unitPrice: 3500, amount: 311500 },
      { invoiceId: inv8.id, description: 'Tiền nước tháng 6/2026 (10 m³ ÷ 2)', contractServiceId: csC2Nuoc.id, quantity: 10, unitPrice: 15000, amount: 150000 },
      { invoiceId: inv8.id, description: 'Wifi tháng 6/2026', contractServiceId: csC2Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv8.id, description: 'Gửi xe tháng 6/2026', contractServiceId: csC2Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv9: C3 / Tháng 6 / UNPAID quá hạn (3,141,500)
    const inv9 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202606-0003', contractId: c3.id, period: jun,
      totalAmount: 3141500, status: InvoiceStatus.UNPAID, dueDate: dueJun15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv9.id, description: 'Tiền phòng tháng 6/2026', quantity: 1, unitPrice: 2500000, amount: 2500000 },
      { invoiceId: inv9.id, description: 'Tiền điện tháng 6/2026 (89 kWh ÷ 2)', contractServiceId: csC3Dien.id, quantity: 89, unitPrice: 3500, amount: 311500 },
      { invoiceId: inv9.id, description: 'Tiền nước tháng 6/2026 (10 m³ ÷ 2)', contractServiceId: csC3Nuoc.id, quantity: 10, unitPrice: 15000, amount: 150000 },
      { invoiceId: inv9.id, description: 'Wifi tháng 6/2026', contractServiceId: csC3Wifi.id, quantity: 1, unitPrice: 100000, amount: 100000 },
      { invoiceId: inv9.id, description: 'Gửi xe tháng 6/2026', contractServiceId: csC3Xe.id, quantity: 1, unitPrice: 80000, amount: 80000 },
    ]);

    // inv10: C5 / Tháng 6 / UNPAID (5,705,000)
    const inv10 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202606-0004', contractId: c5.id, period: jun,
      totalAmount: 5705000, status: InvoiceStatus.UNPAID, dueDate: dueJul15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv10.id, description: 'Tiền phòng tháng 6/2026', quantity: 1, unitPrice: 5000000, amount: 5000000 },
      { invoiceId: inv10.id, description: 'Tiền điện tháng 6/2026 (140 kWh)', contractServiceId: csC5Dien.id, quantity: 140, unitPrice: 3500, amount: 490000 },
      { invoiceId: inv10.id, description: 'Tiền nước tháng 6/2026 (11 m³)', contractServiceId: csC5Nuoc.id, quantity: 11, unitPrice: 15000, amount: 165000 },
      { invoiceId: inv10.id, description: 'Vệ sinh tháng 6/2026', contractServiceId: csC5VeSinh.id, quantity: 1, unitPrice: 50000, amount: 50000 },
    ]);

    // inv11: C7 / Tháng 6 / UNPAID (5,205,000)
    const inv11 = await mgr.save(Invoice, {
      invoiceNumber: 'HD-202606-0005', contractId: c7.id, period: jun,
      totalAmount: 5205000, status: InvoiceStatus.UNPAID, dueDate: dueJul15,
    });
    await mgr.save(InvoiceItem, [
      { invoiceId: inv11.id, description: 'Tiền phòng tháng 6/2026', quantity: 1, unitPrice: 4500000, amount: 4500000 },
      { invoiceId: inv11.id, description: 'Tiền điện tháng 6/2026 (140 kWh)', contractServiceId: csC7Dien.id, quantity: 140, unitPrice: 3500, amount: 490000 },
      { invoiceId: inv11.id, description: 'Tiền nước tháng 6/2026 (11 m³)', contractServiceId: csC7Nuoc.id, quantity: 11, unitPrice: 15000, amount: 165000 },
      { invoiceId: inv11.id, description: 'Vệ sinh tháng 6/2026', contractServiceId: csC7VeSinh.id, quantity: 1, unitPrice: 50000, amount: 50000 },
    ]);

    // ── 16. PAYMENTS ──────────────────────────────────────────────────────
    await mgr.save(Payment, [
      // inv1 (C1 / Tháng 5) — 1 lần đủ tiền
      { invoiceId: inv1.id, amount: 4885000, paymentDate: new Date('2026-06-05'), paymentMethod: PaymentMethod.TRANSFER, source: PaymentSource.MANUAL, referenceCode: 'TT-20260605-0001', recordedById: ll1.id },
      // inv2 (C2 / Tháng 5)
      { invoiceId: inv2.id, amount: 3210000, paymentDate: new Date('2026-06-08'), paymentMethod: PaymentMethod.CASH, source: PaymentSource.MANUAL, referenceCode: 'TT-20260608-0001', recordedById: ll1.id },
      // inv3 (C3 / Tháng 5)
      { invoiceId: inv3.id, amount: 3210000, paymentDate: new Date('2026-06-08'), paymentMethod: PaymentMethod.CASH, source: PaymentSource.MANUAL, referenceCode: 'TT-20260608-0002', recordedById: ll1.id },
      // inv4 (C5 / Tháng 5) — 2 lần partial payment
      { invoiceId: inv4.id, amount: 3000000, paymentDate: new Date('2026-06-05'), paymentMethod: PaymentMethod.TRANSFER, source: PaymentSource.MANUAL, referenceCode: 'TT-20260605-0002', recordedById: ll2.id },
      { invoiceId: inv4.id, amount: 2755000, paymentDate: new Date('2026-06-10'), paymentMethod: PaymentMethod.CASH, source: PaymentSource.MANUAL, referenceCode: 'TT-20260610-0001', recordedById: ll2.id },
      // inv6 (C7 / Tháng 5, tạo lại sau cancel)
      { invoiceId: inv6.id, amount: 5205000, paymentDate: new Date('2026-06-12'), paymentMethod: PaymentMethod.TRANSFER, source: PaymentSource.MANUAL, referenceCode: 'TT-20260612-0001', recordedById: ll2.id },
    ]);

    // ── 17. AMENDMENTS ────────────────────────────────────────────────────
    // Room 201 — phụ lục đã APPLIED (general, lịch sử)
    const docAmd201 = await mgr.save(ContractDocument, {
      contractId: c2.id, type: DocumentType.AMENDMENT,
      fileName: 'phu-luc-2026-201.pdf', fileUrl: '/uploads/contracts/phu-luc-2026-201.pdf',
      uploadedById: ll1.id,
    });
    await mgr.save(ContractAmendment, {
      contractId: c2.id, documentId: docAmd201.id,
      amendmentType: AmendmentType.GENERAL,
      title: 'Điều chỉnh chung - 01/01/2026',
      effectiveDate: new Date('2026-01-01'),
      isApplied: true,
      notes: 'Điều chỉnh một số điều khoản chung theo thỏa thuận hai bên',
    });

    // Room 101 — phụ lục PENDING (price_adjustment, effectiveDate tương lai)
    const docAmd101 = await mgr.save(ContractDocument, {
      contractId: c1.id, type: DocumentType.AMENDMENT,
      fileName: 'phu-luc-2026-101.pdf', fileUrl: '/uploads/contracts/phu-luc-2026-101.pdf',
      uploadedById: ll1.id,
    });
    const amd101 = await mgr.save(ContractAmendment, {
      contractId: c1.id, documentId: docAmd101.id,
      amendmentType: AmendmentType.PRICE_ADJUSTMENT,
      title: 'Điều chỉnh giá - 01/07/2026',
      effectiveDate: new Date('2026-07-01'),
      isApplied: false,
      newRentAmount: 4200000,
      notes: 'Điều chỉnh giá phòng và giá điện từ tháng 7/2026',
    });
    await mgr.save(ContractAmendmentService, {
      amendmentId: amd101.id,
      contractServiceId: csC1Dien.id,
      newUnitPrice: 3800,
    });
  }
}
