# SWE Radar

A local Electron app that shows recent software engineering job postings for the regions you choose, classified by TypeSafe Jev.

On first launch, open the setup panel, add at least one region and your work country, then refresh. The example resume and cover letter used for tailored documents live in `data/resume.ts` and `data/cover-letter.ts`; edit them with your own details.

```sh
bun install
bun run typecheck
bun test
bun run build
```
