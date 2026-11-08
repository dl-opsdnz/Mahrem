export const MAX_INPUT_LENGTH = 100_000;
export const MAX_MATCHES = 2_000;

export type ReplacementMode = "mask" | "placeholder" | "remove";

export interface CustomRule {
  id: string;
  label: string;
  pattern: string;
  flags: string;
}

export interface ScanSettings {
  enabledRuleIds: string[];
  customRules: CustomRule[];
  mode: ReplacementMode;
}

export interface SensitiveMatch {
  start: number;
  end: number;
  ruleId: string;
  value: string;
  replacement: string;
}

export interface ScanResult {
  sanitized: string;
  matches: SensitiveMatch[];
  counts: Record<string, number>;
}

interface RuleDefinition {
  id: string;
  pattern: string;
  flags?: string;
  priority: number;
  validate?: (value: string) => boolean;
  trim?: (value: string) => string;
}

const BUILT_IN_RULES: RuleDefinition[] = [
  {
    id: "secret",
    pattern: String.raw`(?<![A-Za-z0-9])(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']?[^\s"'<>]{8,})(?![A-Za-z0-9])`,
    flags: "i",
    priority: 0,
  },
  {
    id: "email",
    pattern:
      "(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}(?![A-Z0-9.-])",
    flags: "i",
    priority: 1,
  },
  {
    id: "iban",
    pattern:
      "(?<![A-Z0-9])[A-Z]{2}\\s*\\d{2}(?:[\\s-]*[A-Z0-9]){11,30}(?![A-Z0-9])",
    flags: "i",
    priority: 2,
    validate: isValidIban,
  },
  {
    id: "tckn",
    pattern: "(?<!\\d)[1-9]\\d{10}(?!\\d)",
    priority: 3,
    validate: isValidTurkishId,
  },
  {
    id: "phone",
    pattern:
      "(?<!\\d)(?:\\+\\d{1,3}[\\s().-]*)?(?:0?[\\s().-]*)?(?:\\(?\\d{3}\\)?[\\s().-]*)\\d{3}[\\s.-]*\\d{2}[\\s.-]*\\d{2}(?!\\d)",
    priority: 4,
    validate: isValidPhone,
  },
  {
    id: "ipv4",
    pattern:
      "(?<![\\d.])(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}(?![\\d.])",
    priority: 5,
    validate: isValidIPv4,
  },
  {
    id: "ipv6",
    pattern:
      "(?<![0-9a-f:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7}|::(?:[0-9a-f]{1,4}:?){1,7})(?![0-9a-f:])",
    flags: "i",
    priority: 6,
    validate: isValidIPv6,
  },
  {
    id: "url",
    pattern: String.raw`https?://[^\s<>"']+|www\.[^\s<>"']+`,
    flags: "i",
    priority: 7,
    trim: trimUrlPunctuation,
  },
];

export const BUILT_IN_RULE_IDS = BUILT_IN_RULES.map(rule => rule.id);
export const RULE_LABELS: Record<string, string> = {
  secret: "Secrets and API keys",
  email: "Email addresses",
  phone: "Phone numbers",
  tckn: "Turkish ID numbers",
  iban: "IBANs",
  ipv4: "IPv4 addresses",
  ipv6: "IPv6 addresses",
  url: "URLs",
};

function isValidTurkishId(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === "0") return false;
  const digits = [...value].map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  return (
    (((oddSum * 7 - evenSum) % 10) + 10) % 10 === digits[9] &&
    digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10 ===
      digits[10]
  );
}

function isValidIban(value: string): boolean {
  const iban = value.replace(/[\s-]/g, "").toUpperCase();
  if (
    !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban) ||
    iban.length < 15 ||
    iban.length > 34
  ) {
    return false;
  }
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const character of rearranged) {
    const expanded =
      character >= "A" && character <= "Z"
        ? String(character.charCodeAt(0) - 55)
        : character;
    for (const digit of expanded)
      remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function isValidIPv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every(part => {
      const number = Number(part);
      return Number.isInteger(number) && number >= 0 && number <= 255;
    })
  );
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+"))
    return digits.length >= 10 && digits.length <= 15;
  return (
    digits.length === 10 || (digits.length === 11 && digits.startsWith("0"))
  );
}

