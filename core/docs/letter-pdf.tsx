import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { coverLetterData } from "../../data/cover-letter";
import { linkify, resumeData } from "../../data/resume";
import { PdfHeader, UrlLink, s } from "./resume-pdf";

export type Letter = Omit<typeof coverLetterData, "paragraphs"> & {
  paragraphs: string[];
};

const paragraph = { marginTop: 9 };
const afterHeader = { marginTop: 11 };
const noHyphenAtLinks = 10000;

export function LetterPdf({ letter }: { letter: Letter }) {
  return (
    <Document
      title={`${resumeData.name} · Cover Letter`}
      author={resumeData.name}
    >
      <Page size="A4" style={s.page}>
        <PdfHeader data={resumeData} />
        <View style={afterHeader}>
          <Text style={s.bodyText}>{letter.greeting}</Text>
          {letter.paragraphs.map((p, i) => (
            <Text
              key={i}
              style={[s.bodyText, paragraph]}
              hyphenationPenalty={noHyphenAtLinks}
            >
              {linkify(p).map((part, j) =>
                part.url ? <UrlLink key={j} url={part.url} /> : part.text,
              )}
            </Text>
          ))}
          <Text style={[s.bodyText, paragraph]}>{letter.closing}</Text>
          <Text style={[s.bodyText, paragraph]}>{letter.signature}</Text>
        </View>
      </Page>
    </Document>
  );
}
