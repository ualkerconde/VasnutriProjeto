// Leitura dos campos de formulário (FormData) já no formato do banco.
// Campo vazio vira null para não gravar texto vazio.

export type EstadoForm = { erro?: string; ok?: string };

export class ErroValidacao extends Error {}

export function texto(f: FormData, nome: string): string | null {
  const valor = f.get(nome);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

export function textoObrigatorio(f: FormData, nome: string, rotulo: string): string {
  const valor = texto(f, nome);
  if (!valor) throw new ErroValidacao(`Preencha o campo "${rotulo}".`);
  return valor;
}

export function inteiro(f: FormData, nome: string): number | null {
  const valor = texto(f, nome);
  if (valor === null) return null;
  const n = Number(valor.replace(/\./g, ""));
  if (!Number.isInteger(n)) throw new ErroValidacao(`Valor inválido: ${valor}`);
  return n;
}

/** Aceita "1.000,50", "1000,50" e "1000.50". */
export function decimal(f: FormData, nome: string): string | null {
  const valor = texto(f, nome);
  if (valor === null) return null;
  return converterDecimal(valor);
}

export function converterDecimal(valor: string): string {
  let limpo = valor.replace(/[R$\s]/g, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  if (!Number.isFinite(n)) throw new ErroValidacao(`Valor inválido: ${valor}`);
  return n.toFixed(2);
}

/** Campo <input type="date">: "2026-10-27" → Date em UTC (meia-noite). */
export function data(f: FormData, nome: string): Date | null {
  const valor = texto(f, nome);
  if (valor === null) return null;
  const d = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new ErroValidacao(`Data inválida: ${valor}`);
  return d;
}

/** Campo <input type="datetime-local">, interpretado no horário de Brasília. */
export function dataHora(f: FormData, nome: string): Date | null {
  const valor = texto(f, nome);
  if (valor === null) return null;
  const d = new Date(`${valor}:00-03:00`);
  if (Number.isNaN(d.getTime())) throw new ErroValidacao(`Data e hora inválidas: ${valor}`);
  return d;
}

export function marcado(f: FormData, nome: string): boolean {
  return f.get(nome) === "on";
}

/** Sim / Não / vazio, para perguntas opcionais. */
export function simNao(f: FormData, nome: string): boolean | null {
  const valor = texto(f, nome);
  if (valor === "sim") return true;
  if (valor === "nao") return false;
  return null;
}

/** "a, b , c" → ["a", "b", "c"] */
export function lista(f: FormData, nome: string): string[] {
  const valores = f.getAll(nome).flatMap((v) => (typeof v === "string" ? v.split(",") : []));
  return valores.map((v) => v.trim()).filter(Boolean);
}

/** Executa a ação e transforma erros de validação em mensagem para o formulário. */
export async function tratar(fn: () => Promise<EstadoForm | void>): Promise<EstadoForm> {
  try {
    return (await fn()) ?? { ok: "Salvo." };
  } catch (erro) {
    if (erro instanceof ErroValidacao) return { erro: erro.message };
    if (temCodigo(erro, "P2002")) return { erro: mensagemDuplicado(erro) };
    if (temCodigo(erro, "P2003")) return { erro: "Este registro está em uso e não pode ser apagado." };
    throw erro;
  }
}

function mensagemDuplicado(erro: unknown) {
  const detalhe = JSON.stringify((erro as { meta?: unknown }).meta ?? {});
  if (detalhe.includes("cnpj")) return "Já existe um cliente com esse CNPJ.";
  if (detalhe.includes("email")) return "Já existe um usuário com esse e-mail.";
  if (detalhe.includes("nome") || detalhe.includes("descricao")) return "Já existe um item com esse nome.";
  return "Já existe um registro com esse valor.";
}

function temCodigo(erro: unknown, codigo: string): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && (erro as { code: unknown }).code === codigo;
}
