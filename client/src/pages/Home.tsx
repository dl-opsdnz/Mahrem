import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import {
  BUILT_IN_RULE_IDS,
  isValidCustomRule,
  MAX_INPUT_LENGTH,
  type ScanResult,
} from "../lib/scanner";
import { getMessages } from "../lib/i18n";
import {
  loadPreferences,
  savePreferences,
  type Language,
  type Preferences,
} from "../lib/preferences";

const SAMPLE_TEXT = [
  "Support contact: mahrem-demo@example.invalid",
  "Test API key: sk-test-0123456789abcdefghijklmnop",
  "Docs: https://docs.example.invalid/guide?sample=true",
].join("\n");

type ScanState = "idle" | "scanning" | "ready" | "error";

interface WorkerReply {
  id: number;
  result?: ScanResult;
  error?: string;
}

function HighlightedText({
  text,
  matches,
}: {
  text: string;
  matches: ScanResult["matches"];
}) {
  if (!matches.length) return <>{text}</>;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const [index, match] of matches.entries()) {
    pieces.push(
      <span key={`text-${index}`}>{text.slice(cursor, match.start)}</span>
    );
    pieces.push(
      <mark className="sensitive-mark" key={`match-${index}`}>
        {match.value}
      </mark>
    );
    cursor = match.end;
  }
  pieces.push(<span key="text-end">{text.slice(cursor)}</span>);
  return <>{pieces}</>;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `custom-${crypto.randomUUID()}`
    : `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    loadPreferences()
  );
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanError, setScanError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ruleError, setRuleError] = useState("");
  const [online, setOnline] = useState(true);
  const language: Language = preferences.language;
  const m = useMemo(() => getMessages(language), [language]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    if (!text) {
      setResult(null);
      setScanState("idle");
      setScanError("");
      return;
    }
    if (text.length > MAX_INPUT_LENGTH) {
      setResult(null);
      setScanState("error");
      setScanError("input-too-large");
      return;
    }

    const controller = new AbortController();
    let worker: Worker | null = null;
    let timeoutId = 0;
    setScanState("scanning");
    setScanError("");
    const debounceId = window.setTimeout(() => {
      worker = new Worker(
        new URL("../lib/scanner.worker.ts", import.meta.url),
        { type: "module" }
      );
      timeoutId = window.setTimeout(() => {
        worker?.terminate();
        setResult(null);
        setScanError("scan-timeout");
        setScanState("error");
      }, 1_800);

      worker.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
        if (controller.signal.aborted || event.data.id !== 1) return;
        window.clearTimeout(timeoutId);
        worker?.terminate();
        if (event.data.error) {
          setResult(null);
          setScanError(event.data.error);
          setScanState("error");
          return;
        }
        setResult(event.data.result ?? null);
        setScanState("ready");
      });
      worker.addEventListener("error", () => {
        if (controller.signal.aborted) return;
        window.clearTimeout(timeoutId);
        worker?.terminate();
        setResult(null);
        setScanError("scan-failed");
        setScanState("error");
      });
      worker.postMessage({
        id: 1,
        text,
        settings: {
          enabledRuleIds: preferences.enabledRuleIds,
          customRules: preferences.customRules,
          mode: preferences.mode,
        },
      });
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(debounceId);
      window.clearTimeout(timeoutId);
      worker?.terminate();
    };
  }, [text, preferences]);

  const updatePreferences = (patch: Partial<Preferences>) => {
    setPreferences(current => ({ ...current, ...patch }));
  };

  const toggleRule = (ruleId: string) => {
    setPreferences(current => {
      const enabled = new Set(current.enabledRuleIds);
      if (enabled.has(ruleId)) enabled.delete(ruleId);
      else enabled.add(ruleId);
      return { ...current, enabledRuleIds: [...enabled] };
    });
  };

  const copyCleanText = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.sanitized);
      setFeedback(m.copied);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = result.sanitized;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      setFeedback(copied ? m.copied : m.copiedFallback);
    }
    window.setTimeout(() => setFeedback(""), 2_400);
  };

  const downloadCleanText = () => {
    if (!result) return;
    const blob = new Blob([result.sanitized], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mahrem-clean-text.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const addCustomRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRuleError("");
    const trimmedName = ruleName.trim();
    const duplicate = preferences.customRules.some(
      rule => rule.label.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    );
    if (duplicate) {
      setRuleError("duplicate");
      return;
    }
    const customRule = {
      id: makeId(),
      label: trimmedName,
      pattern: rulePattern,
      flags: ignoreCase ? "i" : "",
    };
    if (!isValidCustomRule(customRule)) {
      setRuleError("invalid");
      return;
    }
    if (preferences.customRules.length >= 20) {
      setRuleError("invalid");
      return;
    }
    setPreferences(current => ({
      ...current,
      customRules: [...current.customRules, customRule],
      enabledRuleIds: [...current.enabledRuleIds, customRule.id],
    }));
    setRuleName("");
    setRulePattern("");
  };

  const removeCustomRule = (ruleId: string) => {
    setPreferences(current => ({
      ...current,
      customRules: current.customRules.filter(rule => rule.id !== ruleId),
      enabledRuleIds: current.enabledRuleIds.filter(id => id !== ruleId),
    }));
  };

  const customLabel = (ruleId: string) =>
    preferences.customRules.find(rule => rule.id === ruleId)?.label;
  const categoryLabel = (ruleId: string) => {
    const labels = m.categories as Record<string, string>;
    return customLabel(ruleId) ?? labels[ruleId] ?? ruleId;
  };
  const activeBuiltins = BUILT_IN_RULE_IDS;

  return (
    <div className="site-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Mahrem home">
          <span className="brand-mark" aria-hidden="true">
            <ShieldCheck size={21} strokeWidth={2.2} />
          </span>
          <span className="brand-name">mahrem</span>
          <span className="brand-version">LOCAL FIRST</span>
        </a>
        <div className="topbar-actions">
          <span className="connection-pill">
            {online ? <LockKeyhole size={14} /> : <WifiOff size={14} />}
            {online ? m.online : m.offline}
          </span>
          <button
            className="language-button"
            type="button"
            onClick={() =>
              updatePreferences({ language: language === "tr" ? "en" : "tr" })
            }
            aria-label={
              language === "tr" ? "Switch to English" : "Dili Türkçe yap"
            }
          >
            {language === "tr" ? "EN" : "TR"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              {m.eyebrow}
            </p>
            <h1 id="page-title">
              {m.title.split("\n").map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
            <p className="hero-subtitle">{m.subtitle}</p>
            <div className="trust-row">
              <span className="trust-badge">
                <ShieldCheck size={16} />
                {m.localBadge}
              </span>
              <span className="trust-copy">{m.noAccount}</span>
            </div>
          </div>
          <div className="hero-stamp" aria-hidden="true">
            <span className="stamp-ring">
              <LockKeyhole size={31} strokeWidth={1.7} />
            </span>
            <span className="stamp-caption">
              YOUR TEXT
              <br />
              STAYS HERE
            </span>
          </div>
        </section>

        <section className="tool-section" aria-label={m.inputLabel}>
          <div className="tool-heading">
            <div>
              <div className="step-label">
                <span>01</span> · {m.inputLabel}
              </div>
              <p className="microcopy">{m.inputHint}</p>
            </div>
            <div className="tool-actions">
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setText(SAMPLE_TEXT)}
              >
                <FileText size={15} />
                {m.example}
              </button>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setText("")}
                disabled={!text}
              >
                <Trash2 size={15} />
                {m.clear}
              </button>
            </div>
          </div>
          <label className="sr-only" htmlFor="source-text">
            {m.inputLabel}
          </label>
          <textarea
            id="source-text"
            className="source-textarea"
            value={text}
            onChange={event => setText(event.target.value)}
            maxLength={MAX_INPUT_LENGTH}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={m.inputPlaceholder}
            aria-describedby="input-hint input-count"
          />
          <div className="textarea-footer">
            <span id="input-hint" className="local-note">
              <span className="local-dot" />
              {language === "tr"
                ? "Bu sekmeden dışarı gönderilmez"
                : "Never leaves this tab"}
            </span>
            <span id="input-count" className="character-count">
              {text.length.toLocaleString(
                language === "tr" ? "tr-TR" : "en-US"
              )}{" "}
              / 100,000
            </span>
          </div>
        </section>

        <section className="controls-row" aria-label={m.settings}>
          <div className="mode-control">
            <label htmlFor="replacement-mode">{m.mode}</label>
            <div className="select-wrap">
              <select
                id="replacement-mode"
                value={preferences.mode}
                onChange={event =>
                  updatePreferences({
                    mode: event.target.value as Preferences["mode"],
                  })
                }
              >
                <option value="placeholder">{m.placeholder}</option>
                <option value="mask">{m.mask}</option>
                <option value="remove">{m.remove}</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </div>
          </div>
          <button
            className={`settings-toggle ${settingsOpen ? "is-open" : ""}`}
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="rule-settings"
            onClick={() => setSettingsOpen(open => !open)}
          >
            <span className="settings-toggle-icon">
              <ShieldCheck size={17} />
            </span>
            <span>
              {m.settings}
              <small>{m.settingsHint}</small>
            </span>
            <ChevronDown className="settings-chevron" size={16} />
          </button>
        </section>

        {settingsOpen && (
          <section
            className="settings-panel"
            id="rule-settings"
            aria-label={m.settings}
          >
            <div className="panel-head">
              <div>
                <h2>{m.settings}</h2>
                <p>
                  {language === "tr"
                    ? "Yalnızca seçili kurallar taranır."
                    : "Only selected rules are scanned."}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label={
                  language === "tr" ? "Ayarları kapat" : "Close settings"
                }
              >
                <X size={18} />
              </button>
            </div>
            <div className="rule-list">
              {activeBuiltins.map(ruleId => {
                const enabled = preferences.enabledRuleIds.includes(ruleId);
                const count = result?.counts[ruleId] ?? 0;
                return (
                  <button
                    className={`rule-chip ${enabled ? "rule-enabled" : ""}`}
                    key={ruleId}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => toggleRule(ruleId)}
                  >
                    <span className="rule-check">
                      {enabled && <Check size={12} />}
                    </span>
                    <span>{categoryLabel(ruleId)}</span>
                    {count > 0 && <span className="rule-count">{count}</span>}
                  </button>
                );
              })}
            </div>

            {preferences.customRules.length > 0 && (
              <div className="custom-rules">
                <h3>{m.custom}</h3>
                {preferences.customRules.map(rule => {
                  const enabled = preferences.enabledRuleIds.includes(rule.id);
                  return (
                    <div className="custom-rule-row" key={rule.id}>
                      <button
                        className={`rule-chip ${enabled ? "rule-enabled" : ""}`}
                        type="button"
                        aria-pressed={enabled}
                        onClick={() => toggleRule(rule.id)}
                      >
                        <span className="rule-check">
                          {enabled && <Check size={12} />}
                        </span>
                        <span>{rule.label}</span>
                        {(result?.counts[rule.id] ?? 0) > 0 && (
                          <span className="rule-count">
                            {result?.counts[rule.id]}
                          </span>
                        )}
                      </button>
                      <code className="pattern-preview">
                        /{rule.pattern}/{rule.flags}
                      </code>
                      <button
                        className="remove-rule"
                        type="button"
                        onClick={() => removeCustomRule(rule.id)}
                        aria-label={`${rule.label}: ${language === "tr" ? "kuralı kaldır" : "remove rule"}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <form className="custom-rule-form" onSubmit={addCustomRule}>
              <h3>
                <Plus size={16} />
                {m.addRule}
              </h3>
              <div className="custom-fields">
                <label>
                  {m.ruleName}
                  <input
                    value={ruleName}
                    onChange={event => setRuleName(event.target.value)}
                    maxLength={32}
                    placeholder={m.ruleNamePlaceholder}
                  />
                </label>
                <label>
                  {m.regex}
                  <input
                    value={rulePattern}
                    onChange={event => setRulePattern(event.target.value)}
                    maxLength={200}
                    placeholder={m.regexPlaceholder}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </label>
              </div>
              <div className="form-footer">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ignoreCase}
                    onChange={event => setIgnoreCase(event.target.checked)}
                  />
                  {m.caseInsensitive}
                </label>
                <button
                  className="button button-dark"
                  type="submit"
                  disabled={!ruleName.trim() || !rulePattern.trim()}
                >
                  <Plus size={15} />
                  {m.add}
                </button>
              </div>
              {ruleError && (
                <p className="form-error" role="alert">
                  {ruleError === "duplicate" ? m.duplicateRule : m.invalidRule}
                </p>
              )}
            </form>
            <p className="regex-caution">
              {language === "tr"
                ? "Özel regex'ler yalıtılmış bir worker'da, süre sınırıyla çalışır."
                : "Custom regex runs in an isolated worker with a time limit."}
            </p>
          </section>
        )}

        <section className="results-section" aria-labelledby="results-heading">
          <div className="results-header">
            <div>
              <div className="step-label">
                <span>02</span> · {m.detection}
              </div>
              <h2 id="results-heading">
                {scanState === "ready" && result
                  ? `${result.matches.length} ${m.detected}`
                  : m.detection}
              </h2>
            </div>
            {scanState === "ready" && result && result.matches.length > 0 && (
              <div className="result-actions">
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={downloadCleanText}
                >
                  <Download size={15} />
                  {m.download}
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={copyCleanText}
                >
                  <Clipboard size={15} />
                  {m.copy}
                </button>
              </div>
            )}
          </div>

          {scanState === "idle" && (
            <div className="empty-state">
              <div className="empty-icon">
                <ShieldCheck size={24} />
              </div>
              <p>{m.waiting}</p>
            </div>
          )}
          {scanState === "scanning" && (
            <div className="empty-state scanning-state">
              <span className="scan-pulse" />
              <p>{m.scanning}</p>
            </div>
          )}
          {scanState === "error" && (
            <div className="error-state" role="alert">
              {scanError === "scan-timeout"
                ? m.timeout
                : scanError === "input-too-large"
                  ? m.tooLong
                  : m.scanError}
            </div>
          )}
          {scanState === "ready" && result && result.matches.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <Check size={22} />
              </div>
              <p>{m.noMatches}</p>
            </div>
          )}
          {scanState === "ready" && result && result.matches.length > 0 && (
            <>
              <div className="summary-chips" aria-label={m.detection}>
                {Object.entries(result.counts).map(([ruleId, count]) => (
                  <span className="summary-chip" key={ruleId}>
                    <i />
                    {categoryLabel(ruleId)} <b>{count}</b>
                  </span>
                ))}
              </div>
              <div className="preview-grid">
                <article className="preview-card original-card">
                  <div className="preview-card-head">
                    <span className="preview-label">
                      <span className="preview-dot original-dot" />
                      {m.original}
                    </span>
                    <span className="preview-meta">
                      {result.matches.length}
                    </span>
                  </div>
                  <pre className="preview-content">
                    <HighlightedText text={text} matches={result.matches} />
                  </pre>
                </article>
                <article className="preview-card clean-card">
                  <div className="preview-card-head">
                    <span className="preview-label">
                      <span className="preview-dot clean-dot" />
                      {m.cleaned}
                    </span>
                    <span className="preview-meta">
                      <LockKeyhole size={13} />
                    </span>
                  </div>
                  <pre className="preview-content clean-content">
                    {result.sanitized ||
                      (language === "tr" ? "(boş)" : "(empty)")}
                  </pre>
                </article>
              </div>
            </>
          )}
          {feedback && (
            <p className="feedback-message" role="status">
              <Check size={15} />
              {feedback}
            </p>
          )}
        </section>

        <section
          className="privacy-section"
          id="privacy"
          aria-labelledby="privacy-heading"
        >
          <div className="privacy-main">
            <div className="privacy-icon">
              <LockKeyhole size={19} />
            </div>
            <div>
              <h2 id="privacy-heading">{m.privacyTitle}</h2>
              <p>{m.privacyCopy}</p>
            </div>
          </div>
          <div className="privacy-detail" id="privacy-details">
            <div>
              <span className="privacy-detail-icon">
                <ShieldCheck size={16} />
              </span>
              <h3>{m.limitsTitle}</h3>
              <p>{m.limitsCopy}</p>
            </div>
            <a
              href="#privacy"
              className="privacy-link"
              aria-label={m.privacyLink}
            >
              {m.privacyLink}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="footer-brand" href="#top">
          <span className="brand-mark small-mark">
            <ShieldCheck size={15} />
          </span>
          mahrem
        </a>
        <p>{m.footer}</p>
        <a className="back-top" href="#top">
          ↑ <span>{language === "tr" ? "Başa dön" : "Back to top"}</span>
        </a>
      </footer>
    </div>
  );
}
