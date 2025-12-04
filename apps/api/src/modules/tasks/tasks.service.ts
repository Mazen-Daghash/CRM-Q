import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus, TaskType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createTask(
    creatorId: string,
    data: {
      title: string;
      description: string;
      assigneeId: string;
      dueAt: Date;
      priority: TaskPriority;
      type: TaskType;
      projectId?: string;
    },
  ) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator || (creator.role !== 'ADMIN' && creator.role !== 'MANAGER')) {
      throw new ForbiddenException('Only managers and admins can create tasks');
    }

    const assignee = await this.prisma.user.findUnique({ where: { id: data.assigneeId } });
    if (!assignee || assignee.role !== 'JUNIOR') {
      throw new BadRequestException('Tasks can only be assigned to junior employees');
    }

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        createdById: creatorId,
        dueAt: data.dueAt,
        priority: data.priority,
        type: data.type,
        projectId: data.projectId,
        status: 'PENDING',
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.createActivity(task.id, creatorId, 'TASK_CREATED', { title: task.title });

    // Notify assignee
    const notification = await this.notificationsService.createNotification(
      data.assigneeId,
      'TASK_ASSIGNED',
      'New Task Assigned',
      `You have been assigned a new task: "${task.title}"`,
      { taskId: task.id },
    );
    this.notificationsGateway.sendNotification(data.assigneeId, notification);

    return task;
  }

  async updateTask(
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string;
      dueAt?: Date;
      priority?: TaskPriority;
      type?: TaskType;
      status?: TaskStatus;
    },
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { creator: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isCreator = task.createdById === userId;
    const isAdmin = user?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Only task creator or admin can update task');
    }

    if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      if (task.assigneeId !== userId && !isAdmin) {
        throw new ForbiddenException('Only assignee can mark task as completed');
      }
      data.status = 'COMPLETED';
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        updatedAt: new Date(),
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.createActivity(taskId, userId, 'TASK_UPDATED', data);

    // Notify creator when task is completed
    if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      const notification = await this.notificationsService.createNotification(
        task.createdById,
        'TASK_COMPLETED',
        'Task Completed',
        `Task "${task.title}" has been marked as completed`,
        { taskId: task.id },
      );
      this.notificationsGateway.sendNotification(task.createdById, notification);
    }

    return updated;
  }

  async acceptTask(taskId: string, managerId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { creator: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'COMPLETED') {
      throw new BadRequestException('Task must be completed first');
    }

    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    const isCreator = task.createdById === managerId;
    const isAdmin = manager?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Only task creator or admin can accept task');
    }

    // Task stays as COMPLETED, just log the acceptance
    await this.createActivity(taskId, managerId, 'TASK_ACCEPTED', {});

    // Notify assignee
    const notification = await this.notificationsService.createNotification(
      task.assigneeId,
      'TASK_COMPLETED',
      'Task Accepted',
      `Your task "${task.title}" has been accepted`,
      { taskId: task.id },
    );
    this.notificationsGateway.sendNotification(task.assigneeId, notification);

    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async declineTask(taskId: string, managerId: string, declineNotes: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { creator: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'COMPLETED') {
      throw new BadRequestException('Task must be completed first');
    }

    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    const isCreator = task.createdById === managerId;
    const isAdmin = manager?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Only task creator or admin can decline task');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        declineNotes,
        declinedAt: new Date(),
        completedAt: null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.createActivity(taskId, managerId, 'TASK_DECLINED', { notes: declineNotes });

    // Notify assignee
    const notification = await this.notificationsService.createNotification(
      updated.assigneeId,
      'TASK_DECLINED',
      'Task Declined',
      `Your task "${updated.title}" has been declined. Please review the feedback.`,
      { taskId: updated.id, notes: declineNotes },
    );
    this.notificationsGateway.sendNotification(updated.assigneeId, notification);

    return updated;
  }

  async getMyTasks(userId: string, status?: TaskStatus, type?: TaskType) {
    const where: any = { assigneeId: userId };
    if (status) where.status = status;
    if (type) where.type = type;

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async getCreatedTasks(userId: string, status?: TaskStatus) {
    const where: any = { createdById: userId };
    if (status) where.status = status;

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async getTeamTasks(managerId: string, status?: TaskStatus) {
    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || (manager.role !== 'ADMIN' && manager.role !== 'MANAGER')) {
      throw new ForbiddenException('Only managers can view team tasks');
    }

    const where: any = {};
    if (status) where.status = status;

    if (manager.role === 'MANAGER') {
      where.createdById = managerId;
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async getAllTasks(status?: TaskStatus, type?: TaskType, assigneeId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (assigneeId) where.assigneeId = assigneeId;

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async getTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        activities: {
          include: {
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async addComment(taskId: string, userId: string, content: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskComment.create({
      data: {
        taskId,
        authorId: userId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async checkOverdueTasks() {
    const now = new Date();
    const overdue = await this.prisma.task.updateMany({
      where: {
        dueAt: { lt: now },
        status: { notIn: ['COMPLETED', 'OVERDUE'] },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    return { updated: overdue.count };
  }

  private async createActivity(taskId: string, actorId: string, action: string, metadata?: any) {
    return this.prisma.taskActivity.create({
      data: {
        taskId,
        actorId,
        action,
        metadata: metadata || {},
      },
    });
  }
}


