import { Module } from "@nestjs/common";
import { LoginActivityService } from "./login-activity.service";
import { LoginActivityController } from "./login-activity.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [LoginActivityController],
  providers: [LoginActivityService],
  exports: [LoginActivityService],
})
export class LoginActivityModule {}
