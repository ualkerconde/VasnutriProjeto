import "server-only";
import { hoje, somarDias } from "@/lib/datas";
import { db } from "@/lib/db";
import { deslocarMes, intervaloDoMes } from "./regras";
import { parcelaValida, totaisEmAberto } from "./servico";

const fmtMesCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });

export type TotaisContrato = { total: number; recebido: number; aberto: number; vencido: number; parcelas: number };

/** Totais das parcelas por processo, numa consulta só. */
export async function totaisPorContrato(processoIds?: string[]): Promise<Map<string, TotaisContrato>> {
  const hojeData = hoje();
  const linhas = await db.$queryRaw<{ processo_id: string; total: number; recebido: number; aberto: number; vencido: number; parcelas: number }[]>`
    SELECT processo_id::text,
      coalesce(sum(valor) FILTER (WHERE NOT cancelada), 0)::float8 AS total,
      coalesce(sum(coalesce(valor_recebido, valor)) FILTER (WHERE NOT cancelada AND recebido_em IS NOT NULL), 0)::float8 AS recebido,
      coalesce(sum(valor) FILTER (WHERE NOT cancelada AND recebido_em IS NULL), 0)::float8 AS aberto,
      coalesce(sum(valor) FILTER (WHERE NOT cancelada AND recebido_em IS NULL AND vencimento < ${hojeData}::date), 0)::float8 AS vencido,
      count(*) FILTER (WHERE NOT cancelada)::int AS parcelas
    FROM parcelas
    GROUP BY processo_id`;
  const filtro = processoIds ? new Set(processoIds) : null;
  return new Map(
    linhas
      .filter((l) => !filtro || filtro.has(l.processo_id))
      .map((l) => [l.processo_id, { total: l.total, recebido: l.recebido, aberto: l.aberto, vencido: l.vencido, parcelas: l.parcelas }]),
  );
}

/** Recebido e despesas mês a mês (últimos `n` meses até o mês informado). */
export async function serieMensal(ate: string, n = 6, filtro: { clienteId?: string } = {}) {
  const chaves = Array.from({ length: n }, (_, i) => deslocarMes(ate, i - (n - 1)));
  const inicio = new Date(`${chaves[0]}-01T00:00:00Z`);
  const fim = new Date(`${deslocarMes(ate, 1)}-01T00:00:00Z`);
  const [recebidos, despesas] = await Promise.all([
    db.parcela.findMany({
      where: { ...parcelaValida, recebidoEm: { gte: inicio, lt: fim }, ...(filtro.clienteId ? { processo: { clienteId: filtro.clienteId } } : {}) },
      select: { recebidoEm: true, valor: true, valorRecebido: true },
    }),
    db.despesa.findMany({ where: { data: { gte: inicio, lt: fim }, ...(filtro.clienteId ? { clienteId: filtro.clienteId } : {}) }, select: { data: true, valor: true } }),
  ]);
  const soma = (mapa: Map<string, number>, d: Date, v: number) => mapa.set(d.toISOString().slice(0, 7), (mapa.get(d.toISOString().slice(0, 7)) ?? 0) + v);
  const rec = new Map<string, number>();
  const desp = new Map<string, number>();
  for (const r of recebidos) soma(rec, r.recebidoEm!, Number(r.valorRecebido ?? r.valor));
  for (const d of despesas) soma(desp, d.data, Number(d.valor));
  return chaves.map((chave) => ({
    chave,
    rotulo: fmtMesCurto.format(new Date(`${chave}-01T00:00:00Z`)).replace(".", ""),
    valores: [rec.get(chave) ?? 0, desp.get(chave) ?? 0],
  }));
}

export async function dadosFinanceiro(mes: string | undefined) {
  const hojeData = hoje();
  const periodo = intervaloDoMes(mes, hojeData);
  const noMes = { gte: periodo.inicio, lt: periodo.fim };

  const [emAberto, recebidoMes, previstoMes, despesasMes, porCategoria, categorias, proximas, serie, processos, totais] = await Promise.all([
    totaisEmAberto(),
    db.parcela.findMany({ where: { ...parcelaValida, recebidoEm: noMes }, select: { valor: true, valorRecebido: true } }),
    db.parcela.aggregate({ where: { ...parcelaValida, vencimento: noMes }, _sum: { valor: true }, _count: true }),
    db.despesa.aggregate({ where: { data: noMes }, _sum: { valor: true }, _count: true }),
    db.despesa.groupBy({ by: ["categoriaId"], where: { data: noMes }, _sum: { valor: true } }),
    db.categoriaDespesa.findMany({ select: { id: true, nome: true } }),
    db.parcela.findMany({
      where: { ...parcelaValida, recebidoEm: null, vencimento: { lt: somarDias(hojeData, 31) } },
      orderBy: { vencimento: "asc" },
      take: 20,
      include: { processo: { select: { id: true, numeroContrato: true, cliente: { select: { id: true, nomeFantasia: true } } } }, _count: { select: { arquivos: true } } },
    }),
    serieMensal(periodo.chave),
    db.processo.findMany({
      where: { OR: [{ parcelas: { some: {} } }, { valorMensal: { not: null }, etapaAtual: { final: false }, dataAssinatura: { not: null } }] },
      select: {
        id: true,
        numeroOrcamento: true,
        numeroContrato: true,
        valorMensal: true,
        validadeContrato: true,
        dataAssinatura: true,
        etapaAtual: { select: { id: true, nome: true, final: true } },
        cliente: { select: { id: true, nomeFantasia: true } },
      },
    }),
    totaisPorContrato(),
  ]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const recebido = recebidoMes.reduce((s, p) => s + Number(p.valorRecebido ?? p.valor), 0);
  const despesas = Number(despesasMes._sum.valor ?? 0);

  const contratos = processos
    .map((p) => ({ ...p, totais: totais.get(p.id) ?? { total: 0, recebido: 0, aberto: 0, vencido: 0, parcelas: 0 } }))
    .sort((a, b) => (a.validadeContrato?.getTime() ?? Infinity) - (b.validadeContrato?.getTime() ?? Infinity));

  return {
    periodo,
    hoje: hojeData,
    emAberto,
    recebido,
    previsto: { valor: Number(previstoMes._sum.valor ?? 0), quantidade: previstoMes._count },
    despesas: { valor: despesas, quantidade: despesasMes._count },
    resultado: recebido - despesas,
    porCategoria: porCategoria
      .map((c) => ({ chave: c.categoriaId, rotulo: nomeCategoria.get(c.categoriaId) ?? "—", valor: Number(c._sum.valor ?? 0) }))
      .sort((a, b) => b.valor - a.valor),
    proximas,
    serie,
    contratos,
  };
}
