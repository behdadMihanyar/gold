import { z } from "zod";
import { normalizeJalaliDate, parseInteger } from "../../utils/numbers.js";

export const SIDES = ["buy", "sell"];
export const STATUSES = ["تسویه نشده", "پرداخت شده", "تحویل شده"];

/** Accepts 12500000, "12,500,000", "12/500/000", "۱۲/۵۰۰/۰۰۰". */
const integerInput = z
  .union([z.number(), z.string()])
  .transform(parseInteger)
  .pipe(z.number({ invalid_type_error: "Must be a number" }).int().finite());

const jalaliDate = z.string().transform((value, ctx) => {
  const normalized = normalizeJalaliDate(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid Jalali date, expected YYYY/MM/DD",
    });
    return z.NEVER;
  }
  return normalized;
});

const optionalText = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v ? v : null));

const blankToUndefined = (v) => (v === "" ? undefined : v);

export const sideParams = z.object({
  side: z.enum(SIDES),
});

export const idParams = sideParams.extend({
  id: z.coerce.number().int().positive(),
});

const orderFields = {
  name: z.string().trim().min(1, "Name is required").max(120),
  quantity: integerInput.pipe(z.number().min(1, "Quantity must be at least 1").max(1_000_000)),
  price: integerInput.pipe(z.number().min(0).max(1e15)),
  date: jalaliDate,
  delivery: optionalText,
  description: optionalText,
  status: z.enum(STATUSES),
  accounting: z.boolean(),
};

export const createOrderBody = z.object({
  ...orderFields,
  status: orderFields.status.default(STATUSES[0]),
  accounting: orderFields.accounting.default(false),
});

export const updateOrderBody = z
  .object(orderFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });

export const listOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  date: z.preprocess(blankToUndefined, jalaliDate.optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
});

export const summaryQuery = z.object({
  date: z.preprocess(blankToUndefined, jalaliDate.optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
});
