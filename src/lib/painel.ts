import "server-only";
import type { Modulo } from "@/generated/prisma/enums";
import { lerConfig } from "@/lib/config";
import { fmtData, fmtMoeda, hoje, somarDias } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA } from "@/lib/funil/regras";
import { ciclosEmAndamento } from "@/lib/visitas";

export type LinhaFunil = {
  id: number;
  nome: string;
  final: boolean;
  quantidade: number;
  /// Média de dias que os processos ficaram nesta etapa (passagens já encerradas).
  mediaDias: number | null;
};

export async function dadosDoPainel(usuarioId: string) {
  const [etapas, porEtapa, medias, orcamentosAguardando, clientes, naoLidas, notificacoes, ciclos, solicitacoesVencidas] = await Promise.all([
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
    ciclosEmAndamento(),
    db.solicitacaoEscritorio.count({ where: { status: "EM_ABERTO", prazo: { lt: hoje() } } }),
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

  const clientesComVisitaAtrasada = ciclos.filter((c) => c.atrasadas > 0).length;

  return {
    funil,
    emAndamento,
    orcamentosAguardando,
    clientes,
    naoLidas,
    notificacoes,
    ciclos,
    clientesComVisitaAtrasada,
    solicitacoesVencidas,
  };
}

export type ItemCritico = { id: string; titulo: string; detalhe: string; href: string };
export type CardCritico = {
  chave: string;
  titulo: string;
  descricao: string;
  quantidade: number;
  /// Valor em destaque no lugar da quantidade (ex.: total vencido em R$).
  destaque?: string;
  gravidade: "alta" | "media";
  itens: ItemCritico[];
  href?: string;
};

const diasDesde = (d: Date, agora: Date) => Math.max(0, Math.floor((agora.getTime() - d.getTime()) / 86_400_000));
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Itens críticos do painel, pensando no comercial e na operação: o que está travado,
 * esquecido ou perto de dar problema. Cada card só aparece para quem tem o módulo.
 */
export async function itensCriticos(modulos: readonly Modulo[], agora = new Date()): Promise<CardCritico[]> {
  const hojeData = hoje(agora);
  const veFunil = modulos.includes("FUNIL");
  const veVisitas = modulos.includes("VISITAS") || modulos.includes("PLANEJAMENTO");
  const veFinanceiro = modulos.includes("FINANCEIRO");
  const [diasParado, diasSemVisita, diasContrato] = await Promise.all([
    lerConfig("dias_sem_movimentacao"),
    lerConfig("dias_sem_visita"),
    lerConfig("dias_aviso_fim_contrato"),
  ]);
  const limiteParado = somarDias(agora, -diasParado);
  const foraDoFluxo = [ETAPA.VISITAS, ETAPA.RECUSADOS];
  const cliente = { select: { nomeFantasia: true } } as const;
  const cards: CardCritico[] = [];

  if (veFunil) {
    const [naEtapa, semMovimento, propostas] = await Promise.all([
      db.processoEtapaHistorico.findMany({
        where: { fim: null, etapaId: { notIn: foraDoFluxo }, processo: { etapaAtualId: { notIn: foraDoFluxo } } },
        orderBy: { inicio: "asc" },
        include: { etapa: { select: { nome: true } }, processo: { select: { id: true, cliente } } },
      }),
      db.processo.findMany({
        where: { etapaAtualId: { notIn: foraDoFluxo }, atualizadoEm: { lt: limiteParado }, historico: { none: { inicio: { gte: limiteParado } } } },
        orderBy: { atualizadoEm: "asc" },
        select: { id: true, atualizadoEm: true, cliente, etapaAtual: { select: { nome: true } } },
      }),
      db.processo.findMany({
        where: { statusOrcamento: "AGUARDANDO_APROVACAO", etapaAtual: { final: false } },
        orderBy: [{ dataEnvioOrcamento: { sort: "asc", nulls: "last" } }],
        select: { id: true, numeroOrcamento: true, dataEnvioOrcamento: true, atualizadoEm: true, cliente },
      }),
    ]);
    // Um processo pode ter mais de uma linha aberta só por erro antigo: fica a mais antiga.
    const vistos = new Set<string>();
    const parados = naEtapa.filter((h) => !vistos.has(h.processoId) && vistos.add(h.processoId));
    cards.push({
      chave: "parados",
      titulo: "Parados há mais tempo na etapa",
      descricao: `Fora de Visitas técnicas. ${plural(parados.filter((h) => h.inicio < limiteParado).length, "está", "estão")} há mais de ${diasParado} dias.`,
      quantidade: parados.filter((h) => h.inicio < limiteParado).length,
      gravidade: "media",
      itens: parados.slice(0, 4).map((h) => ({
        id: h.processoId,
        titulo: h.processo.cliente.nomeFantasia,
        detalhe: `${diasDesde(h.inicio, agora)} dias em ${h.etapa.nome}`,
        href: `/funil/${h.processoId}`,
      })),
      href: "/funil",
    });
    cards.push({
      chave: "sem-movimento",
      titulo: "Sem nenhuma movimentação",
      descricao: `Processos sem alteração há mais de ${diasParado} dias.`,
      quantidade: semMovimento.length,
      gravidade: "alta",
      itens: semMovimento.slice(0, 4).map((p) => ({
        id: p.id,
        titulo: p.cliente.nomeFantasia,
        detalhe: `${diasDesde(p.atualizadoEm, agora)} dias parado · ${p.etapaAtual.nome}`,
        href: `/funil/${p.id}`,
      })),
      href: "/funil",
    });
    cards.push({
      chave: "propostas",
      titulo: "Propostas sem resposta",
      descricao: "Orçamentos enviados aguardando o cliente. Vale um follow-up.",
      quantidade: propostas.length,
      gravidade: "media",
      itens: propostas.slice(0, 4).map((p) => ({
        id: p.id,
        titulo: p.cliente.nomeFantasia,
        detalhe: `Orçamento nº ${p.numeroOrcamento} · enviado há ${diasDesde(p.dataEnvioOrcamento ?? p.atualizadoEm, agora)} dias`,
        href: `/funil/${p.id}`,
      })),
      href: "/funil",
    });
  }

  if (veFunil || veFinanceiro) {
    const vencendo = await db.processo.findMany({
      where: { dataAssinatura: { not: null }, etapaAtual: { final: false }, validadeContrato: { not: null, lte: somarDias(hojeData, diasContrato) } },
      orderBy: { validadeContrato: "asc" },
      select: { id: true, validadeContrato: true, etapaAtualId: true, cliente },
    });
    // Vencido há muito e fora de Visitas técnicas: já foi tratado (renovação ou novo ciclo).
    const relevantes = vencendo.filter((p) => p.validadeContrato! >= somarDias(hojeData, -60) || p.etapaAtualId === ETAPA.VISITAS);
    cards.push({
      chave: "contratos",
      titulo: "Contratos perto do vencimento",
      descricao: `Vencidos ou vencendo nos próximos ${diasContrato} dias: hora de renovar.`,
      quantidade: relevantes.length,
      gravidade: relevantes.some((p) => p.validadeContrato! < hojeData) ? "alta" : "media",
      itens: relevantes.slice(0, 4).map((p) => {
        const dias = Math.round((p.validadeContrato!.getTime() - hojeData.getTime()) / 86_400_000);
        return {
          id: p.id,
          titulo: p.cliente.nomeFantasia,
          detalhe: dias < 0 ? `Venceu há ${-dias} dias` : dias === 0 ? "Vence hoje" : `Vence em ${dias} dias`,
          href: `/funil/${p.id}`,
        };
      }),
    });
  }

  if (veFinanceiro) {
    const vencidas = await db.parcela.findMany({
      where: { cancelada: false, recebidoEm: null, vencimento: { lt: hojeData } },
      orderBy: { vencimento: "asc" },
      select: { id: true, valor: true, vencimento: true, processoId: true, processo: { select: { cliente } } },
    });
    const total = vencidas.reduce((s, p) => s + Number(p.valor), 0);
    cards.push({
      chave: "parcelas",
      titulo: "Parcelas vencidas",
      descricao: plural(vencidas.length, "parcela não recebida", "parcelas não recebidas") + " depois do vencimento.",
      quantidade: vencidas.length,
      destaque: vencidas.length ? fmtMoeda(total) : undefined,
      gravidade: "alta",
      itens: vencidas.slice(0, 4).map((p) => ({
        id: p.id,
        titulo: p.processo.cliente.nomeFantasia,
        detalhe: `${fmtMoeda(p.valor)} · venceu em ${fmtData(p.vencimento)}`,
        href: `/financeiro/contrato/${p.processoId}`,
      })),
      href: "/financeiro",
    });
  }

  if (veVisitas) {
    const [atrasadas, emVisitas] = await Promise.all([
      db.visita.findMany({
        where: {
          OR: [
            { status: "AGENDADA", inicio: { lt: agora } },
            // Iniciada e não finalizada há mais de 12 horas.
            { status: "EM_ANDAMENTO", inicio: { lt: new Date(agora.getTime() - 12 * 3_600_000) } },
          ],
        },
        orderBy: { inicio: "asc" },
        select: { id: true, status: true, inicio: true, processo: { select: { cliente } }, tecnico: { select: { nome: true } } },
      }),
      db.processo.findMany({
        where: { etapaAtualId: ETAPA.VISITAS },
        select: {
          id: true,
          cliente,
          visitas: { where: { status: "CONCLUIDA" }, orderBy: { inicio: "desc" }, take: 1, select: { inicio: true } },
        },
      }),
    ]);
    cards.push({
      chave: "visitas",
      titulo: "Visitas atrasadas ou não finalizadas",
      descricao: "Agendadas que passaram do horário e visitas iniciadas sem finalizar.",
      quantidade: atrasadas.length,
      gravidade: "alta",
      itens: atrasadas.slice(0, 4).map((v) => ({
        id: v.id,
        titulo: v.processo.cliente.nomeFantasia,
        detalhe: `${v.status === "AGENDADA" ? "Agendada" : "Iniciada"} em ${fmtData(hoje(v.inicio))}${v.tecnico ? ` · ${v.tecnico.nome}` : " · sem consultor"}`,
        href: `/planejamento?visita=${v.id}`,
      })),
      href: "/planejamento",
    });
    const limiteVisita = somarDias(agora, -diasSemVisita);
    const semVisita = emVisitas
      .filter((p) => !p.visitas[0] || p.visitas[0].inicio < limiteVisita)
      .sort((a, b) => (a.visitas[0]?.inicio.getTime() ?? 0) - (b.visitas[0]?.inicio.getTime() ?? 0));
    cards.push({
      chave: "sem-visita",
      titulo: `Clientes sem visita em ${diasSemVisita} dias`,
      descricao: "Em contrato ativo (Visitas técnicas) e sem visita concluída no período.",
      quantidade: semVisita.length,
      gravidade: "media",
      itens: semVisita.slice(0, 4).map((p) => ({
        id: p.id,
        titulo: p.cliente.nomeFantasia,
        detalhe: p.visitas[0] ? `Última visita há ${diasDesde(p.visitas[0].inicio, agora)} dias` : "Nenhuma visita ainda",
        href: `/funil/${p.id}`,
      })),
      href: "/visitas",
    });
  }

  return cards;
}
