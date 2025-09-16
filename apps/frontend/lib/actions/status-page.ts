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

/**
 * Server action to fetch published status page details
 * @param statusPageId - The ID of the status page to fetch
 * @returns StatusPageDetails or throws notFound() if not found/published
 */
export async function getPublishedStatusPageDetails(statusPageId: string): Promise<StatusPageDetails> {
  if (!statusPageId) {
    notFound();
  }

  try {
    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id: statusPageId,
        isPublished: true, // Only return published status pages
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        logo: true, // This maps to logoLinkUrl
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

/**
 * Server action to check if a status page exists and is published
 * @param statusPageId - The ID of the status page to check
 * @returns boolean indicating if the page exists and is published
 */
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

/**
 * Server action to get basic status page info for navigation
 * @param statusPageId - The ID of the status page
 * @returns Basic info needed for navbar or null if not found/published
 */
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
        logo: true, // This maps to logoLinkUrl
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