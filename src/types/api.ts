/**
 * Tipos seguros para APIs – nunca expor password, tokens ou PII desnecessário.
 */

export type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  rank: string | null;
  elo: number;
  xp: number;
  level: number;
  isAdmin: boolean;
  onboardingCompleted: boolean;
};

export type SafeUserPublic = Pick<
  SafeUser,
  "id" | "name" | "username" | "image" | "rank" | "elo" | "level"
>;

export function toSafeUser(user: {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  rank: string | null;
  elo: number;
  xp: number;
  level: number;
  isAdmin: boolean;
  onboardingCompleted: boolean;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    image: user.image,
    rank: user.rank,
    elo: user.elo,
    xp: user.xp,
    level: user.level,
    isAdmin: user.isAdmin,
    onboardingCompleted: user.onboardingCompleted,
  };
}

export function toSafeUserPublic(user: {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  rank: string | null;
  elo: number;
  level: number;
}): SafeUserPublic {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    rank: user.rank,
    elo: user.elo,
    level: user.level,
  };
}
