import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async findAll(@Query('role') role?: UserRole, @Query('department') department?: string) {
    return this.usersService.findAll(role, department);
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() data: { department?: string; jobTitle?: string; location?: string },
  ) {
    return this.usersService.update(id, data);
  }
}

