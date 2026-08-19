import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '@entities/invoice.entity';
import { PaymentProof } from '@entities/payment-proof.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { InvoiceStatus, NotificationType } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { buildVietQrUrl } from '@lib/helpers/vietqr.helper';
import { UploadsService } from '../../../uploads/uploads.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { GetTenantInvoicesDto } from './dto/get-invoices.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(PaymentProof)
    private readonly paymentProofRepo: Repository<PaymentProof>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    private readonly dataSource: DataSource,
    private readonly uploadsService: UploadsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant) throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async findAll(
    dto: GetTenantInvoicesDto,
    user: User,
  ): Promise<PaginatedResult<any>> {
    const tenantId = await this.getTenantId(user.id);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'period';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect([
        'c.id',
        'c.contractNumber',
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
      ])
      .where(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = c.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      );

    if (dto.status) {
      qb.andWhere('inv.status = :status', { status: dto.status });
    }
    if (dto.period) {
      qb.andWhere('inv.period = :period', { period: `${dto.period}-01` });
    }

    qb.orderBy(`inv.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);
    const inv = await this.loadOwnInvoice(id, tenantId);

    const landlordId = inv.contract?.room?.property?.landlordId;
    const landlord = landlordId
      ? await this.dataSource.getRepository(User).findOne({
          where: { id: landlordId },
          select: {
            bankBin: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
          },
        })
      : null;

    const paymentProofs = await this.paymentProofRepo.find({
      where: { invoiceId: id },
      order: { createdAt: 'DESC' },
    });

    const invoiceExtra = inv as Invoice & {
      qrCodeUrl: string | null;
      paymentProofs: PaymentProof[];
    };
    // Chỉ trả QR khi hóa đơn còn cần thanh toán — invoice đã paid/cancelled
    // không còn ý nghĩa để quét chuyển khoản
    invoiceExtra.qrCodeUrl =
      landlord && inv.status === InvoiceStatus.UNPAID
        ? buildVietQrUrl(
            landlord,
            Number(inv.totalAmount),
            inv.invoiceNumber ?? inv.id,
          )
        : null;
    invoiceExtra.paymentProofs = paymentProofs;

    return invoiceExtra;
  }

  async submitPaymentProof(
    id: string,
    user: User,
    file: Express.Multer.File,
    note: string | undefined,
  ): Promise<PaymentProof> {
    try {
      const tenantId = await this.getTenantId(user.id);
      const inv = await this.loadOwnInvoice(id, tenantId);

      if (inv.status !== InvoiceStatus.UNPAID) {
        throw new BadRequestException(
          'Chỉ có thể xác nhận chuyển khoản cho hóa đơn chưa thanh toán',
        );
      }

      const proof = this.paymentProofRepo.create({
        invoiceId: id,
        tenantId,
        proofImageUrl: this.uploadsService.getFileUrl(
          'payment-proofs',
          file.filename,
        ),
        note: note ?? null,
      });
      const saved = await this.paymentProofRepo.save(proof);

      const landlordId = inv.contract?.room?.property?.landlordId;
      if (landlordId) {
        this.notificationsService
          .create({
            userId: landlordId,
            type: NotificationType.PAYMENT_PROOF_SUBMITTED,
            title: 'Khách thuê xác nhận chuyển khoản',
            message: `Khách thuê đã gửi ảnh xác nhận chuyển khoản cho hóa đơn ${inv.invoiceNumber ?? ''}.`,
            data: { invoiceId: inv.id },
          })
          .catch((err: Error) =>
            this.logger.warn(
              `Không gửi được thông báo xác nhận chuyển khoản: ${err.message}`,
            ),
          );
      }

      return saved;
    } catch (error) {
      await this.uploadsService.deleteFile(
        this.uploadsService.getFileUrl('payment-proofs', file.filename),
      );
      throw error;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async loadOwnInvoice(id: string, tenantId: string): Promise<Invoice> {
    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoin('items.contractService', 'cs')
      .leftJoin('cs.service', 'svc')
      .addSelect([
        'c.id',
        'c.contractNumber',
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
        'property.landlordId',
        'cs.id',
        'cs.serviceId',
        'svc.id',
        'svc.name',
        'svc.type',
        'svc.unit',
      ])
      .where('inv.id = :id', { id })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = c.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      )
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    return inv;
  }
}
