// Regras do financeiro, sem acesso ao banco (testáveis isoladamente).

export type SituacaoParcela = "RECEBIDA" | "VENCIDA" | "A_RECEBER" | "CANCELADA";

export const ROTULO_SITUACAO: Record<SituacaoParcela, string> = {
  RECEBIDA: "Recebida",
  VENCIDA: "Vencida",
  A_RECEBER: "A receber",
  CANCELADA: "Cancelada",
};

export const COR_SITUACAO = { RECEBIDA: "verde", VENCIDA: "vermelho", A_RECEBER: "ambar", CANCELADA: "cinza" } as const;

export function situacaoParcela(p: { recebidoEm: Date | null; cancelada: boolean; vencimento: Date }, hoje: Date): SituacaoParcela {
  if (p.cancelada) return "CANCELADA";
  if (p.recebidoEm) return "RECEBIDA";
  return p.vencimento < hoje ? "VENCIDA" : "A_RECEBER";
}

function ultimoDiaDoMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

/** Vencimento no mês (0 = janeiro), ajustando dia 31 para o último dia do mês. */
export function vencimentoNoMes(ano: number, mes: number, dia: number): Date {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(Math.max(1, dia), ultimoDiaDoMes(a, m))));
}

export function competenciaDe(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export const MAXIMO_PARCELAS = 60;

/**
 * Parcelas mensais: a primeira vence no primeiro dia de vencimento a partir de `inicio`.
 * Com `fim`, gera até o último vencimento que não passa dele; com `quantidade`, gera esse número.
 */
export function planoDeParcelas(p: { inicio: Date; diaVencimento: number; fim?: Date | null; quantidade?: number | null }): { competencia: Date; vencimento: Date }[] {
  let ano = p.inicio.getUTCFullYear();
  let mes = p.inicio.getUTCMonth();
  if (vencimentoNoMes(ano, mes, p.diaVencimento) < p.inicio) mes++;
  const limite = Math.min(p.quantidade ?? MAXIMO_PARCELAS, MAXIMO_PARCELAS);
  const parcelas: { competencia: Date; vencimento: Date }[] = [];
  while (parcelas.length < limite) {
    const vencimento = vencimentoNoMes(ano, mes, p.diaVencimento);
    if (!p.quantidade && p.fim && vencimento > p.fim) break;
    parcelas.push({ competencia: competenciaDe(vencimento), vencimento });
    mes++;
    if (mes > 11) {
      ano += Math.floor(mes / 12);
      mes %= 12;
    }
  }
  return parcelas;
}

/** "2026-10" → primeiro dia do mês e do mês seguinte. Inválido ou vazio: o mês de `hoje`. */
export function intervaloDoMes(mes: string | undefined, hoje: Date): { inicio: Date; fim: Date; chave: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  const ano = m ? Number(m[1]) : hoje.getUTCFullYear();
  const indice = m ? Number(m[2]) - 1 : hoje.getUTCMonth();
  const inicio = new Date(Date.UTC(ano, indice, 1));
  const fim = new Date(Date.UTC(ano, indice + 1, 1));
  return { inicio, fim, chave: inicio.toISOString().slice(0, 7) };
}

export function deslocarMes(chave: string, meses: number): string {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 + meses, 1)).toISOString().slice(0, 7);
}

/** Meses inteiros entre duas datas (ex.: tempo de contrato). */
export function mesesEntre(inicio: Date, fim: Date): number {
  let meses = (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (fim.getUTCMonth() - inicio.getUTCMonth());
  if (fim.getUTCDate() < inicio.getUTCDate()) meses--;
  return Math.max(0, meses);
}

/** "1 ano e 3 meses", "8 meses", "menos de 1 mês". */
export function descreverMeses(meses: number): string {
  if (meses <= 0) return "menos de 1 mês";
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [anos ? `${anos} ano${anos > 1 ? "s" : ""}` : "", resto ? `${resto} ${resto > 1 ? "meses" : "mês"}` : ""].filter(Boolean);
  return partes.join(" e ");
}

/** Marco de relacionamento atingido nos últimos `janelaDias` (ex.: 6, 12, 18 meses), ou null. */
export function marcoAtingido(inicio: Date, hoje: Date, cadaMeses: number, janelaDias = 7): number | null {
  if (cadaMeses <= 0) return null;
  const meses = mesesEntre(inicio, hoje);
  if (meses === 0 || meses % cadaMeses !== 0) return null;
  const data = vencimentoNoMes(inicio.getUTCFullYear(), inicio.getUTCMonth() + meses, inicio.getUTCDate());
  const dias = (hoje.getTime() - data.getTime()) / 86_400_000;
  return dias >= 0 && dias <= janelaDias ? meses : null;
}
