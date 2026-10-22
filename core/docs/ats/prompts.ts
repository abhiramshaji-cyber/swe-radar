import { PRACTICE_PARAGRAPH, coverLetterData } from "../../../data/cover-letter";
import { resumeData } from "../../../data/resume";
import { STYLE, jobBlock } from "../../ask/answer";
import type { Posting } from "../../types";
import type { Keyword } from "./analyze";
import { BULLET_CHARS, KEYWORDS_PER_BULLET, MIN_BULLETS, SENTENCE_WORDS, maxBullets } from "./check";

const FILLER = ["implements", "applies", "in view", "industry standards", "best practices", "methodologies", "techniques", "leverages", "ensures"];

export const FIND = `You compare one candidate's resume with one job, for ATS keyword match.
keywords: every requirement the job names that <base_resume> does not already contain word for word, in the job's exact wording ("RESTful APIs", "GraphQL", "React Testing Library", "GitHub Actions", "code review", "headless CMS"). Split lists, "or" and "and" pairs, slash pairs and parentheticals into separate short items ("JavaScript/TypeScript" is two items, "web scraping or data acquisition at scale" is "web scraping" and "data acquisition", "agentic workflows (LLM-based agents)" is "agentic workflows" and "LLM-based agents"); never return a whole sentence fragment as one item. One item per distinct skill: no near duplicates such as "Tauri" and "Tauri 2", and no generic single words such as "test", "computing", "storage" or "branches".
Mark hard true only for what the job requires, not what it calls preferred, a bonus or nice to have: a named product, language, framework, library, tool, platform, protocol or API style; a named practice (CI/CD, code review, Agile, unit and integration testing); or a technical domain the whole role is built around (cryptographic algorithms for a cryptography role, headless CMS for a CMS role). Mark hard false for everything else the job names: preferred and bonus items, broad concepts and architectures (distributed computing, data structures, multi-tenant services, observability), and descriptive or vague phrases (server-side logic, responsive design, authorization, usability, coding standards, design patterns, documentation, scalability). Skip soft skills, degrees, years, benefits and the company's own products.
Plain text only, no markdown.`;

const GROUNDING = `Every tool, process or practice a line mentions must be grounded in the candidate's own resume: <section>, <base_resume> or the job's keywords. Never invent a component, script, team, process, reviewer or tool the candidate has not named.`;

const VOICE = `The lines in <section> were written by the candidate and set the voice. Each new line must read as if the same engineer wrote it:
- one terse fragment of roughly 6 to 14 words, one idea, no semicolons joining two lines, concrete nouns, no hedging, no final period; match the capitalization of <section>
- the concrete practice for that technology: what gets built, tested, checked or refused, and how, so a reader learns something specific about how this engineer works with it
- the keyword read naturally, ideally as the object of a real engineering action, never a passive subject that "gets", "reaches", "passes" or "runs through" a step
- a structure different from every other new line
- new information only: never restate a line already in <section>
- present tense, how the candidate builds with this stack today
${GROUNDING}`;

export const WRITE = `You extend one candidate's resume and cover letter toward one job, for ATS keyword match, without touching any existing text. <keywords> lists what the job asks for that the resume lacks.
1. bullets: ${MIN_BULLETS} or more new lines for the list in <section>, up to the maximum in <limits>.
${VOICE}
Bad, the keyword bolted onto a generic step:
- testing methodologies and security vulnerabilities get handled during development
- code review and design review are part of the process
Good, an engineer saying how the work is done (shape only, never copy them):
- testing methodologies picked per change, property tests for parsers, integration tests for every API
- vetted cryptographic libraries only, never hand-rolled primitives, constant-time comparisons checked in review
- TypeScript in strict mode, no any, untyped JSON rejected at the API edge
Every hard keyword must appear in exactly one line, written exactly as in keywords. At most ${KEYWORDS_PER_BULLET} hard keywords in one line, and two only when they naturally belong together; three or more is stuffing. Soft keywords are optional: use one only where it fits naturally. Each line at most ${BULLET_CHARS} characters.
2. sentence: one natural first person sentence for the cover letter, at most ${SENTENCE_WORDS} words, in the voice of <letter_voice>: the job's most important missing hard keywords and the concrete practice behind them. No list of more than three items. Return "" when there are no keywords.
Prefer a concrete action verb over empty filler such as ${FILLER.join(", ")}, unless one is part of the job's exact keyword. If a hard keyword can only be placed by inventing work the candidate has not done, tie it to a real practice from <section> instead of skipping it. Never invent work history: no "years of", no "experience with", no employer or client names, no "in production at", no numbers or metrics.
${STYLE}
Plain text only, no markdown.`;

