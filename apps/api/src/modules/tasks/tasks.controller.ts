import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async createTask(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description: string;
      assigneeId: string;
      dueAt: string;
      priority: TaskPriority;
      type: TaskType;
      projectId?: string;
    },
  ) {
    return this.tasksService.createTask(user.id, {
      ...body,
      dueAt: new Date(body.dueAt),
    });
  }

  @Get('me')
  async getMyTasks(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: TaskStatus,
    @Query('type') type?: TaskType,
  ) {
    return this.tasksService.getMyTasks(user.id, status, type);
  }

  @Get('created')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async getCreatedTasks(@CurrentUser() user: AuthUser, @Query('status') status?: TaskStatus) {
    return this.tasksService.getCreatedTasks(user.id, status);
  }

  @Get('team')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async getTeamTasks(@CurrentUser() user: AuthUser, @Query('status') status?: TaskStatus) {
    return this.tasksService.getTeamTasks(user.id, status);
  }

  @Get('all')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async getAllTasks(
    @Query('status') status?: TaskStatus,
    @Query('type') type?: TaskType,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasksService.getAllTasks(status, type, assigneeId);
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title?: string;
      description?: string;
      assigneeId?: string;
      dueAt?: string;
      priority?: TaskPriority;
      type?: TaskType;
      status?: TaskStatus;
    },
  ) {
    const updateData: {
      title?: string;
      description?: string;
      assigneeId?: string;
      dueAt?: Date;
      priority?: TaskPriority;
      type?: TaskType;
      status?: TaskStatus;
    } = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.dueAt !== undefined) updateData.dueAt = new Date(body.dueAt);
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    
    return this.tasksService.updateTask(id, user.id, updateData);
  }

  @Post(':id/complete')
  async completeTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.updateTask(id, user.id, { status: 'COMPLETED' });
  }

  @Post(':id/accept')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async acceptTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.acceptTask(id, user.id);
  }

  @Post(':id/decline')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async declineTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { declineNotes: string },
  ) {
    return this.tasksService.declineTask(id, user.id, body.declineNotes);
  }

  @Post(':id/comments')
  async addComment(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { content: string }) {
    return this.tasksService.addComment(id, user.id, body.content);
  }
}

