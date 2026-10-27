import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { hoje, somarMeses } from "@/lib/datas";
import { notificar } from "@/lib/notificacoes";
import { ETAPA } from "./regras";

type Tx = Prisma.TransactionClient;

/**
 * Muda o processo de etapa: fecha a linha aberta do histórico, abre a nova, troca o responsável
 * e avisa quem passou a ser responsável. Ao entrar em Visitas técnicas, abre um ciclo do contrato.
 */
export async function mudarEtapa(
  tx: Tx,
  p: { processoId: string; para: number; responsavelId: string | null; motivo?: string | null; autorId: string },
) {
  const agora = new Date();
  const processo = await tx.processo.findUniqueOrThrow({
    where: { id: p.processoId },
    include: { cliente: { select: { nomeFantasia: true } } },
  });
  const etapa = await tx.etapa.findUniqueOrThrow({ where: { id: p.para } });

  await tx.processoEtapaHistorico.updateMany({ where: { processoId: p.processoId, fim: null }, data: { fim: agora } });
  await tx.processoEtapaHistorico.create({
    data: {
      processoId: p.processoId,
      etapaId: p.para,
      inicio: agora,
      responsavelId: p.responsavelId,
      motivo: p.motivo ?? null,
    },
  });
  await tx.processo.update({ where: { id: p.processoId }, data: { etapaAtualId: p.para, responsavelId: p.responsavelId } });

  if (p.para === ETAPA.VISITAS) await abrirCicloSeNecessario(tx, p.processoId, processo.validadeContrato);

  await notificar(
    tx,
    {
      usuarioId: p.responsavelId,
      tipo: p.responsavelId !== processo.responsavelId ? "PROCESSO_ATRIBUIDO" : "ETAPA_ALTERADA",
      titulo: `${processo.cliente.nomeFantasia} foi para ${etapa.nome}`,
      mensagem: p.motivo ? `Motivo: ${p.motivo}` : `Orçamento nº ${processo.numeroOrcamento}`,
      entidade: "processo",
      entidadeId: p.processoId,
    },
    p.autorId,
  );
}

/** Começa um ciclo novo, a menos que já exista um aberto (ex.: voltou e avançou de novo). */
export async function abrirCicloSeNecessario(tx: Tx, processoId: string, validadeContrato: Date | null) {
  const aberto = await tx.processoCiclo.findFirst({ where: { processoId, encerradoEm: null } });
  if (aberto) return aberto;
  const ultimo = await tx.processoCiclo.findFirst({ where: { processoId }, orderBy: { numero: "desc" } });
  const inicio = hoje();
  const fimPrevisto = validadeContrato && validadeContrato > inicio ? validadeContrato : somarMeses(inicio, 12);
  return tx.processoCiclo.create({
    data: { processoId, numero: (ultimo?.numero ?? 0) + 1, inicio, fimPrevisto },
  });
}

export function cicloAberto(tx: Tx, processoId: string) {
  return tx.processoCiclo.findFirst({ where: { processoId, encerradoEm: null }, orderBy: { numero: "desc" } });
}
