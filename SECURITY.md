# Security

## Reporting a vulnerability

Report it privately through GitHub: open the [Security tab](https://github.com/abhiramshaji-cyber/swe-radar/security) and choose **Report a vulnerability**. Do not open a public issue.

Include what an attacker can do, the steps to reproduce, and the commit or version you tested. You will get a reply on the advisory.

## Scope

In scope:

- The stored TypeSafe key, LinkedIn session or profile leaking off the machine or to another local user
- Remote content (a job posting, a board response, a model answer) running code or reaching the file system
- Arguments or prompts passed to the Codex or Claude Code CLI escaping their sandbox
- The launchd agent or installer scripts doing more than they claim

Out of scope:

- Bugs in Electron, Bun, the AI CLIs or TypeSafe themselves; report those upstream
- A job board blocking or rate limiting you
- Anything that needs an attacker who already controls your user account
