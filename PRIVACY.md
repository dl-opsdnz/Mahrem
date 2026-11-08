# Privacy notes

## What Mahrem does with text

Mahrem evaluates text only in the browser tab where you enter it. The page sends the string to a same-origin Web Worker for pattern matching; that worker has no code that makes network requests. The cleaned output is returned to the page. Text is not sent to an application API, persisted to `localStorage`, or included in telemetry by Mahrem. Closing or reloading the tab clears the input from the app's memory.

Copy and TXT download are explicit actions initiated by you. Mahrem stores only interface preferences (language, rule toggles, replacement mode, and custom regex rules) in browser `localStorage` so they can be restored on your device. Clear browser site data to remove these preferences.

## Network requests

The app loads its own static HTML, JavaScript, CSS, icons, and service worker from the site origin. It does not load third-party fonts, remote images, advertising pixels, or analytics scripts. Core application telemetry and analytics are disabled for this deployment.

A hosting platform, reverse proxy, network provider, or CDN may still process ordinary connection metadata (for example, an IP address, requested path, user-agent, and request time) under its own policies. That metadata is outside the text scanner and should not be confused with a promise that every infrastructure log is disabled. The text typed into Mahrem is not attached to those asset requests.

## Local preferences and offline cache

Only settings are stored in `localStorage`; source text and cleaned text are not. After an initial online visit and service-worker activation, the service worker may cache the site's own static shell and same-origin assets for offline use. It ignores non-GET requests and does not cache `/api/` routes. No text is sent in a service-worker request.

## Limitations

Pattern matching can miss values, flag harmless strings, or behave differently across formats. Checksums are used for Turkish ID numbers and IBANs, but a valid checksum does not establish identity or ownership. Custom regular expressions are user-supplied executable patterns: they run in a disposable worker, are limited to 200 characters, and the worker is terminated when a scan exceeds its time budget. Do not use Mahrem as a substitute for a data-loss-prevention system, security review, or professional judgment.

This file describes the application code. Hosting and browser behavior remain subject to their respective privacy policies.
