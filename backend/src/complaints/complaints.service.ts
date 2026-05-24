import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStudent(studentId: number) {
    return this.prisma.complaint.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async create(dto: CreateComplaintDto, studentId: number) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    const studentName = student ? student.name : 'Unknown Student';
    return this.prisma.complaint.create({
      data: {
        studentId,
        studentName,
        title: dto.title,
        description: dto.description,
        status: 'PENDING',
      },
    });
  }

  async resolve(id: number, wardenId: number) {
    const complaint = await this.findOne(id);
    return this.prisma.complaint.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy: wardenId,
        resolvedAt: new Date(),
      },
    });
  }
}
