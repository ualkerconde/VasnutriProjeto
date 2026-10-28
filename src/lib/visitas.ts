import "server-only";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA, situacaoVisitas } from "@/lib/funil/regras";

export type LinhaCiclo = Awaited<ReturnType<typeof ciclosEmAndamento>>[number];

/** Processos em Visitas técnicas com a situação do ciclo atual. */
export async function ciclosEmAndamento() {
  const hojeData = hoje();
  const processos = await db.processo.findMany({
    where: { etapaAtualId: ETAPA.VISITAS },
    include: {
      cliente: { select: { nomeFantasia: true } },
      responsavel: { select: { id: true, nome: true } },
      ciclos: { where: { encerradoEm: null }, orderBy: { numero: "desc" }, take: 1 },
    },
  });

  const linhas = await Promise.all(
    processos.map(async (p) => {
      const ciclo = p.ciclos[0] ?? null;
      const [feitas, ultima] = ciclo
        ? await Promise.all([
            db.visita.count({ where: { cicloId: ciclo.id, status: "CONCLUIDA" } }),
            db.visita.findFirst({ where: { processoId: p.id, status: "CONCLUIDA" }, orderBy: { inicio: "desc" }, select: { inicio: true } }),
          ])
        : [0, null];
      const situacao = ciclo
        ? situacaoVisitas({ inicio: ciclo.inicio, fimPrevisto: ciclo.fimPrevisto, contratadas: p.visitasContratadas, feitas, hoje: hojeData })
        : { esperadas: null, atrasadas: 0 };
      const fimProximo = ciclo?.fimPrevisto ? Math.round((ciclo.fimPrevisto.getTime() - hojeData.getTime()) / 86_400_000) : null;
      return {
        processoId: p.id,
        cliente: p.cliente.nomeFantasia,
        responsavel: p.responsavel,
        ciclo,
        contratadas: p.visitasContratadas,
        feitas,
        ultima: ultima?.inicio ?? null,
        ...situacao,
        diasParaFim: fimProximo,
      };
    }),
  );

  // Atrasados e perto do fim primeiro.
  return linhas.sort((a, b) => b.atrasadas - a.atrasadas || (a.diasParaFim ?? 9999) - (b.diasParaFim ?? 9999));
}

export function situacaoCiclo(l: Pick<LinhaCiclo, "atrasadas" | "diasParaFim">): { rotulo: string; cor: "verde" | "ambar" | "vermelho" } {
  if (l.diasParaFim !== null && l.diasParaFim <= 0) return { rotulo: "Fim do ciclo", cor: "vermelho" };
  if (l.atrasadas > 0) return { rotulo: `${l.atrasadas} atrasada(s)`, cor: "vermelho" };
  if (l.diasParaFim !== null && l.diasParaFim <= 30) return { rotulo: "Perto do fim", cor: "ambar" };
  return { rotulo: "Em dia", cor: "verde" };
}
