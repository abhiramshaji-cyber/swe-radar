import { PRACTICE_PARAGRAPH, coverLetterData } from "../../data/cover-letter";
import type { Posting } from "../types";
import { analyze } from "./ats/analyze";
import { intact } from "./ats/check";
import type { Letter } from "./letter-pdf";

const BASE = coverLetterData.paragraphs;
const greeting = (company: string) =>
  company.trim()
    ? "Dear " + company.trim() + " hiring team,"
    : coverLetterData.greeting;

const roleLine = (p: Posting) =>
  "I'm applying for the " +
  p.title.trim() +
  " role" +
  (p.company.trim() ? " at " + p.company.trim() : "") +
  ".";

function insertAfterFirstSentence(paragraph: string, sentence: string) {
  if (!sentence) return paragraph;
  const cut = paragraph.search(/(?<=\.)\s+(?=[A-Z])/);
  if (cut < 0) return paragraph + " " + sentence;
  return paragraph.slice(0, cut) + " " + sentence + paragraph.slice(cut);
}

const strip = (paragraph: string, inserts: string[]) =>
  inserts.filter(Boolean).reduce(
    (t, s) =>
      t
        .split(" " + s)
        .join("")
        .split(s + " ")
        .join(""),
    paragraph,
  );

export async function tailorLetter(
  p: Posting,
  description: string,
): Promise<Letter> {
  const role = roleLine(p);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { sentence } = await analyze(p, description, attempt > 0);
    const paragraphs = BASE.map((t, i) =>
      i === 0
        ? role + " " + t
        : i === PRACTICE_PARAGRAPH
          ? insertAfterFirstSentence(t, sentence)
          : t,
    );
    if (
      intact(
        BASE,
        paragraphs.map((t) => strip(t, [role, sentence])),
      )
    )
      return {
        greeting: greeting(p.company),
        paragraphs,
        closing: coverLetterData.closing,
        signature: coverLetterData.signature,
      };
  }
  throw new Error("Tailored cover letter changed the base text. Try again.");
}
