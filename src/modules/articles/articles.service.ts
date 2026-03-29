import { Injectable, NotFoundException } from '@nestjs/common';
import { PublishStatus } from '@prisma/client';
import { prisma } from '../../../prisma/prisma';

@Injectable()
export class ArticlesService {
  private formatArticleItem(article: {
    id: number;
    slug: string;
    title: string;
    content: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      content: article.content,
      articleDate: article.publishedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  async getArticlesList() {
    const items = await prisma.article.findMany({
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

    return items.map((item) => this.formatArticleItem(item));
  }

  async getLatestArticles(limit = 10) {
    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 10;

    const items = await prisma.article.findMany({
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

    return items.map((item) => this.formatArticleItem(item));
  }

  async getArticleBySlug(slug: string) {
    const item = await prisma.article.findFirst({
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
      throw new NotFoundException('Article not found');
    }

    return this.formatArticleItem(item);
  }
}
