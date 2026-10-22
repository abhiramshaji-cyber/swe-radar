import { resumeData } from "../../data/resume";
import type { Posting } from "../types";
import { analyze } from "./ats/analyze";
import { intact } from "./ats/check";
import type { Resume } from "./resume-pdf";

const count = resumeData.practices.items.length;

export async function tailorResume(p: Posting, description: string): Promise<Resume> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const a = await analyze(p, description, attempt > 0);
    const items = [...resumeData.practices.items, ...a.bullets.map((b) => b.text)];
    const t: Resume = { ...resumeData, practices: { ...resumeData.practices, items } };
    if (intact(resumeData, { ...t, practices: { ...t.practices, items: items.slice(0, count) } })) return t;
  }
  throw new Error("Tailored resume changed the base text. Try again.");
}
