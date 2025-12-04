import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async requestLeave(
    userId: string,
    type: LeaveType,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ) {
    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (type === 'SICK') {
      const quota = await this.getSickQuota(userId);
      const hasUsedSickDays = quota.used > 0;
      const hasEnoughQuota = quota.remaining >= days;
      
      // Auto-approve only if user hasn't used any days AND has enough quota
      const autoApprove = !hasUsedSickDays && hasEnoughQuota;
      
      // Allow request even if quota is exhausted (but requires admin approval)
      const request = await this.prisma.leaveRequest.create({
        data: {
          userId,
          type,
          startDate,
          endDate,
          reason,
          status: autoApprove ? 'AUTO_APPROVED' : 'PENDING',
          autoApproved: autoApprove,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // If auto-approved, deduct from quota immediately
      if (autoApprove) {
        await this.updateQuota(userId, type, days);
        
        // Notify user of auto-approval
        const notification = await this.notificationsService.createNotification(
          userId,
          'LEAVE_UPDATE',
          'Sick Leave Auto-Approved',
          `Your sick leave request (${days} day${days > 1 ? 's' : ''}) has been auto-approved`,
          { requestId: request.id, status: 'AUTO_APPROVED' },
        );
        this.notificationsGateway.sendNotification(userId, notification);
      } else {
        // Request requires admin approval - notify all admins
        const admins = await this.prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });

        const userName = user ? `${user.firstName} ${user.lastName}` : 'A user';
        const quotaMessage = hasEnoughQuota 
          ? `(${quota.remaining} days remaining in quota)`
          : `(Quota exhausted - ${quota.used}/${quota.allowance} days used)`;

        // Notify all admins
        for (const admin of admins) {
          const adminNotification = await this.notificationsService.createNotification(
            admin.id,
            'LEAVE_UPDATE',
            'New Sick Leave Request',
            `${userName} requested ${days} sick day${days > 1 ? 's' : ''} ${quotaMessage}. Requires your approval.`,
            { requestId: request.id, status: 'PENDING', type: 'SICK' },
          );
          this.notificationsGateway.sendNotification(admin.id, adminNotification);
        }
      }

      return request;
    } else {
      // VACATION - always requires admin approval
      const quota = await this.getVacationQuota(userId);
      if (quota.remaining < days) {
        throw new BadRequestException(`Insufficient vacation days. Remaining: ${quota.remaining} days in this quarter`);
      }

      const request = await this.prisma.leaveRequest.create({
        data: {
          userId,
          type,
          startDate,
          endDate,
          reason,
          status: 'PENDING',
          autoApproved: false,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return request;
    }
  }

  async approveLeave(requestId: string, approverId: string, comment?: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check quota before approving (only for vacation, sick can be approved even if quota exhausted)
    if (request.type === 'VACATION') {
      const quota = await this.getVacationQuota(request.userId);
      if (quota.remaining < days) {
        throw new BadRequestException(`Cannot approve: User only has ${quota.remaining} vacation days remaining in this quarter`);
      }
    }
    // For SICK days, we allow approval even if quota is exhausted (admin discretion)

    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approverId,
        adminComment: comment,
      },
    });

    // Deduct from quota when approved (for both SICK and VACATION)
    await this.updateQuota(request.userId, request.type, days);

    // Notify user
    const leaveTypeLabel = request.type === 'SICK' ? 'sick' : 'vacation';
    const notificationMessage = request.type === 'VACATION' 
      ? `Your vacation leave request (${days} day${days > 1 ? 's' : ''}) has been approved and deducted from your quarterly quota (5 days per quarter)`
      : `Your sick leave request (${days} day${days > 1 ? 's' : ''}) has been approved`;
    
    const notification = await this.notificationsService.createNotification(
      request.userId,
      'LEAVE_UPDATE',
      'Leave Request Approved',
      notificationMessage,
      { requestId: request.id, status: 'APPROVED' },
    );
    this.notificationsGateway.sendNotification(request.userId, notification);

    return this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async rejectLeave(requestId: string, approverId: string, comment: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approverId,
        adminComment: comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify user
    const notification = await this.notificationsService.createNotification(
      request.userId,
      'LEAVE_UPDATE',
      'Leave Request Rejected',
      `Your ${request.type.toLowerCase()} leave request has been rejected`,
      { requestId: request.id, status: 'REJECTED', comment },
    );
    this.notificationsGateway.sendNotification(request.userId, notification);

    return updated;
  }

  async getMyLeaveRequests(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getMyQuotas(userId: string) {
    const sickQuota = await this.getSickQuota(userId);
    const vacationQuota = await this.getVacationQuota(userId);

    return {
      sick: sickQuota,
      vacation: vacationQuota,
    };
  }

  async getAllLeaveRequests(status?: LeaveStatus) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  private async getSickQuota(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let quota = await this.prisma.leaveQuota.findFirst({
      where: {
        userId,
        type: 'SICK',
        periodStart: { lte: monthEnd },
        periodEnd: { gte: monthStart },
      },
    });

    if (!quota) {
      quota = await this.prisma.leaveQuota.create({
        data: {
          userId,
          type: 'SICK',
          periodStart: monthStart,
          periodEnd: monthEnd,
          allowance: 2,
          used: 0,
        },
      });
    }

    return {
      allowance: quota.allowance,
      used: quota.used,
      remaining: Math.max(0, quota.allowance - quota.used), // Never go below 0
      type: 'SICK' as LeaveType,
    };
  }

  private async getVacationQuota(userId: string) {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);

    // Check if quota exists for current quarter
    let quota = await this.prisma.leaveQuota.findFirst({
      where: {
        userId,
        type: 'VACATION',
        periodStart: { lte: quarterEnd },
        periodEnd: { gte: quarterStart },
      },
    });

    // If no quota exists for current quarter, create a new one (resets quarterly)
    if (!quota) {
      quota = await this.prisma.leaveQuota.create({
        data: {
          userId,
          type: 'VACATION',
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          allowance: 5,
          used: 0,
        },
      });
    }

    return {
      allowance: quota.allowance,
      used: quota.used,
      remaining: Math.max(0, quota.allowance - quota.used), // Never go below 0
      type: 'VACATION' as LeaveType,
    };
  }

  private async getUsedSickDaysThisMonth(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        userId,
        type: 'SICK',
        status: { in: ['APPROVED', 'AUTO_APPROVED'] }, // Count both approved and auto-approved
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
    });

    return requests.reduce((total, req) => {
      const days = Math.ceil((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);
  }

  private async updateQuota(userId: string, type: LeaveType, days: number) {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (type === 'SICK') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    }

    let quota = await this.prisma.leaveQuota.findFirst({
      where: {
        userId,
        type,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });

    if (!quota) {
      const allowance = type === 'SICK' ? 2 : 5;
      quota = await this.prisma.leaveQuota.create({
        data: {
          userId,
          type,
          periodStart,
          periodEnd,
          allowance,
          used: 0,
        },
      });
    }

    await this.prisma.leaveQuota.update({
      where: { id: quota.id },
      data: {
        used: quota.used + days,
      },
    });
  }
}

