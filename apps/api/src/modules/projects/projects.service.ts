import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, MilestoneStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // Projects
  async createProject(
    ownerId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      budget?: number;
    },
  ) {
    const existing = await this.prisma.project.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('Project code already exists');
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        ownerId,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget ? data.budget : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            milestones: true,
            invoices: true,
            tasks: true,
          },
        },
      },
    });
  }

  async getAllProjects() {
    return this.prisma.project.findMany({
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            milestones: true,
            invoices: true,
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestones: {
          orderBy: {
            deadline: 'asc',
          },
        },
        invoices: {
          orderBy: {
            dueDate: 'asc',
          },
        },
        costEntries: {
          orderBy: {
            recordedAt: 'desc',
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  // Milestones
  async createMilestone(
    projectId: string,
    data: {
      name: string;
      description?: string;
      deadline: Date;
    },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.milestone.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        deadline: data.deadline,
        progress: 0,
        status: 'ON_TRACK',
      },
    });
  }

  async updateMilestone(
    milestoneId: string,
    data: {
      name?: string;
      description?: string;
      deadline?: Date;
      progress?: number;
      status?: MilestoneStatus;
    },
  ) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const now = new Date();
    let status = data.status;

    if (data.progress !== undefined) {
      if (data.progress === 100) {
        status = 'COMPLETE';
      } else if (milestone.deadline < now && data.progress < 100) {
        status = 'LATE';
      } else if (milestone.deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 && data.progress < 100) {
        status = 'AT_RISK';
      }
    }

    if (data.deadline) {
      if (data.deadline < now && (data.progress ?? milestone.progress) < 100) {
        status = 'LATE';
      }
    }

    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...data,
        status: status || milestone.status,
        updatedAt: new Date(),
      },
    });
  }

  async getMilestones(projectId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: {
        deadline: 'asc',
      },
    });
  }

  // Invoices
  async createInvoice(
    projectId: string | null,
    data: {
      vendor: string;
      amount: number;
      poNumber?: string;
      dueDate: Date;
      notes?: string;
    },
  ) {
    return this.prisma.invoice.create({
      data: {
        projectId,
        vendor: data.vendor,
        amount: data.amount,
        poNumber: data.poNumber,
        dueDate: data.dueDate,
        notes: data.notes,
        status: 'PENDING',
      },
    });
  }

  async uploadInvoiceFile(invoiceId: string, file: Express.Multer.File) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const storageRoot = this.config.get<string>('storage.root') || './storage';
    const invoicesDir = path.join(storageRoot, 'invoices');
    await fs.mkdir(invoicesDir, { recursive: true });

    const fileExtension = path.extname(file.originalname);
    const fileName = `${invoiceId}${fileExtension}`;
    const filePath = path.join(invoicesDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        fileKey: fileName,
      },
    });
  }

  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        ...(status === 'PAID' && { paidAt: new Date() }),
      },
    });
  }

  async getInvoiceFilePath(invoiceId: string): Promise<string | null> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || !invoice.fileKey) {
      return null;
    }

    const storageRoot = this.config.get<string>('storage.root') || './storage';
    const filePath = path.join(storageRoot, 'invoices', invoice.fileKey);
    
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  async getAllInvoices(projectId?: string, status?: InvoiceStatus) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const now = new Date();
    return invoices.map((invoice) => {
      const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let status = invoice.status;

      if (status === 'PENDING') {
        if (invoice.dueDate < now) {
          status = 'OVERDUE';
        } else if (daysUntilDue <= 7) {
          // Keep as PENDING but will be highlighted orange in frontend
        }
      }

      return {
        ...invoice,
        status,
        daysUntilDue,
      };
    });
  }

  // Cost Control
  async createCostEntry(
    projectId: string,
    data: {
      category: string;
      planned?: number;
      actual?: number;
      reason?: string;
    },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const variance = data.planned && data.actual ? data.actual - data.planned : null;

    return this.prisma.costEntry.create({
      data: {
        projectId,
        category: data.category,
        planned: data.planned ? data.planned : null,
        actual: data.actual ? data.actual : null,
        variance: variance ? variance : null,
        reason: data.reason,
      },
    });
  }

  async getCostControl(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costEntries: {
          orderBy: {
            recordedAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const costEntries = project.costEntries || [];
    const totalPlanned = costEntries.reduce((sum, entry) => sum + (Number(entry.planned) || 0), 0);
    const totalActual = costEntries.reduce((sum, entry) => sum + (Number(entry.actual) || 0), 0);
    const totalVariance = totalActual - totalPlanned;

    const byCategory = costEntries.reduce((acc, entry) => {
      const cat = entry.category;
      if (!acc[cat]) {
        acc[cat] = { planned: 0, actual: 0, variance: 0, count: 0 };
      }
      acc[cat].planned += Number(entry.planned) || 0;
      acc[cat].actual += Number(entry.actual) || 0;
      acc[cat].variance += Number(entry.variance) || 0;
      acc[cat].count++;
      return acc;
    }, {} as Record<string, { planned: number; actual: number; variance: number; count: number }>);

    const monthlyBreakdown = costEntries.reduce((acc, entry) => {
      const month = entry.recordedAt.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { planned: 0, actual: 0 };
      }
      acc[month].planned += Number(entry.planned) || 0;
      acc[month].actual += Number(entry.actual) || 0;
      return acc;
    }, {} as Record<string, { planned: number; actual: number }>);

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        budget: project.budget,
      },
      summary: {
        totalPlanned,
        totalActual,
        totalVariance,
        budget: project.budget ? Number(project.budget) : null,
      },
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        planned: data.planned,
        actual: data.actual,
        variance: data.variance,
        count: data.count,
      })),
      monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, data]) => ({
        month,
        planned: data.planned,
        actual: data.actual,
      })),
      deviations: costEntries
        .filter((entry) => entry.variance && Math.abs(Number(entry.variance)) > 0)
        .map((entry) => ({
          id: entry.id,
          category: entry.category,
          planned: Number(entry.planned),
          actual: Number(entry.actual),
          variance: Number(entry.variance),
          reason: entry.reason,
          recordedAt: entry.recordedAt,
        })),
    };
  }
}


