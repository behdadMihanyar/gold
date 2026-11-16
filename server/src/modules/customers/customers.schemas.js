import { z } from "zod";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "3–32 characters: a-z, 0-9, dot, dash, underscore");
const fullName = z.string().trim().min(2).max(80);
const phone = z
  .string()
  .trim()
  .max(20)
  .nullish()
  .transform((v) => (v ? v : null));
const password = z.string().min(8, "At least 8 characters").max(72);

export const createCustomerBody = z.object({ username, fullName, phone, password });

export const updateCustomerBody = z
  .object({
    fullName,
    phone,
    isActive: z.boolean(),
    password,
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to update" });

export const idParams = z.object({ id: z.string().uuid() });

export const listCustomersQuery = z.object({
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(100).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
