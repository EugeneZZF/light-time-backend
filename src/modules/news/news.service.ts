import { Injectable, NotFoundException } from '@nestjs/common';
import { PublishStatus } from '@prisma/client';
import { prisma } from '../../../prisma/prisma';

@Injectable()
export class NewsService {
  private formatNewsItem(news: {
    id: number;
    slug: string;
    title: string;
    content: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: news.id,
      slug: news.slug,
      title: news.title,
      content: news.content,
      newsDate: news.publishedAt,
      createdAt: news.createdAt,
      updatedAt: news.updatedAt,
    };
  }

  async getNewsList() {
    const items = await prisma.news.findMany({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return items.map((item) => this.formatNewsItem(item));
  }

  async getLatestNews(limit = 10) {
    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 10;

    const items = await prisma.news.findMany({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(normalizedLimit, 1), 50),
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return items.map((item) => this.formatNewsItem(item));
  }

  async getNewsBySlug(slug: string) {
    const item = await prisma.news.findFirst({
      where: { slug, status: PublishStatus.PUBLISHED },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new NotFoundException('News not found');
    }

    return this.formatNewsItem(item);
  }
}
