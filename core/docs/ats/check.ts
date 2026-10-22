import { resumeData } from "../../../data/resume";
import type { Analysis } from "./analyze";

export const BULLET_CHARS = 100;
export const MIN_BULLETS = 3;
export const MAX_BULLETS = 6;
export const SENTENCE_WORDS = 25;
const HARD_CHARS = BULLET_CHARS + 10;
const HARD_WORDS = SENTENCE_WORDS + 3;
const MAX_LIST_COMMAS = 4;
export const KEYWORDS_PER_BULLET = 2;

const VERBS = ["start", "build", "run", "judge", "gate", "block", "review", "ship", "pass", "test", "check", "merge", "land", "go", "get", "move", "write", "fix", "catch", "split", "plan", "rerun", "enforce", "require", "lock", "verify", "scaffold", "type", "deploy", "reach", "stay", "hold", "lint", "trace", "flag", "route", "pair", "inspect", "use", "resolve", "proceed", "feed", "wire", "cover", "stage", "rebuild", "replay", "compare", "keep", "send", "open", "close", "finish", "begin", "commit", "push", "pull", "sync", "load", "render", "fail", "settle", "loop", "reach", "earn", "clear", "prove", "ground", "isolate", "follow", "flow", "shape", "sharpen", "guard", "drive", "handle", "travel", "stop", "wait", "need", "hit", "enter", "leave", "join", "carry", "turn", "come", "become", "stay", "add", "create", "make", "take", "see", "hand", "own", "plug", "map", "pin", "lift", "draft", "spin", "fan", "queue", "annotate", "document", "measure", "profile", "benchmark", "audit", "harden", "patch", "refactor", "integrate", "connect", "call", "fetch", "serve", "model", "design", "prototype", "validate", "authorize", "authenticate", "reject", "refuse", "pick", "probe", "ban", "mock", "stub", "fuzz", "sign", "encrypt", "hash", "rotate", "bound", "cap", "balance", "chart", "expose", "group", "record", "instrument", "limit", "scope", "tag", "version", "bump", "budget", "cache", "batch", "retry", "built", "written", "caught", "kept", "held", "found", "made", "done", "shown", "chosen", "drawn", "shipped", "tied", "read", "inform", "mirror", "assert", "diff", "simulate", "emulate", "sandbox", "schedule", "throttle", "index", "query", "migrate", "seed", "log", "alert", "monitor", "observe", "wrap", "extract", "parse", "serialize", "encode", "decode", "compress", "stream", "poll", "mount", "bundle", "compile", "link", "release", "revert", "toggle", "shard", "partition", "replicate", "contain", "containerize", "orchestrate", "provision", "scale", "tune", "optimize", "reduce", "cut", "trim", "drop", "skip", "avoid", "prefer", "mark", "label", "name", "share", "reuse", "separate", "decouple", "compose", "extend", "override", "inject", "hydrate", "animate", "prefetch", "preload", "focus", "announce", "describe", "explain", "note", "confirm", "approve", "report", "surface", "show", "hide", "mask", "redact", "sanitize", "escape", "debug", "reproduce", "bisect", "diagnose", "fail", "target", "match", "align", "sort", "filter", "rank", "store", "persist", "encrypt", "decrypt", "zero", "wipe", "isolate"];

const VERB = new RegExp("\\b(" + VERBS.join("|") + ")(s|es|ed|d|ing|ning|ped|ged|ted)?\\b", "i");

const MIN_PROCESS_WORDS = 4;

function explains(text: string, terms: string[], what: string) {
  const rest = without(text, terms);
  const words = rest.split(/[^A-Za-z]+/).filter(Boolean).length;
  return words >= MIN_PROCESS_WORDS && VERB.test(rest) ? [] : [what + " only names skills, say what gets built, tested or checked with them"];
}

export const strings = (x: unknown): string[] =>
  typeof x === "string"
    ? [x]
    : Array.isArray(x)
      ? x.flatMap(strings)
      : x && typeof x === "object"
        ? Object.values(x).flatMap(strings)
        : [];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const singular = (w: string) =>
  /^[A-Z]+s$/.test(w) ? w.slice(0, -1) : /ies$/i.test(w) ? w.slice(0, -3) + "y" : /(ss|us|is)$/i.test(w) ? w : /(sses|xes|zes|ches|shes)$/i.test(w) ? w.slice(0, -2) : /s$/i.test(w) ? w.slice(0, -1) : w;

