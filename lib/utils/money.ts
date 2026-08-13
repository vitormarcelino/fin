/**
 * Money is always stored/passed around as an integer number of cents.
 * Never use float for financial values — parsing/formatting here works
 * on strings and integers only, no floating point division/multiplication
 * of currency amounts.
 */

const MAX_CENTS = 999_999_999; // matches the chk_amount_positive DB constraint

/**
 * Parses a user-typed amount (accepts "1234,56", "1234.56", "1234", with
 * optional thousands separators) into an integer number of cents.
 * Returns null if the input isn't a valid positive amount.
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip thousands separators, normalize decimal separator to '.'.
  // Accepts "1.234,56" (pt-BR) and "1234.56" (plain) shapes.
  let normalized = trimmed;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [intPart, fracPart = ""] = normalized.split(".");
  const fracPadded = (fracPart + "00").slice(0, 2);

  // Guard against unreasonably large strings before converting to Number.
  if (intPart.length > 9) {
    return null;
  }

  const cents = Number(intPart) * 100 + Number(fracPadded);

  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) {
    return null;
  }

  return cents;
}

/** Formats an integer number of cents as a BRL currency string. */
export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Formats cents as a plain decimal string suitable for an input value, e.g. 123456 -> "1234.56". */
export function centsToInputValue(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const fracPart = String(abs % 100).padStart(2, "0");
  return `${sign}${intPart}.${fracPart}`;
}
