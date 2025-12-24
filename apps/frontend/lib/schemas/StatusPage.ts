import { z } from "zod";

export const createStatusPageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  logoUrl: z.url().optional(),
  logo: z.string().optional(),
  supportUrl: z.url().optional(),
  announcement: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const updateStatusPageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  logoUrl: z.url().optional(),
  logo: z.string().optional(),
  supportUrl: z.url().optional(),
  announcement: z.string().optional(),
  isPublished: z.boolean().default(false),
});