const plural = (w: string) => (/[^aeiou]y$/i.test(w) ? w.slice(0, -1) + "ies" : /(s|x|z|ch|sh)$/i.test(w) ? w + "es" : w + "s");

const forms = (word: string) => {
  if (!/^[a-z]{3,}$/i.test(word)) return escape(word);
  const one = singular(word);
  return "(?:" + [...new Set([word, one, plural(one)])].sort((a, b) => b.length - a.length).map(escape).join("|") + ")";
};

const phrase = (p: string) => new RegExp("(?<![\\w#+])" + p.trim().split(/[\s-]+/).map(forms).join("[\\s-]+") + "(?![\\w#+])", "i");

export const covered = (term: string, text: string) => phrase(term).test(text);

const without = (text: string, terms: string[]) =>
  [...terms].sort((a, b) => b.length - a.length).reduce((t, m) => t.replace(new RegExp(phrase(m).source, "gi"), " "), text);

const NAMES = [...resumeData.experience.map((e) => e.institution), ...resumeData.projects.map((p) => p.name)];

const HISTORY = [/\byears?\s+of\b/i, /\bexperience\s+(with|in)\b/i, /\bin\s+production\s+at\b/i, /\d|%/];

export function invented(text: string, terms: string[], what: string) {
  const rest = without(text, terms);
  return [
    ...HISTORY.filter((r) => r.test(rest)).map((r) => what + " claims history or a metric (" + rest.match(r)?.[0] + ")"),
    ...NAMES.filter((n) => covered(n, rest)).map((n) => what + " names an employer or client (" + n + ")"),
  ];
}

const flag = (bad: boolean, message: string) => (bad ? [message] : []);

export const maxBullets = (a: Pick<Analysis, "keywords">) =>
  Math.max(MAX_BULLETS, Math.ceil(a.keywords.filter((k) => k.hard).length / KEYWORDS_PER_BULLET));

export function problems(a: Analysis) {
  if (!a.keywords.length) return [];
  const terms = a.keywords.map((k) => k.term);
  const hard = a.keywords.filter((k) => k.hard).map((k) => k.term);
  const all = a.bullets.map((b) => b.text).join("\n");
  const uncovered = hard.filter((term) => !covered(term, all));
  const own = (term: string, text: string) => covered(term, without(text, terms.filter((t) => t.length > term.length && covered(term, t))));
  const repeated = hard.filter((term) => a.bullets.filter((b) => own(term, b.text)).length > 1);
  const most = maxBullets(a);
  return [
    ...flag(a.bullets.length < MIN_BULLETS || a.bullets.length > most, "return " + MIN_BULLETS + " to " + most + " bullets, not " + a.bullets.length),
    ...flag(uncovered.length > 0, "hard keywords missing from the bullets word for word: " + uncovered.join(", ")),
    ...flag(repeated.length > 0, "each hard keyword belongs in one bullet only, these repeat: " + repeated.join(", ")),
    ...a.bullets
      .map((b) => ({ b, owned: hard.filter((term) => own(term, b.text)) }))
      .filter(({ owned }) => owned.length > KEYWORDS_PER_BULLET)
      .map(({ b, owned }) => "at most " + KEYWORDS_PER_BULLET + " hard keywords per bullet, this one stuffs " + owned.join(", ") + ": " + b.text),
    ...a.bullets.filter((b) => b.text.length > HARD_CHARS).map((b) => "bullet is " + b.text.length + " characters, keep it under " + BULLET_CHARS + ": " + b.text),
    ...a.bullets.flatMap((b) => invented(b.text, terms, 'bullet "' + b.text + '"')),
    ...a.bullets.flatMap((b) => explains(b.text, terms, 'bullet "' + b.text + '"')),
  ];
}

export function sentenceProblems(a: Analysis) {
  if (!a.sentence) return [];
  const terms = a.keywords.map((k) => k.term);
  const words = a.sentence.split(/\s+/).length;
  return [
    ...flag(words > HARD_WORDS, "the letter sentence must be at most " + SENTENCE_WORDS + " words, not " + words),
    ...flag((a.sentence.match(/,/g) ?? []).length > MAX_LIST_COMMAS, "the letter sentence reads as a list"),
    ...invented(a.sentence, terms, "sentence"),
    ...explains(a.sentence, terms, "sentence"),
  ];
}

export const intact = (base: unknown, tailored: unknown) => JSON.stringify(base) === JSON.stringify(tailored);
