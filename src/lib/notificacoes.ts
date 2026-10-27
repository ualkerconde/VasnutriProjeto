import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { TipoNotificacao } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

type Cliente = Prisma.TransactionClient | typeof db;

export type NovaNotificacao = {
  usuarioId: string | null | undefined;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string | null;
  entidade?: "processo" | "solicitacao" | "arquivo";
  entidadeId?: string;
};

/** Cria a notificação, exceto quando quem fez a ação é a própria pessoa avisada. */
export async function notificar(tx: Cliente, n: NovaNotificacao, autorId?: string) {
  if (!n.usuarioId || n.usuarioId === autorId) return;
  await tx.notificacao.create({
    data: {
      usuarioId: n.usuarioId,
      tipo: n.tipo,
      titulo: n.titulo,
      mensagem: n.mensagem ?? null,
      entidade: n.entidade ?? null,
      entidadeId: n.entidadeId ?? null,
    },
  });
}

/** Endereço que a notificação abre. */
export function linkDaNotificacao(n: { entidade: string | null; entidadeId: string | null }): string | null {
  if (!n.entidadeId) return null;
  switch (n.entidade) {
    case "processo":
      return `/funil/${n.entidadeId}`;
    case "solicitacao":
      return `/solicitacoes/${n.entidadeId}`;
    default:
      return null;
  }
}
