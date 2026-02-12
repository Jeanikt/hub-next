# Rotas da API – Referência para testes e validação

Use este documento para validar manualmente ou automatizar testes das rotas.

## Auth
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/auth/me | Sim | Usuário atual (campos básicos) |
| * | /api/auth/[...nextauth] | - | NextAuth handlers |

## Usuário e perfil
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/me | Sim | Usuário completo + ban, progresso, contagens |
| PATCH | /api/profile | Sim | Atualizar perfil (nome, username, Riot, etc.) |
| POST | /api/profile/like | Sim | Curtir perfil de outro usuário |
| GET | /api/users | Não | Lista de usuários |
| GET | /api/users/[username]/profile | Não | Perfil público por username |

## Onboarding
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/onboarding/profile | Sim | Salvar nome e username (etapa 1) |
| POST | /api/onboarding/riot | Sim | Vincular Riot ID (etapa 2). 422 = conta não encontrada |
| POST | /api/onboarding/complete | Sim | Marcar onboarding completo |
| POST | /api/onboarding/skip | Sim | Pular onboarding |

## Fila e partidas
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/queue/status | Opcional | Status das filas; se logado: inQueue, matchFound, matchId |
| POST | /api/queue/join | Sim | Entrar na fila (body: queue_type) |
| POST | /api/queue/leave | Sim | Sair da fila |
| GET | /api/matches | Sim | Minhas partidas |
| GET | /api/matches/[matchId] | Sim | Detalhe da partida |
| POST | /api/matches/[matchId]/join | Sim | Entrar na partida |
| POST | /api/matches/[matchId]/cancel | Sim | Cancelar partida |

## Amigos e mensagens
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/friends | Sim | Lista de amigos e pendentes |
| POST | /api/friends/accept | Sim | Aceitar pedido (body: friend_id ou id) |
| POST | /api/friends/reject | Sim | Rejeitar pedido |
| POST | /api/friends/remove | Sim | Remover amizade |
| GET | /api/friends/status | Sim | Status com um usuário (query: username ou user_id) |
| GET | /api/friend-messages | Sim | Mensagens (query: friend_id) |
| GET | /api/friend-messages/conversations | Sim | Lista de conversas |
| POST | /api/friend-messages/send | Sim | Enviar mensagem |
| POST | /api/friend-messages/mark-read | Sim | Marcar como lidas |
| GET | /api/lobby-messages/[matchId] | Sim | Mensagens do lobby |
| POST | /api/lobby-messages/send | Sim | Enviar mensagem no lobby |

## Notificações e missões
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/notifications | Sim | Lista de notificações |
| POST | /api/notifications/mark-all-read | Sim | Marcar todas como lidas |
| GET | /api/missions | Sim | Missões disponíveis |
| POST | /api/missions/[id]/complete | Sim | Completar missão (validação interna) |

## Referral e upload
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/referrals/me | Sim | Código de convite e link (host atual) |
| POST | /api/referrals/attribute | Sim | Atribuir convite do cookie |
| POST | /api/upload/avatar | Sim | Upload de avatar |

## Suporte e reports
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/reports | Sim | Criar report |
| GET/POST | /api/support/tickets | Sim | Listar/criar tickets |

## Admin
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/admin/dashboard | Admin | Dashboard |
| GET | /api/admin/users | Admin | Lista usuários |
| GET | /api/admin/queues | Admin | Filas |
| GET | /api/admin/reports | Admin | Reports |
| GET | /api/admin/tickets | Admin | Tickets |
| POST | /api/admin/users/[id]/ban | Admin | Banir usuário |
| POST | /api/admin/users/[id]/unban | Admin | Desbanir |

## Valorant (proxy)
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/valorant/account | Sim | Conta Riot |
| GET | /api/valorant/last-custom | Sim | Última custom |
| GET | /api/valorant/matchlist | Sim | Matchlist |

## Outros
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/leaderboard | Não | Ranking |
| GET | /api/pusher/config | Não | Sempre { enabled: false } |
| POST | /api/pusher/auth | Sim | Sempre 503 (Pusher desativado) |

## Códigos HTTP usados
- **200** – OK
- **401** – Não autenticado
- **403** – Sem permissão (ex.: não admin)
- **404** – Recurso não encontrado (usuário, partida, pedido, etc.)
- **409** – Conflito (ex.: já na fila, conta Riot já vinculada)
- **422** – Dados inválidos ou regra de negócio (ex.: conta Riot não encontrada)
- **500** – Erro interno
- **503** – Serviço indisponível (ex.: Pusher não configurado)
