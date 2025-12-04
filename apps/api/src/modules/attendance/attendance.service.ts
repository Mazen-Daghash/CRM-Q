import { Injectable, BadRequestException } from '@nestjs/common';
import { AttendanceStatus, LeaveStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LocationPayload } from '@qubix/shared';

@Injectable()
export class AttendanceService {
  private readonly SHIFT_START_HOUR = 9; // 9:00 AM
  private readonly SHIFT_START_MINUTE = 0;
  private readonly LATE_THRESHOLD_MINUTES = 30; // 30 minutes after shift start = late
  private readonly REQUIRED_WORK_HOURS = 8; // 8 hours = 480 minutes

  constructor(private readonly prisma: PrismaService) {}

  async signIn(userId: string, location?: LocationPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Check if user has already signed in today (regardless of sign-out status)
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        signInAt: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already signed in today. You can only sign in once per day.');
    }

    const signInTime = new Date();
    const expectedSignIn = new Date();
    expectedSignIn.setHours(this.SHIFT_START_HOUR, this.SHIFT_START_MINUTE, 0, 0);

    const lateMinutes = Math.max(0, Math.floor((signInTime.getTime() - expectedSignIn.getTime()) / 60000));
    // Late = 30 minutes or more after shift start (9:30 AM or later)
    const status: AttendanceStatus = lateMinutes >= this.LATE_THRESHOLD_MINUTES ? 'LATE' : 'ON_TIME';

