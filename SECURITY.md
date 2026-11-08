# Security policy

## Reporting a vulnerability

Please do not open a public issue containing a real secret, personal record, or exploit payload that could expose someone else's data. Use GitHub's private vulnerability reporting for this repository when enabled. If private reporting is not available, open a minimal issue asking for a private contact route; do not include the vulnerability details until a private channel is agreed.

## Scope and design

Mahrem is a static browser application. It has no application backend, account system, database, or API. Text processing happens in a dedicated Web Worker and text is not persisted. Custom regex rules run in that disposable worker; long-running scans are terminated. The input limit is 100,000 characters and the custom-rule limit is 200 pattern characters.

The scanner is best-effort pattern matching, not an authorization, DLP, or compliance boundary. False negatives and false positives are possible. Review the cleaned output before sharing. A checksum-valid identifier or account number is not proof that it belongs to a real person.

## Development hygiene

Never add real credentials, personal data, production dumps, or screenshots containing sensitive text to tests, issues, pull requests, or the repository. Use synthetic examples such as `example.invalid` addresses and clearly fake test tokens. Changes to detection rules should include tests for valid and invalid examples.
