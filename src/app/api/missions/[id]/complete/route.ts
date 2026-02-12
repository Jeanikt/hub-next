/**
 * POST /api/missions/[id]/complete – desativado.
 * Missões são concluídas apenas automaticamente pelo sistema (eventos reais:
 * perfil completo, vitórias, partidas, amizades, convites). Não é possível
 * marcar manualmente para evitar manipulação.
 */
export async function POST() {
  return Response.json(
    {
      error: "MISSIONS_AUTO_ONLY",
      message:
        "As missões são concluídas automaticamente quando você atinge os objetivos (perfil, partidas, amizades). Não é possível marcar manualmente.",
    },
    { status: 410 }
  );
}