    return this.prisma.attendanceRecord.create({
      data: {
        userId,
        signInAt: signInTime,
        signInCity: location?.city,
        signInIp: location?.ip,
        signInDevice: location?.device,
        status,
        lateMinutes: lateMinutes >= this.LATE_THRESHOLD_MINUTES ? lateMinutes : null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async signOut(userId: string, location?: LocationPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Check if user has already signed out today
    const alreadySignedOut = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        signInAt: {
          gte: today,
          lte: todayEnd,
        },
        signOutAt: {
          not: null,
        },
      },
    });

    if (alreadySignedOut) {
      throw new BadRequestException('You have already signed out today. You can only sign out once per day.');
    }

    // Find the active sign-in record for today
    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        signInAt: {
          gte: today,
          lte: todayEnd,
        },
        signOutAt: null,
      },
    });

    if (!record) {
      throw new BadRequestException('No active sign-in found. Please sign in first.');
    }

    const signOutTime = new Date();
    const totalMinutes = Math.floor((signOutTime.getTime() - record.signInAt.getTime()) / 60000);
    const requiredMinutes = this.REQUIRED_WORK_HOURS * 60; // 480 minutes

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        signOutAt: signOutTime,
        signOutCity: location?.city,
        signOutIp: location?.ip,
        signOutDevice: location?.device,
        totalMinutes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getMyAttendance(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.signInAt = {};
      if (startDate) where.signInAt.gte = startDate;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        where.signInAt.lte = endDate;
      }
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: {
        signInAt: 'desc',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getDashboard(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.signInAt = {};
      if (startDate) where.signInAt.gte = startDate;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        where.signInAt.lte = endDate;
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: {
        signInAt: 'desc',
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        signInAt: {
          gte: today,
          lte: todayEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    // Get all active leave requests for today
    const activeLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
        startDate: { lte: todayEnd },
        endDate: { gte: today },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
      },
    });

    const requiredMinutes = this.REQUIRED_WORK_HOURS * 60;

    const todayStatus = allUsers.map((user) => {
      const record = todayRecords.find((r) => r.userId === user.id);
      const leave = activeLeaves.find((l) => l.userId === user.id);

      // If on leave, return leave status
      if (leave) {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(23, 59, 59, 999);
        
        // Calculate total days: inclusive of both start and end dates
        // Dec 4 to Dec 5 = 2 days (Dec 4 and Dec 5)
        const totalLeaveDays = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculate days elapsed: how many days have passed since leave started (inclusive)
        // If today is Dec 4 and leave started Dec 4, daysElapsed = 1
        // If today is Dec 5 and leave started Dec 4, daysElapsed = 2
        const daysElapsed = Math.floor((today.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Days remaining = total days - days elapsed
        // If total = 2, elapsed = 1, remaining = 1
        const daysRemaining = Math.max(0, totalLeaveDays - daysElapsed);

        return {
          user,
          status: 'ON_LEAVE' as any,
          signInAt: null,
          signOutAt: null,
          leave: {
            type: leave.type,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: totalLeaveDays,
            daysRemaining,
            reason: leave.reason,
          },
          signInCity: null,
          signInIp: null,
          signInDevice: null,
          signOutCity: null,
          signOutIp: null,
          signOutDevice: null,
          totalMinutes: null,
          lateMinutes: null,
          completedHours: false,
          signedOutEarly: false,
        };
      }

      // If no record, check if there's a reason (unexcused absence)
      if (!record) {
        return {
          user,
          status: 'MISSED' as AttendanceStatus,
          signInAt: null,
          signOutAt: null,
          leave: null,
          signInCity: null,
          signInIp: null,
          signInDevice: null,
          signOutCity: null,
          signOutIp: null,
          signOutDevice: null,
          totalMinutes: null,
          lateMinutes: null,
          completedHours: false,
          signedOutEarly: false,
          absenceReason: null, // No reason provided = unexcused absence
        };
      }

      // Calculate if they completed required hours
      const completedHours = record.totalMinutes ? record.totalMinutes >= requiredMinutes : false;
      const signedOutEarly = record.signOutAt && record.totalMinutes ? record.totalMinutes < requiredMinutes : false;

      return {
        user,
        status: record.status,
        signInAt: record.signInAt,
        signOutAt: record.signOutAt,
        leave: null,
        signInCity: record.signInCity,
        signInIp: record.signInIp,
        signInDevice: record.signInDevice,
        signOutCity: record.signOutCity,
        signOutIp: record.signOutIp,
        signOutDevice: record.signOutDevice,
        totalMinutes: record.totalMinutes,
        lateMinutes: record.lateMinutes,
        completedHours,
        signedOutEarly,
        absenceReason: null,
      };
    });

    const leaderboard = await this.calculateLeaderboard(startDate, endDate);

    // Calculate daily summary stats
    const onTimeCount = todayStatus.filter((s) => s.status === 'ON_TIME').length;
    const lateCount = todayStatus.filter((s) => s.status === 'LATE').length;
    const missedCount = todayStatus.filter((s) => s.status === 'MISSED').length;
    const onLeaveCount = todayStatus.filter((s) => s.status === 'ON_LEAVE').length;
    const signedOutEarlyCount = todayStatus.filter((s) => s.signedOutEarly === true).length;
    const completedHoursCount = todayStatus.filter((s) => s.completedHours === true).length;

    return {
      todayStatus,
      records,
      leaderboard,
      stats: {
        totalEmployees: allUsers.length,
        signedInToday: todayRecords.length,
        onTimeToday: onTimeCount,
        lateToday: lateCount,
        missedToday: missedCount,
        onLeaveToday: onLeaveCount,
        signedOutEarlyToday: signedOutEarlyCount,
        completedHoursToday: completedHoursCount,
      },
    };
  }

  private async calculateLeaderboard(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.signInAt = {};
      if (startDate) where.signInAt.gte = startDate;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        where.signInAt.lte = endDate;
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: {
        userId: true,
        status: true,
        signInAt: true,
        lateMinutes: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
      },
    });

    const userStats = new Map<
      string,
      { user: any; totalDays: number; onTimeDays: number; totalLateMinutes: number; avgArrival: number[] }
    >();

    records.forEach((record) => {
      const stats = userStats.get(record.userId) || {
        user: record.user,
        totalDays: 0,
        onTimeDays: 0,
        totalLateMinutes: 0,
        avgArrival: [] as number[],
      };

      stats.totalDays++;
      if (record.status === 'ON_TIME') {
        stats.onTimeDays++;
      }
      if (record.lateMinutes) {
        stats.totalLateMinutes += record.lateMinutes;
      }

      const hours = record.signInAt.getHours();
      const minutes = record.signInAt.getMinutes();
      stats.avgArrival.push(hours * 60 + minutes);

      userStats.set(record.userId, stats);
    });

    const leaderboard = Array.from(userStats.values())
      .map((stats) => {
        const onTimePercentage = stats.totalDays > 0 ? (stats.onTimeDays / stats.totalDays) * 100 : 0;
        const avgArrivalMinutes =
          stats.avgArrival.length > 0
            ? stats.avgArrival.reduce((a, b) => a + b, 0) / stats.avgArrival.length
            : 0;
        const avgArrivalTime = `${Math.floor(avgArrivalMinutes / 60)}:${String(Math.floor(avgArrivalMinutes % 60)).padStart(2, '0')}`;

        return {
          user: stats.user,
          onTimePercentage: Math.round(onTimePercentage * 100) / 100,
          totalDays: stats.totalDays,
          onTimeDays: stats.onTimeDays,
          avgArrivalTime,
        };
      })
      .sort((a, b) => b.onTimePercentage - a.onTimePercentage);

    return leaderboard;
  }

  async getMonthlyAnalytics(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all attendance records for the month
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        signInAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    // Get all approved leave requests for the month
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
      },
    });

    // Calculate total work days in the month (excluding weekends)
    const totalWorkDays = this.calculateWorkDays(startDate, endDate);

    // Aggregate stats by user
    const userStats = new Map<
      string,
      {
        user: any;
        onTimeDays: number;
        lateDays: number;
        absentDays: number;
        sickDays: number;
        vacationDays: number;
        totalDays: number;
        totalLateMinutes: number;
        totalWorkMinutes: number;
        completedHoursDays: number;
        signedOutEarlyDays: number;
      }
    >();

    // Initialize all users
    allUsers.forEach((user) => {
      userStats.set(user.id, {
        user,
        onTimeDays: 0,
        lateDays: 0,
        absentDays: 0,
        sickDays: 0,
        vacationDays: 0,
        totalDays: 0,
        totalLateMinutes: 0,
        totalWorkMinutes: 0,
        completedHoursDays: 0,
        signedOutEarlyDays: 0,
      });
    });

    // Process attendance records
    records.forEach((record) => {
      const stats = userStats.get(record.userId);
      if (!stats) return;

      stats.totalDays++;
      if (record.status === 'ON_TIME') {
        stats.onTimeDays++;
      } else if (record.status === 'LATE') {
        stats.lateDays++;
      }

      if (record.lateMinutes) {
        stats.totalLateMinutes += record.lateMinutes;
      }
      if (record.totalMinutes) {
        stats.totalWorkMinutes += record.totalMinutes;
        if (record.totalMinutes >= this.REQUIRED_WORK_HOURS * 60) {
          stats.completedHoursDays++;
        } else if (record.signOutAt) {
          stats.signedOutEarlyDays++;
        }
      }
    });

    // Process leave requests
    leaveRequests.forEach((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      leaveStart.setHours(0, 0, 0, 0);
      leaveEnd.setHours(23, 59, 59, 999);

      // Clamp to month boundaries
      const actualStart = leaveStart < startDate ? startDate : leaveStart;
      const actualEnd = leaveEnd > endDate ? endDate : leaveEnd;

      const leaveDays = this.calculateWorkDays(actualStart, actualEnd);
      const stats = userStats.get(leave.userId);
      if (!stats) return;

      if (leave.type === 'SICK') {
        stats.sickDays += leaveDays;
      } else if (leave.type === 'VACATION') {
        stats.vacationDays += leaveDays;
      }
    });

    // Calculate absent days (work days - attendance - leave)
    userStats.forEach((stats) => {
      const daysAccountedFor = stats.onTimeDays + stats.lateDays + stats.sickDays + stats.vacationDays;
      stats.absentDays = Math.max(0, totalWorkDays - daysAccountedFor);
    });

    // Calculate overall statistics
    const totalOnTimeDays = Array.from(userStats.values()).reduce((sum, s) => sum + s.onTimeDays, 0);
    const totalLateDays = Array.from(userStats.values()).reduce((sum, s) => sum + s.lateDays, 0);
    const totalAbsentDays = Array.from(userStats.values()).reduce((sum, s) => sum + s.absentDays, 0);
    const totalSickDays = Array.from(userStats.values()).reduce((sum, s) => sum + s.sickDays, 0);
    const totalVacationDays = Array.from(userStats.values()).reduce((sum, s) => sum + s.vacationDays, 0);

    const totalEmployeeDays = allUsers.length * totalWorkDays;
    const onTimePercentage = totalEmployeeDays > 0 ? (totalOnTimeDays / totalEmployeeDays) * 100 : 0;
    const latePercentage = totalEmployeeDays > 0 ? (totalLateDays / totalEmployeeDays) * 100 : 0;
    const absentPercentage = totalEmployeeDays > 0 ? (totalAbsentDays / totalEmployeeDays) * 100 : 0;

    // Convert user stats to array and calculate reliability
    const employeeSummaries = Array.from(userStats.values()).map((stats) => {
      const daysAccountedFor = stats.onTimeDays + stats.lateDays + stats.sickDays + stats.vacationDays;
      const reliability = totalWorkDays > 0 ? ((stats.onTimeDays + stats.sickDays + stats.vacationDays) / totalWorkDays) * 100 : 0;

      return {
        ...stats,
        reliability: Math.round(reliability * 100) / 100,
      };
    });

    return {
      month,
      year,
      totalWorkDays,
      summary: {
        totalOnTimeDays,
        totalLateDays,
        totalAbsentDays,
        totalSickDays,
        totalVacationDays,
        onTimePercentage: Math.round(onTimePercentage * 100) / 100,
        latePercentage: Math.round(latePercentage * 100) / 100,
        absentPercentage: Math.round(absentPercentage * 100) / 100,
      },
      employeeSummaries,
    };
  }

  private calculateWorkDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}


