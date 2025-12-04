import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { LeaveStatus, LeaveType } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(AuthGuard('jwt'))
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('request')
  async requestLeave(
    @CurrentUser() user: AuthUser,
    @Body() body: { type: LeaveType; startDate: string; endDate: string; reason?: string },
  ) {
    return this.leaveService.requestLeave(
      user.id,
      body.type,
      new Date(body.startDate),
      new Date(body.endDate),
      body.reason,
    );
  }

  @Get('me')
  async getMyLeaveRequests(@CurrentUser() user: AuthUser) {
    return this.leaveService.getMyLeaveRequests(user.id);
  }

  @Get('quotas')
  async getMyQuotas(@CurrentUser() user: AuthUser) {
    return this.leaveService.getMyQuotas(user.id);
  }

  @Get('all')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async getAllLeaveRequests(@Query('status') status?: LeaveStatus) {
    return this.leaveService.getAllLeaveRequests(status);
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { comment?: string },
  ) {
    return this.leaveService.approveLeave(id, user.id, body.comment);
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async rejectLeave(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { comment: string },
  ) {
    return this.leaveService.rejectLeave(id, user.id, body.comment);
  }
}

