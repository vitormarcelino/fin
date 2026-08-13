import { z } from "zod";
import { parseAmountToCents } from "@/lib/utils/money";

export const ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;

export const recurringEntryFormSchema = z.object({
  type: z.enum(ENTRY_TYPES, { message: "Selecione receita ou despesa." }),
  description: z
    .string()
    .trim()
    .min(1, "Informe uma descrição.")
    .max(200, "A descrição deve ter no máximo 200 caracteres."),
  dueDay: z.preprocess((val) => {
    if (typeof val !== "string" || val.trim() === "") return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, z.number("Informe um dia entre 1 e 31.").int().min(1).max(31)),
  // Checkbox: present ("on") means the amount is always the same, so
  // `amountCents` below is required; absent means it varies, so generated
  // instances start blank pending confirmation.
  hasFixedAmount: z.preprocess((val) => val === "on" || val === "true", z.boolean()),
  amountCents: z.preprocess((val) => {
    if (typeof val !== "string") return undefined;
    const cents = parseAmountToCents(val);
    return cents ?? undefined;
  }, z.number().int().positive().max(999_999_999, "Valor muito alto.").optional()),
  tagIds: z.array(z.string().uuid()).default([]),
  newTagNames: z.array(z.string().trim().min(1).max(40)).default([]),
}).refine((data) => !data.hasFixedAmount || data.amountCents !== undefined, {
  message: "Informe o valor fixo.",
  path: ["amountCents"],
});

export type RecurringEntryFormInput = z.infer<typeof recurringEntryFormSchema>;

export function recurringEntryFormDataToInput(formData: FormData) {
  return {
    type: formData.get("type"),
    description: formData.get("description"),
    dueDay: formData.get("dueDay"),
    hasFixedAmount: formData.get("hasFixedAmount"),
    amountCents: formData.get("amount"),
    tagIds: formData.getAll("tagIds"),
    newTagNames: formData.getAll("newTagNames"),
  };
}
