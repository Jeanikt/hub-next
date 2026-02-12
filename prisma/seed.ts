import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const missions = [
  { title: "Primeira vitória do dia", description: "Vença uma partida ranqueada na plataforma.", type: "daily", xpReward: 50 },
  { title: "Jogador em equipe", description: "Entre na fila e complete uma partida com 10 jogadores.", type: "daily", xpReward: 30 },
  { title: "3 partidas na semana", description: "Complete 3 partidas em qualquer fila esta semana.", type: "weekly", xpReward: 120 },
  { title: "Perfil completo", description: "Preencha nome, username e vincule conta Riot no perfil.", type: "one_time", xpReward: 25 },
  { title: "Adicione um amigo", description: "Envie uma solicitação de amizade e seja aceito.", type: "one_time", xpReward: 40 },
  { title: "5 partidas no mês", description: "Complete 5 partidas em um mês.", type: "weekly", xpReward: 80 },
];

async function main() {
  const existing = await prisma.mission.count();
  if (existing > 0) {
    console.log("Seed: missões já existem, pulando.");
    return;
  }
  await prisma.mission.createMany({ data: missions });
  console.log("Seed: missões criadas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
