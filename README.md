# Mahrem

**Share your text. Not your secrets.** Mahrem is a small, open-source text sanitizer that finds common personal data and secrets before you paste text into an issue, support ticket, document, or AI chat.

[Türkçe README](README.tr.md) · [Privacy notes](PRIVACY.md) · [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## Why Mahrem

Most quick redaction tools ask you to upload the very text you want to protect. Mahrem runs its scanner in your browser, in a Web Worker. Text is held in tab memory, is not sent to an application server, and is not written to local storage. The only preferences persisted on your device are language, enabled rules, replacement mode, and custom regex rules.

No account is needed. The app does not include third-party fonts, remote image assets, application analytics, or an API. After its first online load and service-worker activation, the static app shell and same-origin assets are available offline.

## What it detects

- Email addresses and phone-number patterns
- Turkish ID numbers (with checksum validation)
- IBANs (with mod-97 checksum validation)
- IPv4 and IPv6 addresses
- URLs
- Common API keys and secret-token formats
- User-defined regular expressions

Matches can be replaced with a type label such as `[EMAIL]`, masked as `••••`, or removed. The app shows a highlighted original beside the cleaned result. Copying or downloading the cleaned text happens only after you select that action.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.18.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Run the checks and production build with:

```sh
pnpm test
pnpm check
pnpm build
```

`pnpm build` creates a static site in `dist/public`; it needs no server, database, account, or secret key. Serve that directory from any static HTTPS host. HTTPS is required for service-worker/offline support.

## Privacy model and limits

The text-to-result path is entirely client-side. The worker receives the text from the current page and returns match ranges and the cleaned string; it does not make network requests. Input is never stored by Mahrem. Browser memory is cleared when the page is closed or reloaded. Preference storage does not include text.

Detection is heuristic, not a promise that every sensitive value will be found. Validate important results yourself before sharing. Custom regexes can be expensive; they run in a disposable worker, inputs are limited to 100,000 characters, and the worker is terminated if a scan exceeds its time budget. Use only custom patterns you understand.

Like any hosted website, the static host, network provider, or CDN may process ordinary request metadata such as IP address and requested asset path. Mahrem does not send the text you type in those requests. See [PRIVACY.md](PRIVACY.md) for details.

## Built with

React, TypeScript, Vite, Vitest, and Lucide icons. The interface uses system fonts and locally bundled assets; there are no remote font or image requests.

## License

MIT. See [LICENSE](LICENSE).
