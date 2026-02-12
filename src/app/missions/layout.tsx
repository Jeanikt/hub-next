import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missões",
  description: "Complete missões, ganhe XP e suba de nível no HUBEXPRESSO. Missões diárias, semanais e únicas.",
  openGraph: { title: "Missões – HUBEXPRESSO", description: "Missões e recompensas em XP." },
};

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
