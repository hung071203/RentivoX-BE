import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../../../src/apis/admin/users/users.module';
import { AdminDashboardModule } from '../../../src/apis/admin/dashboard/dashboard.module';
import { AdminPropertiesModule } from '../../../src/apis/admin/properties/properties.module';
import { GeminiService } from '../services/gemini.service';
import { ToolAIService } from '../services/tool-ai.service';

@Module({
  imports: [AdminUsersModule, AdminDashboardModule, AdminPropertiesModule],
  providers: [GeminiService, ToolAIService],
  exports: [GeminiService, ToolAIService],
})
export class GeminiModule {}
