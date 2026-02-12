import Link from "next/link";
import { type Metadata } from "next";
import { UsersList } from "./UsersList";

export const metadata: Metadata = {
  title: "Jogadores | HUBEXPRESSO",
  description: "Listagem de jogadores – HUBEXPRESSO",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Jogadores
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Encontre jogadores e veja perfis públicos
        </p>
      </div>

      <UsersList />
    </div>
  );
}
