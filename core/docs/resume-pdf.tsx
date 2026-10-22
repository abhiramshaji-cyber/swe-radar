import type { ReactNode } from "react";
import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { openSource, type resumeData, type TimelineEntry } from "../../data/resume";

export type Resume = typeof resumeData;

Font.registerHyphenationCallback((w) => [w]);

const ink = "#000000";
const grey = "#444444";
export const sectionGap = 18;
const entryGap = 10;

export const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#ffffff", color: ink, paddingTop: 34, paddingBottom: 32, paddingHorizontal: 50 },
  header: { marginBottom: 2 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  subtitle: { fontSize: 10, marginBottom: 3 },
  contact: { fontSize: 9, color: grey, lineHeight: 1.25 },
  contactLink: { fontSize: 9, color: grey, textDecoration: "none" },
  section: { marginTop: sectionGap },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.7,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: ink,
    marginBottom: 4,
  },
  bodyText: { fontSize: 10, lineHeight: 1.2 },
  entry: { marginBottom: entryGap },
  lastEntry: { marginBottom: 0 },
  entryTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  entryMeta: { fontSize: 9.5, lineHeight: 1.2, color: grey },
  bulletRow: { flexDirection: "row", marginTop: 1 },
  bulletDot: { fontSize: 10, lineHeight: 1.2, width: 11 },
  bulletText: { fontSize: 10, lineHeight: 1.2, flex: 1 },
  agentList: { marginVertical: 2 },
  subBlock: { marginTop: 3 },
  inlineLink: { color: ink, textDecoration: "none" },
  footer: { position: "absolute", bottom: 18, left: 50, right: 50, fontSize: 9, fontFamily: "Helvetica-Oblique", color: grey, textAlign: "center" },
});

export function UrlLink({ url, style = s.inlineLink }: { url: string; style?: typeof s.inlineLink }) {
  return <Link style={style} src={url}>{url}</Link>;
}

function ContactLink({ url }: { url: string }) {
  return <UrlLink url={url} style={s.contactLink} />;
}

export function PdfHeader({ data }: { data: Resume }) {
  return (
    <View style={s.header}>
      <Text style={s.name}>{data.name}</Text>
      <Text style={s.subtitle}>{data.title}</Text>
      <Text style={s.contact}>{data.availability}</Text>
      <Text style={s.contact}>{data.phone} · {data.email}</Text>
      <Text style={s.contact}>
        <ContactLink url={data.linkedin} /> · <ContactLink url={data.github} /> · <ContactLink url={data.portfolio} />
      </Text>
    </View>
  );
}

const keepWithNext = 40;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel} minPresenceAhead={keepWithNext}>{title}</Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((d) => (
        <View key={d} style={s.bulletRow} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{d}</Text>
        </View>
      ))}
    </>
  );
}

function Entries({ items }: { items: readonly TimelineEntry[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={`${item.title}-${item.period}`} style={[s.entry, i === items.length - 1 ? s.lastEntry : {}]}>
          <Text style={s.entryMeta} minPresenceAhead={keepWithNext}>
            {item.period} · <Text style={s.entryTitle}>{item.title}</Text> · {item.institution} · {item.location}
          </Text>
          {item.details && <Bullets items={item.details} />}
        </View>
      ))}
    </>
  );
}

export function ResumePdf({ data }: { data: Resume }) {
  return (
    <Document title={`${data.name} · Resume`} author={data.name}>
      <Page size="A4" style={s.page}>
        <PdfHeader data={data} />
        <Section title="About">
          <Text style={s.bodyText}>{data.summary}</Text>
        </Section>
        <Section title="Experience">
          <Entries items={data.experience} />
        </Section>
        <Section title="Projects">
          <Text style={s.bodyText}>{data.projectsIntro}</Text>
          <View style={s.agentList}>
            {data.projects.map((project) => (
              <Text key={project.url} style={s.bodyText}>
                {project.name}: <UrlLink url={project.url} />
              </Text>
            ))}
          </View>
        </Section>
        <Section title="Open Source">
          <Text style={s.bodyText}>
            <Text style={s.entryTitle}>{openSource.project}</Text>, {openSource.role}. {openSource.description} {openSource.cta}{" "}
            <UrlLink url={openSource.url} />
          </Text>
        </Section>
        <Section title="How I Work">
          <Bullets items={data.practices.items} />
          <Text style={[s.bodyText, s.subBlock]}>
            <UrlLink url={data.practices.link} />
          </Text>
        </Section>
        <Section title="Education">
          <Entries items={data.education} />
        </Section>
        <Section title="Work Authorization">
          <Text style={s.bodyText}>{data.workAuthorization}</Text>
        </Section>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => (pageNumber === totalPages ? data.references : "")} />
      </Page>
    </Document>
  );
}
