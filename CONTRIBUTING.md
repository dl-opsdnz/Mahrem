# Contributing

Thanks for helping improve Mahrem. Small, focused changes are easiest to review.

## Before opening a pull request

1. Install Node.js 20.19+ and pnpm 10.18.0.
2. Run `pnpm install --frozen-lockfile`.
3. Make the change and add or update tests for scanner behavior.
4. Run `pnpm test`, `pnpm check`, and `pnpm build`.
5. Describe behavior changes, privacy implications, and any new false-positive/false-negative trade-offs.

## Privacy and test data

Use synthetic data only. Prefer `example.invalid` domains and visibly fake tokens. Never put real personal data, credentials, private logs, or screenshots of sensitive text in the repository, tests, issues, or pull requests. Do not add external telemetry, remote font/image requests, or network calls that carry user input.

## Code style

Keep scanner logic deterministic and separate from the UI. Keep input text out of browser storage and console output. Any new custom-pattern behavior must retain the worker boundary, length limits, and time limit. If a change affects what is sent or stored, document it in `PRIVACY.md` and explain it in the pull request.
