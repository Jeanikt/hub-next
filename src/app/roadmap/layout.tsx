import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "Sugira features, correções e melhorias para o HUBEXPRESSO. A comunidade vota; o admin prioriza e desenvolve.",
};

export default function RoadmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
