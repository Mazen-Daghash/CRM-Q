import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(role?: UserRole, department?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(department && { department }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        jobTitle: true,
        employeeCode: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        jobTitle: true,
        employeeCode: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tasksAssigned: true,
            tasksCreated: true,
            leaveRequests: true,
            attendance: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, data: { department?: string; jobTitle?: string; location?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        jobTitle: true,
        location: true,
        updatedAt: true,
      },
    });
  }
}


