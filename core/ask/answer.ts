import { requireDescription } from "../docs/description";
import type { Posting } from "../types";
import { ask } from "./ai";
import { describe } from "./describe";
import { readProfile } from "./profile";

export const STYLE = `Be humble and direct. State concrete wins plainly; a little understated pride is good, bragging is not.
No filler or throat clearing. Never use words or phrases like "excited", "thrilled", "passionate", "leverage", "In today's", "fast-paced", "synergy", "cutting-edge" or "dynamic".
Never use em dashes or en dashes. Use commas, periods or the word "to" instead.`;

const INSTRUCTIONS = `You write answers to job application questions for one candidate. The candidate pastes a question from a job portal; you write the answer they will paste back.

Write as the candidate, in the first person.
Use only facts from the candidate profile and the job description. Never invent experience, employers, numbers, skills or opinions the profile does not support. If the profile has nothing relevant, say so plainly in the candidate's voice instead of making something up.
Tie the answer to this specific company and role, using concrete details from the job description.
${STYLE}
Have a light, warm personality with a touch of wit, while staying professional. Never restate the question.
Match the length the question implies. Default to one short paragraph of three to five sentences. Respect any word or character limit stated in the question.
Output only the answer text: no preamble, no title, no quotes, no markdown.`;

const QUESTION_CHARS = 4000;

export function undash(text: string) {
  return text
    .replace(/^([ \t]*)[‒–—―]+[ \t]*/gm, "$1- ")
    .replace(/(\d)[ \t]*[‒–—―]+[ \t]*(\d)/g, "$1 to $2")
    .replace(/([.,;:!?])[ \t]*[‒–—―]+[ \t]*/g, "$1 ")
    .replace(/[ \t]*[‒–—―]+[ \t]*$/gm, ".")
    .replace(/[ \t]*[‒–—―]+[ \t]*/g, ", ")
    .replace(/(\S) - (\S)/g, "$1, $2")
    .replace(/[ \t]+$/gm, "");
}

export const jobBlock = (p: Posting, description: string) =>
  "<job>\nTitle: " + p.title + "\nCompany: " + p.company + "\nLocation: " + p.location +
  "\n\nDescription:\n" + (description.trim() || "(not available, rely on the title and company only)") + "\n</job>";

const promptFor = (p: Posting, description: string, profile: string, question: string) =>
  [
    "<candidate_profile>\n" + profile.trim() + "\n</candidate_profile>",
    jobBlock(p, description),
    "<question>\n" + question + "\n</question>",
  ].join("\n\n");

export async function askJob(profileFile: string, p: Posting, question: unknown, find = describe) {
  const q = typeof question === "string" ? question.trim().slice(0, QUESTION_CHARS) : "";
  if (!q) throw new Error("Type a question first.");
  const profile = readProfile(profileFile);
  if (!profile.trim()) throw new Error("Add your profile in Options first.");
  const description = requireDescription(await find(p));
  const answer = undash(await ask(INSTRUCTIONS, promptFor(p, description, profile, q)));
  return { answer };
}
