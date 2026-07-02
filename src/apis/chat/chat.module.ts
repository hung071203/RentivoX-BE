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
  ],
  controllers: [ChatController],
  providers: [ToolAIService],
})
export class ChatModule {}
