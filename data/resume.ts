export type TimelineEntry = {
  title: string;
  institution: string;
  location: string;
  period: string;
  details?: string[];
};

export type Project = { name: string; url: string };

export const shortUrl = (url: string) => {
  const { hostname, pathname } = new URL(url);
  return (hostname.replace(/^www\./, "") + pathname).replace(/\/+$/, "");
};

const experience: TimelineEntry[] = [
  {
    title: "Software Engineer",
    institution: "Example Corp",
    location: "Springfield",
    period: "Jan 2024 - Present",
    details: [
      "Build and maintain TypeScript services behind the customer billing dashboard.",
      "Own the internal job queue, from design review through on-call.",
      "Write integration tests for every public API and keep the suite under five minutes.",
    ],
  },
  {
    title: "Junior Developer",
    institution: "Acme Robotics",
    location: "Springfield",
    period: "Jun 2022 - Dec 2023",
    details: [
      "Built React screens for the fleet monitoring tool.",
      "Moved nightly reports from cron scripts to a typed Node.js worker.",
    ],
  },
];

const education: TimelineEntry[] = [
  {
    title: "Bachelor of Science, Computer Science",
    institution: "Springfield University",
    location: "Springfield",
    period: "2018 - 2022",
  },
];

export const openSource = {
  project: "tiny-queue",
  role: "creator and maintainer",
  url: "https://github.com/example/tiny-queue",
  description:
    "A small, typed job queue for Node.js with retries, backoff and a test harness.",
  cta: "Try it:",
};

const projects: Project[] = [
  { name: "Budget Buddy", url: "https://example.com/budget-buddy" },
  { name: "Trail Notes", url: "https://example.com/trail-notes" },
];

const linkByText = new Map(
  [...projects.map((p) => p.url), openSource.url].map((url) => [
    shortUrl(url),
    url,
  ]),
);
const linkAlternatives = [...linkByText.keys()]
  .sort((a, b) => b.length - a.length)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const linkPattern = new RegExp(
  `((?:https?://)?(?:www\\.)?(?:${linkAlternatives})/?(?![\\w-]))`,
  "i",
);

export const linkify = (text: string) =>
  text
    .split(linkPattern)
    .map((part, i) => ({
      text: part,
      url:
        i % 2
          ? linkByText.get(
              shortUrl(part.startsWith("http") ? part : `https://${part}`),
            )
          : undefined,
    }))
    .filter((part) => part.text);

export const resumeData = {
  name: "Alex Example",
  title: "Software Engineer",
  availability: "Springfield · Open to remote, hybrid, or on site",
  phone: "555-0100",
  email: "alex@example.com",
  linkedin: "https://www.linkedin.com/in/example",
  github: "https://github.com/example",
  portfolio: "https://example.com",

  summary:
    "Software engineer with about three years of experience building TypeScript services and React interfaces. I like owning a feature from the first design sketch to production, and I keep systems small, tested and easy to hand over.",

  experience,

  projectsIntro: "Side projects you can open right now:",
  projects,

  practices: {
    items: [
      "small pull requests, each with tests that fail before the fix",
      "typed boundaries at every API, no untyped JSON past the edge",
      "every change reviewed against the design doc before merge",
    ],
    link: "https://example.com/how-i-work",
  },

  education,
  workAuthorization: "Authorized to work in my country of residence.",
  references: "References available upon request.",
};
