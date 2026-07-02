import { Module } from '@nestjs/common';
import { GeminiModule } from '@lib/shared-modules/gemini.module';
import { ToolAIService } from '@lib/services/tool-ai.service';
import { AdminUsersModule } from '../admin/users/users.module';
import { AdminDashboardModule } from '../admin/dashboard/dashboard.module';
import { AdminPropertiesModule } from '../admin/properties/properties.module';
import { LandlordDashboardModule } from '../landlord/dashboard/dashboard.module';
import { PropertiesModule as LandlordPropertiesModule } from '../landlord/properties/properties.module';
import { RoomsModule } from '../landlord/rooms/rooms.module';
import { TenantsModule } from '../landlord/tenants/tenants.module';
import { ContractsModule } from '../landlord/contracts/contracts.module';
import { InvoicesModule } from '../landlord/invoices/invoices.module';
import { PaymentsModule } from '../landlord/payments/payments.module';
import { TenantDashboardModule } from '../tenant/dashboard/dashboard.module';
import { TenantRoomModule } from '../tenant/room/room.module';
import { TenantContractsModule } from '../tenant/contracts/contracts.module';
import { TenantInvoicesModule } from '../tenant/invoices/invoices.module';
import { TenantPaymentsModule } from '../tenant/payments/payments.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    GeminiModule,
    AdminUsersModule,
    AdminDashboardModule,
    AdminPropertiesModule,
    LandlordDashboardModule,
    LandlordPropertiesModule,
    RoomsModule,
    TenantsModule,
    ContractsModule,
    InvoicesModule,
    PaymentsModule,
    TenantDashboardModule,
    TenantRoomModule,
    TenantContractsModule,
    TenantInvoicesModule,
    TenantPaymentsModule,
  ],
  controllers: [ChatController],
  providers: [ToolAIService],
})
export class ChatModule {}
