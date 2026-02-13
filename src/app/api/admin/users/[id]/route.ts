import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";

const BADGE_VALUES = ["dev", "admin", "mod", "streamer", "coach", "pro"] as const;

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/[id] – atualizar selo (profileBadge) e verificado (isVerified). Apenas admin. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const id = (await params).id;
    if (!id) {
      return NextResponse.json({ message: "ID inválido." }, { status: 422 });
    }

    const body = await request.json().catch(() => ({}));
    const profileBadgeRaw = body.profileBadge;
    const isVerified = body.isVerified;

    const updateData: { profileBadge?: string | null; isVerified?: boolean } = {};
    if (profileBadgeRaw !== undefined) {
      if (profileBadgeRaw === null || profileBadgeRaw === "") {
        updateData.profileBadge = null;
      } else if (typeof profileBadgeRaw === "string" && BADGE_VALUES.includes(profileBadgeRaw as (typeof BADGE_VALUES)[number])) {
        updateData.profileBadge = profileBadgeRaw;
      } else {
        return NextResponse.json(
          { message: "profileBadge deve ser: dev, pro, coach, admin, mod, streamer ou vazio." },
          { status: 422 }
        );
      }
    }
    if (typeof isVerified === "boolean") {
      updateData.isVerified = isVerified;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "Nenhum campo para atualizar." }, { status: 422 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, profileBadge: true, isVerified: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("admin users PATCH", e);
    return NextResponse.json({ message: "Erro ao atualizar usuário." }, { status: 500 });
  }
}
