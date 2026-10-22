import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { renderToFile } from "@react-pdf/renderer";
import { resumeData } from "../../data/resume";
import { describe } from "../ask/describe";
import type { Posting } from "../types";
import { requireDescription } from "./description";
import { tailorLetter } from "./letter";
import { type Letter, LetterPdf } from "./letter-pdf";
import { tailorResume } from "./resume";
import { ResumePdf } from "./resume-pdf";

export const DOC_KINDS = ["resume", "letter"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

const LABEL: Record<DocKind, string> = { resume: "Resume", letter: "Cover Letter" };

const ILLEGAL = /[/\\:*?"<>|\p{Cc}\p{Cf}]+/gu;

export const docName = (company: string, kind: DocKind) => {
  const who = company.normalize("NFC").replace(ILLEGAL, " ").replace(/\s+/g, " ").slice(0, 80).replace(/^[\s.]+|[\s.]+$/g, "");
  return [who, resumeData.name, LABEL[kind]].filter(Boolean).join(" ") + ".pdf";
};

export type Describer = (p: Posting) => Promise<string>;

const letters = new Map<string, Promise<Letter>>();

const described = async (p: Posting, find: Describer) => requireDescription(await find(p));

function letterFor(p: Posting, find: Describer) {
  const id = p.key;
  let job = letters.get(id);
  if (!job) {
    job = described(p, find).then((d) => tailorLetter(p, d));
    letters.set(id, job);
    job.catch(() => letters.get(id) === job && letters.delete(id));
  }
  return job;
}

export const letterText = async (p: Posting, find: Describer = describe) => {
  const l = await letterFor(p, find);
  return [l.greeting, ...l.paragraphs, l.closing, l.signature].join("\n\n");
};

async function render(p: Posting, kind: DocKind, find: Describer) {
  if (kind === "letter") return <LetterPdf letter={await letterFor(p, find)} />;
  return <ResumePdf data={await tailorResume(p, await described(p, find))} />;
}

async function build(dir: string, p: Posting, kind: DocKind, find: Describer) {
  const doc = await render(p, kind, find);
  const file = path.join(dir, docName(p.company, kind));
  const tmp = path.join(dir, "." + randomUUID() + ".pdf.part");
  fs.mkdirSync(dir, { recursive: true });
  try {
    await renderToFile(doc, tmp);
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return file;
}

const inFlight = new Map<string, Promise<string>>();

export function makeDoc(dir: string, p: Posting, kind: DocKind, find: Describer = describe) {
  const id = p.key + "\n" + kind;
  let job = inFlight.get(id);
  if (!job) {
    job = build(dir, p, kind, find).finally(() => inFlight.delete(id));
    inFlight.set(id, job);
  }
  return job;
}
