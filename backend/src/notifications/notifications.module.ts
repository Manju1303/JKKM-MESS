import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule],
  providers: [NotificationsService, EmailService],
  controllers: [NotificationsController],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
