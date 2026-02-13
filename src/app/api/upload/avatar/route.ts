import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** POST /api/upload/avatar – upload de foto de perfil (multipart/form-data, campo "file") */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: "Envie um arquivo no campo 'file'." },
      { status: 422 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Tipo não permitido. Use JPEG, PNG, WebP ou GIF." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { message: "Arquivo muito grande. Máximo 3 MB." },
      { status: 422 }
    );
  }

  const ext = EXT_MAP[file.type] ?? "jpg";
  const filename = `${session.user.id}-${Date.now()}.${ext}`;
  // Em ambientes serverless (ex: Vercel) o filesystem é read-only; use Vercel Blob ou S3.
  const baseDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const filepath = path.join(baseDir, filename);

  try {
    await mkdir(baseDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch {
    return NextResponse.json(
      { message: "Erro ao salvar o arquivo. Em hospedagem serverless use armazenamento externo (ex.: Vercel Blob)." },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = baseUrl ? `${baseUrl}/uploads/avatars/${filename}` : `/uploads/avatars/${filename}`;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
    });
  } catch {
    return NextResponse.json(
      { message: "Arquivo salvo, mas falha ao atualizar perfil. Tente salvar o perfil novamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url });
}
