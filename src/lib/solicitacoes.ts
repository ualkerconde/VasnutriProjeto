/** Cor da solicitação: vencida em vermelho, no prazo em verde (como no AppSheet). */
export function situacaoSolicitacao(s: { status: string; prazo: Date | null }, hojeData: Date) {
  if (s.status === "CONCLUIDO") return { rotulo: "Concluída", cor: "cinza" as const };
  if (s.prazo && s.prazo < hojeData) return { rotulo: "Prazo vencido", cor: "vermelho" as const };
  return { rotulo: "Em aberto, no prazo", cor: "verde" as const };
}
