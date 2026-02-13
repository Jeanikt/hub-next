/**
 * Script one-off:
 * 1. Apaga o usuário com email jeanikkt@gmail.com (e registros que dependem dele).
 * 2. Define o usuário com username "santvlr" como admin (isAdmin: true).
 *
 * Uso: npx tsx prisma/scripts/delete-user-and-set-admin.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emailToDelete = "jeanikkt@gmail.com";
  const usernameToMakeAdmin = "santvlr";

  const userToDelete = await prisma.user.findUnique({
    where: { email: emailToDelete },
    select: { id: true, name: true, email: true, username: true },
  });

  if (userToDelete) {
    console.log("Removendo registros que referenciam o usuário (NoAction)...");
    await prisma.article.deleteMany({ where: { authorId: userToDelete.id } });
    await prisma.supportTicketMessage.deleteMany({ where: { userId: userToDelete.id } });
    await prisma.user.delete({
      where: { id: userToDelete.id },
    });
    console.log(`Usuário removido: ${userToDelete.email} (${userToDelete.username ?? userToDelete.name}).`);
  } else {
    console.log(`Nenhum usuário encontrado com email ${emailToDelete}.`);
  }

  const adminUser = await prisma.user.findFirst({
    where: { username: usernameToMakeAdmin },
    select: { id: true, username: true, email: true, isAdmin: true },
  });

  if (adminUser) {
    if (adminUser.isAdmin) {
      console.log(`Usuário ${adminUser.username} já é admin.`);
    } else {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { isAdmin: true },
      });
      console.log(`Usuário ${adminUser.username} (${adminUser.email ?? "—"}) definido como admin.`);
    }
  } else {
    console.log(`Nenhum usuário encontrado com username "${usernameToMakeAdmin}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
