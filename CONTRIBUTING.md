# Contributing

Thanks for looking. SWE Radar is early, so bug reports and ideas are as welcome as code.

## Before you write code

Open an issue first, or claim an open one by commenting "I'd like to take this". Wait for a reply before starting anything large, so two people do not build the same thing.

## Standards

- TypeScript strict. ESM. Bun.
- Native built ins and the standard library before a new dependency.
- A pure function beats a class. No Manager, Helper, Service, Factory or Base. No interface with one implementation. No options object for one option.
- Zero prose comments. One lowercase word labelling a block, or nothing. The exceptions are a genuine landmine, a guard against a library bug, or a tooling directive.
- A file over 200 lines splits into a folder named for its job, behind one entry file with the same exports.
- Decisions by meaning go to the AI: is this a software role, does it fit a region, is this a repost. Mechanical facts stay deterministic: ids, dates, math, formatting, filters on fields the AI already returned. No keyword lists standing in for judgment.
- Tests for anything with branches.
- Never commit personal data or a real resume. Fixtures must be synthetic: invented names, companies and contact details.

## Developing

```bash
bun install
bun run dev        # electron app with hot reload
bun test
bun run typecheck
bun run build
```

`bun run dev` uses the same app data folder as the installed app, `~/Library/Application Support/SWE Radar`. Your real settings, store and key are read and written while you develop. Back that folder up before you start.

## Contributor License Agreement

The first time you open a pull request, a bot comments with a link to the [CLA](CLA.md). Reply with the sentence it asks for and you are done, for this and every later pull request.

Why: SWE Radar is AGPL. The CLA lets the maintainer also offer it under other terms, such as a commercial license for a company that cannot ship AGPL code, or a relicense later. Without it, every past contributor would have to agree to each change.

What you keep: the copyright on your work, the right to use it however you like elsewhere, and credit in the git history.

## Pull requests

- One concern per pull request.
- Explain what changed and why in plain language, not in terms only someone who already read the diff would follow.
- If it changes the UI, include a screenshot. Blank out anything personal in it.
- Link the issue with `Closes #n`.
- Title it as a conventional commit: `feat(scope): …`, `fix(scope): …`, `docs: …`.
