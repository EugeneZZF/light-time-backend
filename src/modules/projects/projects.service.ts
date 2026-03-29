import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { prisma } from '../../../prisma/prisma';
import { ProjectsQueryDto } from './dto/projects-query.dto';

@Injectable()
export class ProjectsService {
  async getProjects(query: ProjectsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      status: PublishStatus.PUBLISHED,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        include: {
          images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
          equipment: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getLatestProject() {
    const project = await prisma.project.findFirst({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      include: {
        images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        equipment: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!project) {
      throw new NotFoundException('No published projects found');
    }

    return project;
  }
}
