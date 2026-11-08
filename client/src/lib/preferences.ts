import {
  BUILT_IN_RULE_IDS,
  isValidCustomRule,
  type CustomRule,
  type ReplacementMode,
} from "./scanner";

export type Language = "tr" | "en";

export interface Preferences {
  language: Language;
  mode: ReplacementMode;
  enabledRuleIds: string[];
  customRules: CustomRule[];
}

const STORAGE_KEY = "mahrem.preferences.v1";
const MODES: ReplacementMode[] = ["mask", "placeholder", "remove"];

export const DEFAULT_PREFERENCES: Preferences = {
  language: "tr",
  mode: "placeholder",
  enabledRuleIds: [...BUILT_IN_RULE_IDS],
  customRules: [],
};

export function loadPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<Preferences>;
    const customRules = Array.isArray(parsed.customRules)
      ? parsed.customRules.filter(isValidCustomRule).slice(0, 20)
      : [];
    const validIds = new Set([
      ...BUILT_IN_RULE_IDS,
      ...customRules.map(rule => rule.id),
    ]);
    return {
      language: parsed.language === "en" ? "en" : "tr",
      mode: MODES.includes(parsed.mode as ReplacementMode)
        ? (parsed.mode as ReplacementMode)
        : DEFAULT_PREFERENCES.mode,
      enabledRuleIds: Array.isArray(parsed.enabledRuleIds)
        ? [
            ...new Set(
              parsed.enabledRuleIds.filter(
                (id): id is string => typeof id === "string" && validIds.has(id)
              )
            ),
          ]
        : [...DEFAULT_PREFERENCES.enabledRuleIds],
      customRules,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    // This object intentionally contains settings only. User text is never passed here.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing modes may disable localStorage; the app still works in memory.
  }
}
