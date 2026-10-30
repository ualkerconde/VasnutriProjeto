import "server-only";
import { hoje, somarDias } from "@/lib/datas";
import { db } from "@/lib/db";

export const PERIODOS = [
  { chave: "30", rotulo: "30 dias", dias: 30 },
  { chave: "90", rotulo: "90 dias", dias: 90 },
  { chave: "180", rotulo: "6 meses", dias: 180 },
  { chave: "365", rotulo: "12 meses", dias: 365 },
] as const;

/** Período dos rankings: os últimos N dias até hoje (inclusive). */
export function periodoIndicadores(chave: string | undefined) {
  const p = PERIODOS.find((x) => x.chave === chave) ?? PERIODOS[1];
  const fim = somarDias(hoje(), 1);
  return { ...p, inicio: somarDias(fim, -p.dias), fim };
}

export type LinhaCliente = { id: string; nome: string; faturamento: number; despesas: number; margem: number };

/** Faturamento (recebido) e despesas ligadas a cada cliente no período. */
export async function resultadoPorCliente(inicio: Date, fim: Date): Promise<LinhaCliente[]> {
  const [fat, desp] = await Promise.all([
    db.$queryRaw<{ id: string; valor: number }[]>`
      SELECT p.cliente_id::text AS id, sum(coalesce(pa.valor_recebido, pa.valor))::float8 AS valor
      FROM parcelas pa JOIN processos p ON p.id = pa.processo_id
      WHERE NOT pa.cancelada AND pa.recebido_em >= ${inicio}::date AND pa.recebido_em < ${fim}::date
      GROUP BY p.cliente_id`,
    db.$queryRaw<{ id: string; valor: number }[]>`
      SELECT cliente_id::text AS id, sum(valor)::float8 AS valor
      FROM despesas
      WHERE cliente_id IS NOT NULL AND data >= ${inicio}::date AND data < ${fim}::date
      GROUP BY cliente_id`,
  ]);
  const ids = [...new Set([...fat, ...desp].map((l) => l.id))];
  const nomes = new Map((await db.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nomeFantasia: true } })).map((c) => [c.id, c.nomeFantasia]));
  const f = new Map(fat.map((l) => [l.id, l.valor]));
  const d = new Map(desp.map((l) => [l.id, l.valor]));
  return ids.map((id) => {
    const faturamento = f.get(id) ?? 0;
    const despesas = d.get(id) ?? 0;
    return { id, nome: nomes.get(id) ?? "—", faturamento, despesas, margem: faturamento - despesas };
  });
}

export type LinhaFuncionario = {
  id: string;
  nome: string;
  acoes: number;
  movimentos: number;
  checklist: number;
  solicitacoes: number;
  visitas: number;
  minutosCampo: number;
  minutosPrevistos: number;
  /// Tempo real só das visitas que tinham tempo previsto (para comparar com o previsto).
  minutosRealComPrevisto: number;
  despesas: number;
};

/**
 * Por funcionário, no período: ações (mudanças de etapa, itens de checklist marcados, visitas finalizadas,
 * solicitações concluídas), visitas e horas em campo, previsto x realizado e despesas.
 */
export async function resultadoPorFuncionario(inicio: Date, fim: Date): Promise<LinhaFuncionario[]> {
  const [usuarios, movimentos, checklist, solicitacoes, visitas, despesas] = await Promise.all([
    db.usuario.findMany({ select: { id: true, nome: true, ativo: true } }),
    db.$queryRaw<{ id: string; n: number }[]>`
      SELECT autor_id::text AS id, count(*)::int AS n FROM processo_etapas_historico
      WHERE autor_id IS NOT NULL AND inicio >= ${inicio} AND inicio < ${fim} GROUP BY autor_id`,
    db.$queryRaw<{ id: string; n: number }[]>`
      SELECT concluido_por_id::text AS id, count(*)::int AS n FROM processo_checklist
      WHERE concluido AND concluido_por_id IS NOT NULL AND concluido_em >= ${inicio} AND concluido_em < ${fim} GROUP BY concluido_por_id`,
    db.$queryRaw<{ id: string; n: number }[]>`
      SELECT responsavel_id::text AS id, count(*)::int AS n FROM solicitacoes_escritorio
      WHERE status = 'CONCLUIDO' AND responsavel_id IS NOT NULL AND concluido_em >= ${inicio}::date AND concluido_em < ${fim}::date GROUP BY responsavel_id`,
    db.$queryRaw<{ id: string; n: number; minutos: number; previstos: number; real_previsto: number }[]>`
      SELECT tecnico_id::text AS id, count(*)::int AS n,
        coalesce(sum(extract(epoch FROM (fim - inicio)) / 60), 0)::float8 AS minutos,
        coalesce(sum(duracao_prevista_min), 0)::float8 AS previstos,
        coalesce(sum(extract(epoch FROM (fim - inicio)) / 60) FILTER (WHERE duracao_prevista_min IS NOT NULL), 0)::float8 AS real_previsto
      FROM visitas
      WHERE status = 'CONCLUIDA' AND tecnico_id IS NOT NULL AND fim IS NOT NULL AND fim >= ${inicio} AND fim < ${fim}
      GROUP BY tecnico_id`,
    db.$queryRaw<{ id: string; valor: number }[]>`
      SELECT usuario_id::text AS id, sum(valor)::float8 AS valor FROM despesas
      WHERE data >= ${inicio}::date AND data < ${fim}::date GROUP BY usuario_id`,
  ]);
  const mapa = <T extends { id: string }>(linhas: T[]) => new Map(linhas.map((l) => [l.id, l]));
  const [mov, chk, sol, vis, desp] = [mapa(movimentos), mapa(checklist), mapa(solicitacoes), mapa(visitas), mapa(despesas)];
  return usuarios
    .map((u) => {
      const v = vis.get(u.id);
      const linha: LinhaFuncionario = {
        id: u.id,
        nome: u.nome,
        movimentos: mov.get(u.id)?.n ?? 0,
        checklist: chk.get(u.id)?.n ?? 0,
        solicitacoes: sol.get(u.id)?.n ?? 0,
        visitas: v?.n ?? 0,
        minutosCampo: v?.minutos ?? 0,
        minutosPrevistos: v?.previstos ?? 0,
        minutosRealComPrevisto: v?.real_previsto ?? 0,
        despesas: desp.get(u.id)?.valor ?? 0,
        acoes: 0,
      };
      linha.acoes = linha.movimentos + linha.checklist + linha.solicitacoes + linha.visitas;
      return { linha, ativo: u.ativo };
    })
    .filter(({ linha, ativo }) => ativo || linha.acoes > 0 || linha.despesas > 0)
    .map(({ linha }) => linha);
}

/** Top N por um campo, sem zeros. */
export function top<T>(linhas: T[], campo: (l: T) => number, n = 5): T[] {
  return [...linhas].filter((l) => campo(l) > 0).sort((a, b) => campo(b) - campo(a)).slice(0, n);
}
