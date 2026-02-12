import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";

/** /profile – redireciona para o perfil público do usuário logado (/users/[username]) ou para edição se não tiver username */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const username = (session.user as { username?: string | null }).username;
  if (username) {
    redirect(`/users/${encodeURIComponent(username)}`);
  }
  redirect("/profile/edit");
}
