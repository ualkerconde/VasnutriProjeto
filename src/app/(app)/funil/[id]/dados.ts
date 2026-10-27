import "server-only";
import { db } from "@/lib/db";

export async function carregarProcesso(id: string) {
  return db.processo.findUnique({
    where: { id },
    include: {
      cliente: true,
      etapaAtual: true,
      responsavel: { select: { id: true, nome: true } },
      motivoRecusa: true,
      documentacoes: true,
      checklist: { include: { concluidoPor: { select: { nome: true } } } },
      historico: {
        orderBy: { inicio: "desc" },
        include: { etapa: true, responsavel: { select: { nome: true } } },
      },
      ciclos: { orderBy: { numero: "desc" }, include: { encerradoPor: { select: { nome: true } } } },
    },
  });
}

export type ProcessoCompleto = NonNullable<Awaited<ReturnType<typeof carregarProcesso>>>;
