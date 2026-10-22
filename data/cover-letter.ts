import { openSource, resumeData, shortUrl } from "./resume";

const projectList = new Intl.ListFormat("en", { type: "conjunction" }).format(
  resumeData.projects.map((p) => `${p.name} (${shortUrl(p.url)})`),
);

export const PRACTICE_PARAGRAPH = 2;

export const coverLetterData = {
  greeting: "Dear hiring team,",
  paragraphs: [
    "I'm a software engineer at Example Corp, where I build and run the TypeScript services behind our billing dashboard and own the internal job queue.",
    `Outside work I build small tools people actually use, such as ${projectList}.`,
    `I keep pull requests small, test the failure before the fix, and review every change against its design. My side project tiny-queue (${shortUrl(openSource.url)}) is where I try those habits in the open.`,
    "I'd love to hear what you're building and how I could help.",
  ],
  closing: "Thank you for reading.",
  signature: resumeData.name,
};