function isValidIPv6(value: string): boolean {
  if ((value.match(/::/g) ?? []).length > 1) return false;
  const compressed = value.includes("::");
  const groups = value.split(":").filter(Boolean);
  if (groups.some(group => !/^[0-9a-f]{1,4}$/i.test(group))) return false;
  return compressed ? groups.length < 8 : groups.length === 8;
}

function trimUrlPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && /[.,!?;:)}\]]/.test(value[end - 1])) end -= 1;
  return value.slice(0, end);
}

function regexFlags(flags = ""): string {
  const allowed = new Set(["i", "m", "s", "u"]);
  const normalized = [
    ...new Set(flags.split("").filter(flag => allowed.has(flag))),
  ].join("");
  return `${normalized.includes("u") ? normalized : `${normalized}u`}g`;
}

export function isValidCustomRule(rule: CustomRule): boolean {
  if (
    !rule.id.startsWith("custom-") ||
    !rule.label.trim() ||
    rule.label.length > 32
  )
    return false;
  if (!rule.pattern.trim() || rule.pattern.length > 200) return false;
  if ([...rule.flags].some(flag => !["i", "m", "s", "u"].includes(flag)))
    return false;
  try {
    new RegExp(rule.pattern, regexFlags(rule.flags));
    return true;
  } catch {
    return false;
  }
}

function placeholderFor(ruleId: string, customRules: CustomRule[]): string {
  const custom = customRules.find(rule => rule.id === ruleId);
  const label = custom?.label ?? ruleId;
  const slug = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  return `[${slug || "REDACTED"}]`;
}

export function scanText(text: string, settings: ScanSettings): ScanResult {
  if (text.length > MAX_INPUT_LENGTH) throw new Error("input-too-large");

  const enabled = new Set(settings.enabledRuleIds);
  const customRules = settings.customRules.filter(isValidCustomRule);
  const rules: RuleDefinition[] = BUILT_IN_RULES.filter(rule =>
    enabled.has(rule.id)
  );
  customRules.forEach((rule, index) => {
    if (enabled.has(rule.id)) {
      rules.push({
        id: rule.id,
        pattern: rule.pattern,
        flags: rule.flags,
        priority: BUILT_IN_RULES.length + index,
      });
    }
  });

  const candidates: Array<{
    start: number;
    end: number;
    ruleId: string;
    priority: number;
  }> = [];
  for (const rule of rules) {
    const expression = new RegExp(rule.pattern, regexFlags(rule.flags));
    let match: RegExpExecArray | null;
    while ((match = expression.exec(text)) !== null) {
      if (!match[0].length) {
        expression.lastIndex = match.index + 1;
        continue;
      }
      const raw = match[0];
      const value = rule.trim ? rule.trim(raw) : raw;
      if (value && (!rule.validate || rule.validate(value))) {
        candidates.push({
          start: match.index,
          end: match.index + value.length,
          ruleId: rule.id,
          priority: rule.priority,
        });
        if (candidates.length >= MAX_MATCHES * 4) break;
      }
    }
  }

  candidates.sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      left.priority - right.priority
  );

  const matches: SensitiveMatch[] = [];
  let consumedUntil = -1;
  for (const candidate of candidates) {
    if (candidate.start < consumedUntil) continue;
    const value = text.slice(candidate.start, candidate.end);
    const replacement =
      settings.mode === "mask"
        ? "••••"
        : settings.mode === "remove"
          ? ""
          : placeholderFor(candidate.ruleId, customRules);
    matches.push({ ...candidate, value, replacement });
    consumedUntil = candidate.end;
    if (matches.length >= MAX_MATCHES) break;
  }

  let sanitized = "";
  let cursor = 0;
  const counts: Record<string, number> = {};
  for (const match of matches) {
    sanitized += text.slice(cursor, match.start) + match.replacement;
    cursor = match.end;
    counts[match.ruleId] = (counts[match.ruleId] ?? 0) + 1;
  }
  sanitized += text.slice(cursor);

  return { sanitized, matches, counts };
}
