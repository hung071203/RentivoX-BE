import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/user.entity';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { RoomStatus, UserRole } from '@lib/common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
  ) {}

  async getStats() {
    const [totalLandlords, totalTenants, totalProperties, totalRooms, occupiedRooms, topLandlords] =
      await Promise.all([
        this.userRepo.count({ where: { role: UserRole.LANDLORD } }),
        this.userRepo.count({ where: { role: UserRole.TENANT } }),
        this.propertyRepo.count(),
        this.roomRepo.count(),
        this.roomRepo.count({ where: { status: RoomStatus.OCCUPIED } }),
        this.userRepo.manager.query<any[]>(`
          SELECT
            u.id,
            u.full_name   AS fullName,
            u.email,
            COUNT(DISTINCT p.id) AS totalProperties,
            COUNT(r.id)          AS totalRooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) AS occupiedRooms
          FROM users u
          INNER JOIN properties p ON p.landlord_id = u.id
          INNER JOIN rooms r      ON r.property_id = p.id
          WHERE u.role = 'landlord'
          GROUP BY u.id, u.full_name, u.email
          ORDER BY COUNT(r.id) DESC
          LIMIT 5
        `),
      ]);

    return {
      totalLandlords,
      totalTenants,
      totalProperties,
      totalRooms,
      occupiedRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      topLandlords: topLandlords.map((l) => ({
        id: l.id as string,
        fullName: l.fullName as string,
        email: l.email as string,
        totalProperties: Number(l.totalProperties),
        totalRooms: Number(l.totalRooms),
        occupiedRooms: Number(l.occupiedRooms),
      })),
    };
  }
}