export const JUDGE = `You review new lines a tool added to the practices section of one candidate's resume, as a strict senior hiring manager who spots keyword stuffing at a glance. <section> holds the candidate's own lines and sets the voice. For each line in <new_lines>, in order, decide whether it reads like the same engineer wrote it. When in doubt, fail it. A line fails when any of these is true:
- voice: wordy, hedging, empty filler verbs or buzzwords (such as ${FILLER.join(", ")}) standing in for a concrete action, or longer and looser than the lines in <section>
- substance: it does not say a concrete practice specific to that technology (what gets built, tested, checked or refused, and how); a keyword bolted onto a generic step fails
- keyword: the keyword is a passive subject that "gets", "reaches", "passes", "starts in" or "runs through" something, or the line reads as stuffed
- repetition: it restates a line in <section>, or shares a sentence template with another new line
- jargon: a name a recruiter cannot parse, such as an internal script or tool nickname
- invented: it names a tool, process or reviewer the candidate never mentioned
${GROUNDING}
These fail: "security and performance get handled during development" (substance, keyword), "testing methodologies pass the internal gate script" (invented, jargon). These pass: "vetted cryptographic libraries only, never hand-rolled primitives, constant-time comparisons checked in review", "testing methodologies picked per change, property tests for parsers, integration tests for every API".
ok is true only when the line passes all six. When ok is false, issue names the specific problem in a few words, and rewrite is a replacement line that would pass all six: a concrete practice for that technology in the voice of <section>, every keyword from <keywords> the line contains kept word for word, no other keyword, no restating <section>, no numbers, employer or client names, work history or final period. When ok is true, issue and rewrite are "".
${STYLE}
Plain text only, no markdown.`;

const keywordItem = {
  type: "object",
  additionalProperties: false,
  required: ["term", "hard"],
  properties: { term: { type: "string" }, hard: { type: "boolean" } },
};

export const findSchema = {
  type: "object",
  additionalProperties: false,
  required: ["keywords"],
  properties: { keywords: { type: "array", items: keywordItem } },
};

export const writeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["bullets", "sentence"],
  properties: {
    bullets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: { text: { type: "string" } },
      },
    },
    sentence: { type: "string" },
  },
};

export const judgeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ok", "issue", "rewrite"],
        properties: { ok: { type: "boolean" }, issue: { type: "string" }, rewrite: { type: "string" } },
      },
    },
  },
};

export const findPrompt = (base: string, p: Posting, description: string) =>
  "<base_resume>\n" + base + "\n</base_resume>\n\n" + jobBlock(p, description);

export const writePrompt = (keywords: Keyword[], p: Posting, description: string, feedback: string) =>
  [
    "<keywords>\n" + keywords.map((k) => "- " + k.term + (k.hard ? " (hard, must appear word for word)" : " (soft, optional)")).join("\n") + "\n</keywords>",
    "<section>\n" + resumeData.practices.items.map((x) => "- " + x).join("\n") + "\n</section>",
    "<limits>\nat most " + maxBullets({ keywords }) + " lines\n</limits>",
    "<letter_voice>\n" + coverLetterData.paragraphs[PRACTICE_PARAGRAPH] + "\n</letter_voice>",
    jobBlock(p, description),
    feedback && "<fix>\nYour last answer was rejected: " + feedback + "\n</fix>",
  ]
    .filter(Boolean)
    .join("\n\n");

export const judgePrompt = (keywords: Keyword[], lines: string[]) =>
  [
    "<keywords>\n" + keywords.map((k) => "- " + k.term).join("\n") + "\n</keywords>",
    "<section>\n" + resumeData.practices.items.map((x) => "- " + x).join("\n") + "\n</section>",
    "<new_lines>\n" + lines.map((x) => "- " + x).join("\n") + "\n</new_lines>",
  ].join("\n\n");
