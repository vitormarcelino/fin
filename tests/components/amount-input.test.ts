// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountInput } from "@/components/entries/amount-input";
import { parseAmountToCents } from "@/lib/utils/money";

afterEach(cleanup);

function setup(defaultValue?: string) {
  render(createElement(AmountInput, { defaultValue }));
  return screen.getByLabelText("Valor") as HTMLInputElement;
}

describe("AmountInput", () => {
  it("formats typed digits as BRL", async () => {
    const input = setup();
    await userEvent.type(input, "123456");
    expect(input.value).toBe("1.234,56");
    expect(parseAmountToCents(input.value)).toBe(123456);
  });

  it("formats the default value", () => {
    expect(setup("1234.5").value).toBe("1.234,50");
  });

  it("clears when deleting down to zero", async () => {
    const input = setup();
    await userEvent.type(input, "5");
    expect(input.value).toBe("0,05");
    await userEvent.type(input, "{backspace}");
    expect(input.value).toBe("");
  });

  it("ignores non-digits and caps length", async () => {
    const input = setup();
    await userEvent.type(input, "9a9999999999");
    expect(input.value).toBe("9.999.999,99");
  });
});
