import "server-only";
import type { TipoNotificacao } from "@/generated/prisma/enums";
import { lerConfig } from "@/lib/config";
import { fmtData, hoje, somarDias } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA } from "@/lib/funil/regras";
import { notificar, type NovaNotificacao } from "@/lib/notificacoes";
import { ciclosEmAndamento } from "@/lib/visitas";

const CHAVE_ULTIMA = "_ultima_verificacao_alertas";
const INTERVALO_MS = 60 * 60 * 1000;
/** Não repete o mesmo aviso sobre o mesmo item antes disso. */
const DIAS_SEM_REPETIR = 7;

/**
 * Gera os avisos automáticos (prazos, vencimentos, atrasos). Roda no máximo uma vez por hora,
 * na primeira tela aberta depois disso, então não precisa de agendador no servidor.
 */
export async function gerarAlertasSeNecessario(agora = new Date()) {
  const ultima = await db.configuracao.findUnique({ where: { chave: CHAVE_ULTIMA } });
  if (ultima && typeof ultima.valor === "string" && agora.getTime() - new Date(ultima.valor).getTime() < INTERVALO_MS) return;
  await db.configuracao.upsert({
    where: { chave: CHAVE_ULTIMA },
    update: { valor: agora.toISOString() },
    create: { chave: CHAVE_ULTIMA, valor: agora.toISOString(), descricao: "Controle interno dos avisos automáticos." },
  });
  await gerarAlertas(agora);
}

export async function gerarAlertas(agora = new Date()) {
  const hojeData = hoje(agora);
  const [diasOrcamento, diasContrato, diasDocumento, diasSolicitacao] = await Promise.all([
    lerConfig("dias_orcamento_parado"),
    lerConfig("dias_aviso_fim_contrato"),
    lerConfig("dias_aviso_validade_documento"),
    lerConfig("dias_aviso_prazo_solicitacao"),
  ]);
  const admins = (
    await db.usuario.findMany({ where: { ativo: true, perfis: { some: { perfil: { nome: "Administrador" } } } }, select: { id: true } })
  ).map((u) => u.id);

  const avisos: NovaNotificacao[] = [];
  const para = (usuarioId: string | null | undefined, n: Omit<NovaNotificacao, "usuarioId">) => {
    for (const id of usuarioId ? [usuarioId] : admins) avisos.push({ ...n, usuarioId: id });
  };

  // Orçamentos esperando aprovação há muito tempo.
  const orcamentos = await db.processo.findMany({
    where: { statusOrcamento: "AGUARDANDO_APROVACAO", dataEnvioOrcamento: { lte: somarDias(agora, -diasOrcamento) }, etapaAtual: { final: false } },
    include: { cliente: { select: { nomeFantasia: true } } },
  });
  for (const p of orcamentos) {
    const dias = Math.floor((agora.getTime() - p.dataEnvioOrcamento!.getTime()) / 86_400_000);
    para(p.responsavelId, {
      tipo: "ORCAMENTO_PARADO",
      titulo: `Orçamento nº ${p.numeroOrcamento} aguardando há ${dias} dias`,
      mensagem: p.cliente.nomeFantasia,
      entidade: "processo",
      entidadeId: p.id,
    });
  }

  // Fim do ciclo do contrato chegando: uma pessoa precisa confirmar o encerramento.
  const ciclos = await db.processoCiclo.findMany({
    where: { encerradoEm: null, fimPrevisto: { lte: somarDias(hojeData, diasContrato) }, processo: { etapaAtualId: ETAPA.VISITAS } },
    include: { processo: { include: { cliente: { select: { nomeFantasia: true } } } } },
  });
  for (const c of ciclos) {
    const vencido = c.fimPrevisto! <= hojeData;
    para(c.processo.responsavelId, {
      tipo: "CONTRATO_VENCENDO",
      titulo: `${c.processo.cliente.nomeFantasia}: ciclo ${c.numero} ${vencido ? "terminou" : "termina"} em ${fmtData(c.fimPrevisto)}`,
      mensagem: "Confirme o encerramento no processo para voltar ao Agendamento de diagnóstico.",
      entidade: "processo",
      entidadeId: c.processoId,
    });
  }

  // Visitas abaixo do contratado no ciclo.
  for (const l of await ciclosEmAndamento()) {
    if (l.atrasadas <= 0) continue;
    para(l.responsavel?.id, {
      tipo: "VISITA_ATRASADA",
      titulo: `${l.cliente}: ${l.atrasadas} visita(s) atrasada(s)`,
      mensagem: `${l.feitas} de ${l.esperadas} esperadas até hoje no ciclo ${l.ciclo?.numero ?? ""}`.trim(),
      entidade: "processo",
      entidadeId: l.processoId,
    });
  }

  // Documentos anexados perto da validade.
  const documentos = await db.arquivo.findMany({
    where: { validade: { lte: somarDias(hojeData, diasDocumento), gte: somarDias(hojeData, -30) } },
    include: {
      processo: { select: { id: true, responsavelId: true, cliente: { select: { nomeFantasia: true } } } },
      solicitacaoEscritorio: { select: { id: true, responsavelId: true, cliente: { select: { nomeFantasia: true } } } },
    },
  });
  for (const a of documentos) {
    const dono = a.processo ?? a.solicitacaoEscritorio;
    if (!dono) continue;
    const vencido = a.validade! < hojeData;
    para(dono.responsavelId, {
      tipo: "DOCUMENTO_VENCENDO",
      titulo: `${a.tipo || a.descricao || "Documento"} ${vencido ? "venceu" : "vence"} em ${fmtData(a.validade)}`,
      mensagem: dono.cliente.nomeFantasia,
      entidade: a.processo ? "processo" : "solicitacao",
      entidadeId: dono.id,
    });
  }

  // Solicitações do escritório com prazo chegando ou vencido.
  const solicitacoes = await db.solicitacaoEscritorio.findMany({
    where: { status: "EM_ABERTO", prazo: { lte: somarDias(hojeData, diasSolicitacao) } },
    include: { cliente: { select: { nomeFantasia: true } } },
  });
  for (const s of solicitacoes) {
    const vencida = s.prazo! < hojeData;
    para(s.responsavelId, {
      tipo: s.requerValidacao ? "VALIDACAO_PENDENTE" : "SOLICITACAO_PRAZO",
      titulo: `${s.servico}: prazo ${vencida ? "vencido" : "chegando"} (${fmtData(s.prazo)})`,
      mensagem: s.cliente.nomeFantasia,
      entidade: "solicitacao",
      entidadeId: s.id,
    });
  }

  let criadas = 0;
  for (const aviso of avisos) {
    if (await jaAvisado(aviso.usuarioId!, aviso.tipo, aviso.entidadeId, agora)) continue;
    await notificar(db, aviso);
    criadas++;
  }
  return criadas;
}

async function jaAvisado(usuarioId: string, tipo: TipoNotificacao, entidadeId: string | undefined, agora: Date) {
  const existente = await db.notificacao.findFirst({
    where: {
      usuarioId,
      tipo,
      entidadeId: entidadeId ?? null,
      OR: [{ lidaEm: null }, { criadoEm: { gte: somarDias(agora, -DIAS_SEM_REPETIR) } }],
    },
    select: { id: true },
  });
  return Boolean(existente);
}
