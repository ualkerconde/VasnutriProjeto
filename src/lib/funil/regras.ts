// Regras do funil, sem acesso ao banco (testáveis isoladamente).
import type { StatusOrcamento } from "@/generated/prisma/enums";

export const ETAPA = {
  ESCOPO: 1,
  COMERCIAL: 2,
  FECHAMENTO: 3,
  ASSINATURA: 4,
  FOOD_CHECKER: 5,
  PASTA_BUROCRATICA: 6,
  AGENDAMENTO_DIAGNOSTICO: 7,
  COLETA_DADOS: 8,
  DOCUMENTACAO: 9,
  TREINAMENTO: 10,
  VISITAS: 11,
  RECUSADOS: 12,
} as const;

/** Item de checklist da etapa 10 que libera a passagem para Visitas técnicas. */
export const ITEM_TREINAMENTO = "Treinamento realizado";

export const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  A_ENVIAR: "À enviar",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
};

/** Por que o processo não pode ir para a próxima etapa, ou null se pode. */
export function bloqueioAvanco(p: { etapa: number; statusOrcamento: StatusOrcamento; treinamentoRealizado: boolean }): string | null {
  if (p.etapa === ETAPA.VISITAS) return "Em Visitas técnicas o processo fica até o fim do contrato.";
  if (p.etapa === ETAPA.RECUSADOS) return "Orçamento recusado. Use \"Recuperar orçamento\" para voltar ao Comercial.";
  if (p.etapa === ETAPA.COMERCIAL && p.statusOrcamento !== "APROVADO") return "O orçamento precisa estar aprovado.";
  if (p.etapa === ETAPA.TREINAMENTO && !p.treinamentoRealizado) return `Marque "${ITEM_TREINAMENTO}" no checklist.`;
  return null;
}

/** Etapas para as quais o processo pode voltar. */
export function etapasDeRetorno(etapa: number): number[] {
  if (etapa < 2 || etapa === ETAPA.RECUSADOS) return [];
  return Array.from({ length: etapa - 1 }, (_, i) => i + 1);
}

export function podeMexerNoOrcamento(etapa: number): boolean {
  return etapa <= ETAPA.FECHAMENTO;
}

/** Ações de orçamento disponíveis conforme o status e a etapa. */
export function acoesOrcamento(etapa: number, status: StatusOrcamento) {
  const ativo = podeMexerNoOrcamento(etapa);
  return {
    enviar: ativo && status === "A_ENVIAR",
    aprovar: ativo && (status === "A_ENVIAR" || status === "AGUARDANDO_APROVACAO"),
    recusar: ativo && (status === "A_ENVIAR" || status === "AGUARDANDO_APROVACAO"),
    recuperar: etapa === ETAPA.RECUSADOS,
  };
}

/** Situação das visitas de um ciclo comparando o feito com o esperado até hoje. */
export function situacaoVisitas(c: {
  inicio: Date;
  fimPrevisto: Date | null;
  contratadas: number | null;
  feitas: number;
  hoje: Date;
}): { esperadas: number | null; atrasadas: number } {
  if (!c.contratadas || c.contratadas <= 0) return { esperadas: null, atrasadas: 0 };
  const fim = c.fimPrevisto ?? new Date(c.inicio.getTime() + 365 * 86_400_000);
  const total = Math.max(1, fim.getTime() - c.inicio.getTime());
  const decorrido = Math.min(Math.max(0, c.hoje.getTime() - c.inicio.getTime()), total);
  // Cada visita "vence" no fim do seu período; a primeira só é cobrada depois do primeiro período.
  const esperadas = Math.min(c.contratadas, Math.floor((decorrido / total) * c.contratadas));
  return { esperadas, atrasadas: Math.max(0, esperadas - c.feitas) };
}
