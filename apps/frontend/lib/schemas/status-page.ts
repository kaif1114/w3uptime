import { z } from "zod";

export const updateStatusPageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  logoUrl: z.string().url().optional(),
  logo: z.string().optional(),
  supportUrl: z.string().url().optional(),
  announcement: z.string().optional(),
  isPublished: z.boolean().default(false),
});