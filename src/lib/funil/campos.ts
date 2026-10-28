// Campos do processo que podem ter regra de edição por etapa e de visibilidade por perfil
// (Cadastros > Permissões do funil). A chave é guardada na tabela campos_processo.

export const CAMPOS_PROCESSO = [
  { chave: "numeroContrato", rotulo: "Nº do contrato" },
  { chave: "plano", rotulo: "Plano" },
  { chave: "valorMensal", rotulo: "Valor mensal" },
  { chave: "diaVencimento", rotulo: "Dia de vencimento" },
  { chave: "validadeContrato", rotulo: "Validade do contrato" },
  { chave: "visitasContratadas", rotulo: "Visitas contratadas" },
  { chave: "cargaHorariaVisita", rotulo: "Carga horária por visita" },
  { chave: "dataEnvioAssinatura", rotulo: "Envio para assinatura" },
  { chave: "dataAssinatura", rotulo: "Assinado em" },
  { chave: "emailRelatorios", rotulo: "E-mail para relatórios técnicos" },
  { chave: "inclusoes", rotulo: "O contrato inclui (fichas, informação nutricional, cardápios)" },
  { chave: "documentacoes", rotulo: "Documentação contratada" },
  { chave: "observacoes", rotulo: "Observações" },
  { chave: "pendencias", rotulo: "Pendências" },
] as const;

export type ChaveCampo = (typeof CAMPOS_PROCESSO)[number]["chave"];

export type RegraCampo = { visivel: boolean; editavel: boolean };

export type ConfigCampo = { chave: string; etapasEditaveis: number[]; sensivel: boolean; perfisVisiveis: string[] };

/**
 * Decide o que o usuário vê e edita em cada campo, dada a etapa do processo.
 * - podeAlterar: o perfil pode mexer no processo nesta etapa (regra por etapa).
 * - campo sem configuração: editável em todas as etapas e visível para todos.
 * - campo sensível: só os perfis marcados (e o Administrador) veem.
 */
export function regrasDosCampos(opcoes: {
  etapa: number;
  podeAlterar: boolean;
  administrador: boolean;
  perfilIds: string[];
  configs: ConfigCampo[];
}): Record<ChaveCampo, RegraCampo> {
  const porChave = new Map(opcoes.configs.map((c) => [c.chave, c]));
  const regras = {} as Record<ChaveCampo, RegraCampo>;
  for (const { chave } of CAMPOS_PROCESSO) {
    const c = porChave.get(chave);
    const visivel = !c?.sensivel || opcoes.administrador || c.perfisVisiveis.some((id) => opcoes.perfilIds.includes(id));
    const etapaLibera = !c || c.etapasEditaveis.includes(opcoes.etapa);
    regras[chave] = { visivel, editavel: visivel && opcoes.podeAlterar && etapaLibera };
  }
  return regras;
}
