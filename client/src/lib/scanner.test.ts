import { describe, expect, it } from "vitest";
import {
  BUILT_IN_RULE_IDS,
  MAX_INPUT_LENGTH,
  scanText,
  type ScanSettings,
} from "./scanner";

const defaults: ScanSettings = {
  enabledRuleIds: [...BUILT_IN_RULE_IDS],
  customRules: [],
  mode: "placeholder",
};

function validTurkishId(firstNine: string): string {
  const digits = [...firstNine].map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenth = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const firstTen = [...digits, tenth];
  const eleventh = firstTen.reduce((sum, digit) => sum + digit, 0) % 10;
  return [...firstTen, eleventh].join("");
}

describe("scanText", () => {
  it("finds emails, Turkish phone numbers and common secret tokens", () => {
    const text =
      "Contact demo@example.invalid · +90 532 123 45 67 · sk-test-0123456789abcdefghijklmnop";
    const result = scanText(text, defaults);

    expect(result.matches.map(match => match.ruleId)).toEqual([
      "email",
      "phone",
      "secret",
    ]);
    expect(result.sanitized).toContain("[EMAIL]");
    expect(result.sanitized).toContain("[PHONE]");
    expect(result.sanitized).toContain("[SECRET]");
    expect(result.matches[0].value).toBe("demo@example.invalid");
  });

  it("validates Turkish ID numbers and IBAN checksums before redacting", () => {
    const id = validTurkishId("123456789");
    const validIban = "TR33 0006 1005 1978 6457 8413 26";
    const invalidIban = "TR00 0006 1005 1978 6457 8413 26";
    const result = scanText(
      `ID ${id}; account ${validIban}; invalid ${invalidIban}`,
      defaults
    );

    expect(result.matches.map(match => match.ruleId)).toEqual(["tckn", "iban"]);
    expect(result.sanitized).toContain("ID [TCKN]");
    expect(result.sanitized).toContain("account [IBAN]");
    expect(result.sanitized).toContain(invalidIban);
  });

  it("rejects invalid national ID and IP checksums/ranges", () => {
    const result = scanText("99999999999 256.256.1.1", defaults);
    expect(result.matches).toHaveLength(0);
  });

  it("validates IPv4 and IPv6, and leaves sentence punctuation after URLs intact", () => {
    const result = scanText(
      "Address 192.168.1.1 and 2001:db8::1. Read https://example.invalid/path.",
      defaults
    );
    expect(result.counts.ipv4).toBe(1);
    expect(result.counts.ipv6).toBe(1);
    expect(result.counts.url).toBe(1);
    expect(result.sanitized).toContain("[URL].");
  });

  it("supports full masking and removal modes", () => {
    const text = "mail demo@example.invalid";
    expect(scanText(text, { ...defaults, mode: "mask" }).sanitized).toBe(
      "mail ••••"
    );
    expect(scanText(text, { ...defaults, mode: "remove" }).sanitized).toBe(
      "mail "
    );
  });

  it("applies custom regexes and labels them with the user's rule name", () => {
    const customRule = {
      id: "custom-invoice",
      label: "Invoice ID",
      pattern: "INV-\\d{6}",
      flags: "i",
    };
    const result = scanText("Invoice INV-123456 is ready", {
      ...defaults,
      enabledRuleIds: [customRule.id],
      customRules: [customRule],
    });

    expect(result.sanitized).toBe("Invoice [INVOICE_ID] is ready");
  });

  it("ignores zero-width custom regex matches without looping", () => {
    const customRule = {
      id: "custom-start",
      label: "Start",
      pattern: "^",
      flags: "",
    };
    const result = scanText("sample", {
      ...defaults,
      enabledRuleIds: [customRule.id],
      customRules: [customRule],
    });
    expect(result.matches).toHaveLength(0);
    expect(result.sanitized).toBe("sample");
  });

  it("throws for input above the documented safety cap", () => {
    expect(() => scanText("x".repeat(MAX_INPUT_LENGTH + 1), defaults)).toThrow(
      "input-too-large"
    );
  });
});
