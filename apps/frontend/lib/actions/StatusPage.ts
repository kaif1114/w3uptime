'use server';

import { notFound } from 'next/navigation';
import { prisma } from 'db/client';

export interface StatusPageDetails {
  id: string;
  name: string;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  supportUrl: string | null;
  announcement: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}


export async function getPublishedStatusPageDetails(statusPageId: string): Promise<StatusPageDetails> {
  if (!statusPageId) {
    notFound();
  }

  try {
    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id: statusPageId,
        isPublished: true, 
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        logo: true, 
        supportUrl: true,
        announcement: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!statusPage) {
      notFound();
    }

    return {
      id: statusPage.id,
      name: statusPage.name,
      logoUrl: statusPage.logoUrl,
      logoLinkUrl: statusPage.logo,
      supportUrl: statusPage.supportUrl,
      announcement: statusPage.announcement,
      isPublished: statusPage.isPublished,
      createdAt: statusPage.createdAt.toISOString(),
      updatedAt: statusPage.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching status page details:', error);
    notFound();
  }
}


export async function isStatusPagePublished(statusPageId: string): Promise<boolean> {
  if (!statusPageId) {
    return false;
  }

  try {
    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id: statusPageId,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    return !!statusPage;
  } catch (error) {
    console.error('Error checking status page publication status:', error);
    return false;
  }
}


export async function getStatusPageNavInfo(statusPageId: string): Promise<{
  id: string;
  name: string;
  logoUrl: string | null;
  logoLinkUrl: string | null;
} | null> {
  if (!statusPageId) {
    return null;
  }

  try {
    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id: statusPageId,
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        logo: true, 
      },
    });

    if (!statusPage) {
      return null;
    }

    return {
      id: statusPage.id,
      name: statusPage.name,
      logoUrl: statusPage.logoUrl,
      logoLinkUrl: statusPage.logo,
    };
  } catch (error) {
    console.error('Error fetching status page nav info:', error);
    return null;
  }
}