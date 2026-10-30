import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { planoDeParcelas } from "./regras";

type Tx = Prisma.TransactionClient | typeof db;

/** Cria as parcelas que ainda não existem (uma por mês de referência). Devolve quantas criou. */
export async function criarParcelas(
  tx: Tx,
  p: { processoId: string; inicio: Date; diaVencimento: number; valor: string; fim?: Date | null; quantidade?: number | null },
) {
  const plano = planoDeParcelas(p);
  if (plano.length === 0) return 0;
  const r = await tx.parcela.createMany({
    data: plano.map((x) => ({ processoId: p.processoId, competencia: x.competencia, vencimento: x.vencimento, valor: p.valor })),
    skipDuplicates: true,
  });
  return r.count;
}

/**
 * Ao entrar em Visitas técnicas: gera as parcelas mensais do ciclo, se o contrato tem valor
 * e ainda não há parcelas nesse período (ex.: lançadas à mão a partir da assinatura).
 */
export async function gerarParcelasDoCiclo(tx: Tx, processoId: string, ciclo: { inicio: Date; fimPrevisto: Date | null }) {
  const processo = await tx.processo.findUnique({ where: { id: processoId }, select: { valorMensal: true, diaVencimento: true } });
  if (!processo?.valorMensal || Number(processo.valorMensal) <= 0) return 0;
  const existentes = await tx.parcela.count({ where: { processoId, vencimento: { gte: ciclo.inicio } } });
  if (existentes > 0) return 0;
  return criarParcelas(tx, {
    processoId,
    inicio: ciclo.inicio,
    fim: ciclo.fimPrevisto,
    quantidade: ciclo.fimPrevisto ? null : 12,
    diaVencimento: processo.diaVencimento ?? ciclo.inicio.getUTCDate(),
    valor: processo.valorMensal.toString(),
  });
}

/** Parcelas que contam como dinheiro: não canceladas. */
export const parcelaValida = { cancelada: false } satisfies Prisma.ParcelaWhereInput;

/** Totais de contas a receber (sem filtro de período): em aberto, vencido. */
export async function totaisEmAberto(where: Prisma.ParcelaWhereInput = {}) {
  const hojeData = hoje();
  const [aReceber, vencido] = await Promise.all([
    db.parcela.aggregate({ where: { ...where, ...parcelaValida, recebidoEm: null, vencimento: { gte: hojeData } }, _sum: { valor: true }, _count: true }),
    db.parcela.aggregate({ where: { ...where, ...parcelaValida, recebidoEm: null, vencimento: { lt: hojeData } }, _sum: { valor: true }, _count: true }),
  ]);
  return {
    aReceber: { valor: Number(aReceber._sum.valor ?? 0), quantidade: aReceber._count },
    vencido: { valor: Number(vencido._sum.valor ?? 0), quantidade: vencido._count },
  };
}
