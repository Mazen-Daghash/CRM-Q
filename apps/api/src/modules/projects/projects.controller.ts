import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { InvoiceStatus, MilestoneStatus } from '@prisma/client';
import { Response } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Projects
  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async createProject(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      startDate: string;
      endDate?: string;
      budget?: number;
    },
  ) {
    return this.projectsService.createProject(user.id, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @Get()
  async getAllProjects() {
    return this.projectsService.getAllProjects();
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectsService.getProject(id);
  }

  // Milestones
  @Post(':id/milestones')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async createMilestone(
    @Param('id') projectId: string,
    @Body() body: { name: string; description?: string; deadline: string },
  ) {
    return this.projectsService.createMilestone(projectId, {
      ...body,
      deadline: new Date(body.deadline),
    });
  }

  @Get(':id/milestones')
  async getMilestones(@Param('id') projectId: string) {
    return this.projectsService.getMilestones(projectId);
  }

  @Patch('milestones/:id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async updateMilestone(
    @Param('id') milestoneId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      deadline?: string;
      progress?: number;
      status?: MilestoneStatus;
    },
  ) {
    return this.projectsService.updateMilestone(milestoneId, {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });
  }

  // Invoices
  @Post('invoices')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async createInvoice(
    @Body()
    body: {
      projectId?: string;
      vendor: string;
      amount: number;
      poNumber?: string;
      dueDate: string;
      notes?: string;
    },
  ) {
    return this.projectsService.createInvoice(body.projectId || null, {
      ...body,
      dueDate: new Date(body.dueDate),
    });
  }

  @Post('invoices/:id/upload')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoiceFile(@Param('id') invoiceId: string, @UploadedFile() file: Express.Multer.File) {
    return this.projectsService.uploadInvoiceFile(invoiceId, file);
  }

  @Patch('invoices/:id/status')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async updateInvoiceStatus(@Param('id') invoiceId: string, @Body() body: { status: InvoiceStatus }) {
    return this.projectsService.updateInvoiceStatus(invoiceId, body.status);
  }

  @Get('invoices')
  async getAllInvoices(@Query('projectId') projectId?: string, @Query('status') status?: InvoiceStatus) {
    return this.projectsService.getAllInvoices(projectId, status);
  }

  @Get('invoices/:id/file')
  async getInvoiceFile(@Param('id') invoiceId: string, @Res() res: Response) {
    const filePath = await this.projectsService.getInvoiceFilePath(invoiceId);
    if (!filePath) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(filePath);
  }

  // Cost Control
  @Post(':id/costs')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(RolesGuard)
  async createCostEntry(
    @Param('id') projectId: string,
    @Body()
    body: {
      category: string;
      planned?: number;
      actual?: number;
      reason?: string;
    },
  ) {
    return this.projectsService.createCostEntry(projectId, body);
  }

  @Get(':id/cost-control')
  async getCostControl(@Param('id') projectId: string) {
    return this.projectsService.getCostControl(projectId);
  }
}

