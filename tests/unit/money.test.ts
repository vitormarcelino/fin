import { describe, expect, it } from "vitest";
import { centsToInputValue, formatCentsToBRL, parseAmountToCents } from "@/lib/utils/money";

describe("parseAmountToCents", () => {
  it("parses a plain integer as reais", () => {
    expect(parseAmountToCents("100")).toBe(10000);
  });

  it("parses plain-dot decimals", () => {
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });

  it("parses pt-BR thousands+decimal shape", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
  });

  it("parses a bare comma as the decimal separator", () => {
    expect(parseAmountToCents("12,5")).toBe(1250);
  });

  it("pads a single decimal digit", () => {
    expect(parseAmountToCents("10.5")).toBe(1050);
  });

  it("rejects zero", () => {
    expect(parseAmountToCents("0")).toBeNull();
  });

  it("rejects negative amounts", () => {
    expect(parseAmountToCents("-10")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(parseAmountToCents("abc")).toBeNull();
  });

  it("rejects empty/whitespace input", () => {
    expect(parseAmountToCents("   ")).toBeNull();
  });

  it("rejects more than two decimal places", () => {
    expect(parseAmountToCents("10.999")).toBeNull();
  });

  it("rejects amounts above the DB constraint ceiling", () => {
    expect(parseAmountToCents("9999999999")).toBeNull();
  });

  it("accepts the exact ceiling", () => {
    expect(parseAmountToCents("9999999.99")).toBe(999_999_999);
  });
});

describe("formatCentsToBRL", () => {
  it("formats cents as a BRL string", () => {
    // Non-breaking space between the symbol and the number, as Intl produces.
    expect(formatCentsToBRL(123456)).toBe("R$ 1.234,56");
  });

  it("formats zero", () => {
    expect(formatCentsToBRL(0)).toBe("R$ 0,00");
  });
});

describe("centsToInputValue", () => {
  it("renders a plain decimal string", () => {
    expect(centsToInputValue(123456)).toBe("1234.56");
  });

  it("pads sub-10-cent amounts", () => {
    expect(centsToInputValue(5)).toBe("0.05");
  });

  it("round-trips through parseAmountToCents", () => {
    const original = 987654;
    expect(parseAmountToCents(centsToInputValue(original))).toBe(original);
  });
});
