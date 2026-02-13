import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { prisma } from "@/src/lib/prisma";
import UserProfileClient from "./UserProfileClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

async function getUserForMeta(username: string) {
  return prisma.user.findUnique({
    where: { username, isBanned: false },
    select: { name: true, username: true },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserForMeta(username);
  const title = user?.username ?? user?.name ?? username;
  return {
    title: `${title} | HUBEXPRESSO`,
    description: `Perfil público de ${title} – HUBEXPRESSO`,
  };
}

export default async function UserProfilePage({ params }: Params) {
  const { username } = await params;
  const user = await getUserForMeta(username);
  if (!user) notFound();
  return <UserProfileClient username={username} />;
}
