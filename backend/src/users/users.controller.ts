import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles("SUPER_ADMIN", "MESS_MANAGER")
  @ApiOperation({
    summary:
      "Get all users. Pass ?includeInactive=true to also show deactivated accounts.",
  })
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.usersService.findAll(includeInactive === "true");
  }

  @Get("roles")
  @ApiOperation({ summary: "Get all roles" })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Put(":id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Update user details" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Deactivate user (soft delete)" })
  deactivate(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.deactivate(id);
  }

  @Post(":id/reactivate")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Reactivate a deactivated user account" })
  reactivate(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.reactivate(id);
  }
}
