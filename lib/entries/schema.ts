import { z } from "zod";
import { parseAmountToCents } from "@/lib/utils/money";

export const ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;
export const ENTRY_CLASSIFICATIONS = ["FIXED", "VARIABLE"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EntryClassification = (typeof ENTRY_CLASSIFICATIONS)[number];

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

const amountCentsSchema = z.preprocess((val) => {
  if (typeof val !== "string") return undefined;
  const cents = parseAmountToCents(val);
  return cents ?? undefined;
}, z.number("Informe um valor válido maior que zero.").int().positive().max(999_999_999, "Valor muito alto."));

export const entryFormSchema = z.object({
  type: z.enum(ENTRY_TYPES, { message: "Selecione receita ou despesa." }),
  classification: z.enum(ENTRY_CLASSIFICATIONS, {
    message: "Selecione fixo ou variável.",
  }),
  description: z
    .string()
    .trim()
    .min(1, "Informe uma descrição.")
    .max(200, "A descrição deve ter no máximo 200 caracteres."),
  amountCents: amountCentsSchema,
  date: z
    .string()
    .refine(isValidCalendarDate, "Informe uma data válida."),
  dueDate: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : undefined),
    z.string().refine(isValidCalendarDate, "Informe uma data de vencimento válida.").optional(),
  ),
  notes: z
    .string()
    .trim()
    .max(2000, "As observações devem ter no máximo 2000 caracteres.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  tagIds: z.array(z.string().uuid()).default([]),
  newTagNames: z
    .array(z.string().trim().min(1).max(40))
    .default([]),
});

export type EntryFormInput = z.infer<typeof entryFormSchema>;

/** Quick-edit modal on the entry list: confirm/change the amount and flip
 *  the payment status together, without touching the other fields. */
export const quickEditEntrySchema = z.object({
  amountCents: amountCentsSchema,
  status: z.enum(["PENDING", "PAID"], { message: "Selecione pago ou pendente." }),
});

export type QuickEditEntryInput = z.infer<typeof quickEditEntrySchema>;

/** Extracts the raw shape entryFormSchema expects out of a submitted FormData. */
export function entryFormDataToInput(formData: FormData) {
  return {
    type: formData.get("type"),
    classification: formData.get("classification"),
    description: formData.get("description"),
    amountCents: formData.get("amount"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    tagIds: formData.getAll("tagIds"),
    newTagNames: formData.getAll("newTagNames"),
  };
}
