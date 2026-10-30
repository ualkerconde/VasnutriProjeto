// Regras do Planejamento (quadro de visitas), sem acesso ao banco (testáveis isoladamente).
import type { StatusVisita } from "@/generated/prisma/enums";

export type AcaoCartao = "criar" | "mover" | "iniciar" | "finalizar";
export type PermissoesCartao = Record<AcaoCartao, boolean>;

export const ACOES_CARTAO: { chave: AcaoCartao; rotulo: string; descricao: string }[] = [
  { chave: "criar", rotulo: "Agendar", descricao: "Criar e cancelar cartões de visita" },
  { chave: "mover", rotulo: "Mover", descricao: "Trocar o consultor ou o horário do cartão" },
  { chave: "iniciar", rotulo: "Iniciar", descricao: "Marcar o início da visita" },
  { chave: "finalizar", rotulo: "Finalizar", descricao: "Encerrar com resumo, checklist e fotos" },
];

export const ROTULO_STATUS_VISITA: Record<StatusVisita, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

/**
 * Junta as regras dos perfis do usuário: basta um perfil permitir.
 * Perfil sem regra salva pode tudo. Administrador pode sempre.
 */
export function permissoesDoUsuario(
  perfilIds: string[],
  regras: ({ perfilId: string } & PermissoesCartao)[],
  administrador: boolean,
): PermissoesCartao {
  const todas = { criar: true, mover: true, iniciar: true, finalizar: true };
  if (administrador) return todas;
  const porPerfil = new Map(regras.map((r) => [r.perfilId, r]));
  const resultado = { criar: false, mover: false, iniciar: false, finalizar: false };
  for (const id of perfilIds) {
    const r = porPerfil.get(id) ?? todas;
    for (const acao of Object.keys(resultado) as AcaoCartao[]) resultado[acao] ||= r[acao];
  }
  return resultado;
}

/** O que o cartão aceita agora, conforme o status. */
export function proximasAcoes(status: StatusVisita) {
  return {
    iniciar: status === "AGENDADA",
    finalizar: status === "EM_ANDAMENTO",
    mover: status !== "CONCLUIDA",
    cancelar: status === "AGENDADA",
  };
}

const FUSO_OFFSET = "-03:00";

/** "2026-10-28" da data no horário de Brasília. */
export function diaIso(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

/** Segunda-feira (00:00 em Brasília) da semana que contém o dia, e a segunda seguinte. */
export function semanaDe(dia: string): { inicio: Date; fim: Date; segunda: string } {
  const base = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return semanaDe(diaIso(new Date()));
  const recuo = (base.getUTCDay() + 6) % 7;
  const segunda = new Date(base.getTime() - recuo * 86_400_000).toISOString().slice(0, 10);
  const inicio = new Date(`${segunda}T00:00:00${FUSO_OFFSET}`);
  return { inicio, fim: new Date(inicio.getTime() + 7 * 86_400_000), segunda };
}

export function deslocarSemana(segunda: string, semanas: number): string {
  return new Date(new Date(`${segunda}T12:00:00Z`).getTime() + semanas * 7 * 86_400_000).toISOString().slice(0, 10);
}
