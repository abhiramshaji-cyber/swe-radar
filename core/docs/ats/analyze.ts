import { openSource, resumeData } from "../../../data/resume";
import { undash } from "../../ask/answer";
import { askJson } from "../../ask/ai";
import type { Posting } from "../../types";
import { covered, invented, problems, sentenceProblems, strings } from "./check";
import { FIND, JUDGE, WRITE, findPrompt, findSchema, judgePrompt, judgeSchema, writePrompt, writeSchema } from "./prompts";

export type Keyword = { term: string; hard: boolean };
export type Bullet = { text: string };
export type Analysis = { keywords: Keyword[]; bullets: Bullet[]; sentence: string };

const ATTEMPTS = 5;
const SLASH_SIDE = 3;

const BASE = strings({ resumeData, openSource }).join("\n");

const text = (x: unknown) => (typeof x === "string" ? undash(x).trim() : "");

const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);

const split = (term: string) => {
  const sides = term.split("/").map((t) => t.trim());
  return sides.length > 1 && sides.every((t) => t.length >= SLASH_SIDE) ? sides : [term];
};

const proper = (line: string, keywords: Keyword[]) => {
  const lead = keywords.find((k) => line.toLowerCase().startsWith(k.term.toLowerCase()));
  return lead ? lead.term + line.slice(lead.term.length) : line;
};

async function find(p: Posting, description: string) {
  const x: any = await askJson(FIND, findPrompt(BASE, p, description), findSchema);
  const found = new Map<string, Keyword>();
  for (const k of list(x?.keywords))
    for (const term of split(text(k?.term)))
      if (term && !covered(term, BASE) && !found.has(term.toLowerCase())) found.set(term.toLowerCase(), { term, hard: k?.hard === true });
  return [...found.values()];
}

async function write(keywords: Keyword[], p: Posting, description: string, feedback: string): Promise<Analysis> {
  const x: any = await askJson(WRITE, writePrompt(keywords, p, description, feedback), writeSchema);
  const bullets = list(x?.bullets)
    .map((b) => ({ text: proper(text(b?.text).replace(/^[•·\-\s]+|[.\s]+$/g, ""), keywords) }))
    .filter((b) => b.text);
  return { keywords, bullets, sentence: text(x?.sentence) };
}

async function judge(a: Analysis) {
  const x: any = await askJson(JUDGE, judgePrompt(a.keywords, a.bullets.map((b) => b.text)), judgeSchema);
  const verdicts = list(x?.lines);
  return a.bullets.flatMap((b, i) =>
    verdicts[i]?.ok === false ? ['bullet "' + b.text + '" ' + (text(verdicts[i].issue) || "does not sound like the section") + ", rewrite it, for example: " + text(verdicts[i].rewrite)] : [],
  );
}

function repair(a: Analysis): Analysis {
  const terms = a.keywords.map((k) => k.term);
  const bullets = a.bullets.filter((b) => !invented(b.text, terms, "").length);
  return { ...a, bullets, sentence: sentenceProblems(a).length ? "" : a.sentence };
}

async function run(p: Posting, description: string): Promise<Analysis> {
  const keywords = await find(p, description);
  if (!keywords.length) return { keywords, bullets: [], sentence: "" };
  let feedback = "";
  let best: { a: Analysis; issues: number } | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const a = await write(keywords, p, description, feedback);
    const bad = problems(a);
    const letter = sentenceProblems(a);
    const voice = bad.length || attempt === ATTEMPTS - 1 ? [] : await judge(a);
    if (!bad.length && !voice.length && !letter.length) return a;
    const fixed = repair(a);
    const issues = problems(fixed).length + voice.length;
    if (fixed.bullets.length && (!best || issues < best.issues)) best = { a: fixed, issues };
    feedback = [...bad, ...voice, ...letter].join("; ") + ".\nYour last bullets were:\n" + a.bullets.map((b) => "- " + b.text).join("\n") + "\nKeep the bullets that passed and change only what fixes these problems.";
  }
  if (best) return best.a;
  throw new Error("Tailoring could not write any bullet without inventing work history (" + feedback.split(".\n")[0] + "). Try again.");
}

const cache = new Map<string, Promise<Analysis>>();

export function analyze(p: Posting, description: string, fresh = false) {
  const id = p.key + "\n" + description;
  let job = cache.get(id);
  if (!job || fresh) {
    job = run(p, description);
    cache.set(id, job);
    job.catch(() => cache.get(id) === job && cache.delete(id));
  }
  return job;
}
