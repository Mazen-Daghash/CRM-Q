import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';
import { AttendanceService } from './attendance.service';
import { LocationPayload } from '@qubix/shared';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('sign-in')
  async signIn(@CurrentUser() user: AuthUser, @Body() body: { location?: LocationPayload }) {
    return this.attendanceService.signIn(user.id, body?.location);
  }

  @Post('sign-out')
  async signOut(@CurrentUser() user: AuthUser, @Body() body: { location?: LocationPayload }) {
    return this.attendanceService.signOut(user.id, body?.location);
  }

  @Get('me')
  async getMyAttendance(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getMyAttendance(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async getDashboard(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.attendanceService.getDashboard(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('monthly-analytics')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async getMonthlyAnalytics(@Query('year') year?: string, @Query('month') month?: string) {
    const currentDate = new Date();
    const targetYear = year ? parseInt(year, 10) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : currentDate.getMonth() + 1;
    return this.attendanceService.getMonthlyAnalytics(targetYear, targetMonth);
  }
}

