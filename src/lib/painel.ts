import "server-only";
import { db } from "@/lib/db";

export type LinhaFunil = {
  id: number;
  nome: string;
  final: boolean;
  quantidade: number;
  /// Média de dias que os processos ficaram nesta etapa (passagens já encerradas).
  mediaDias: number | null;
};

export async function dadosDoPainel(usuarioId: string) {
  const [etapas, porEtapa, medias, orcamentosAguardando, clientes, naoLidas, notificacoes] = await Promise.all([
    db.etapa.findMany({ orderBy: { ordem: "asc" } }),
    db.processo.groupBy({ by: ["etapaAtualId"], _count: { _all: true } }),
    db.$queryRaw<{ etapa_id: number; dias: number }[]>`
      SELECT etapa_id, (avg(extract(epoch FROM (fim - inicio))) / 86400)::float8 AS dias
      FROM processo_etapas_historico
      WHERE fim IS NOT NULL
      GROUP BY etapa_id`,
    db.processo.count({ where: { statusOrcamento: "AGUARDANDO_APROVACAO" } }),
    db.cliente.count(),
    db.notificacao.count({ where: { usuarioId, lidaEm: null } }),
    db.notificacao.findMany({
      where: { usuarioId, lidaEm: null },
      orderBy: { criadoEm: "desc" },
      take: 5,
    }),
  ]);

  const quantidade = new Map(porEtapa.map((g) => [g.etapaAtualId, g._count._all]));
  const media = new Map(medias.map((m) => [m.etapa_id, m.dias]));

  const funil: LinhaFunil[] = etapas.map((e) => ({
    id: e.id,
    nome: e.nome,
    final: e.final,
    quantidade: quantidade.get(e.id) ?? 0,
    mediaDias: media.get(e.id) ?? null,
  }));

  const emAndamento = funil.filter((l) => !l.final).reduce((soma, l) => soma + l.quantidade, 0);

  return { funil, emAndamento, orcamentosAguardando, clientes, naoLidas, notificacoes };
}
