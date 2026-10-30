/** Dados da empresa vindos da Receita Federal, já no formato dos campos do cliente. */
export type DadosCnpj = {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  /** Situação cadastral (ATIVA, BAIXADA, INAPTA…). */
  situacao: string | null;
};

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

/** Confere os dígitos verificadores do CNPJ. */
export function cnpjValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * Number(base[i]), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

function limpo(valor: unknown): string | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const t = String(valor).replace(/\s+/g, " ").trim();
  return t === "" ? null : t;
}

const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** A Receita devolve tudo em maiúsculas; endereço fica mais legível como "Rua das Flores". */
export function capitalizar(valor: string | null): string | null {
  if (!valor) return null;
  return valor
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1)))
    .join(" ");
}

export function formatarCep(valor: string | null): string | null {
  if (!valor) return null;
  const d = somenteDigitos(valor);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor;
}

function semNumero(valor: string | null): string | null {
  return valor && /^(S\/?N|SN|0+)$/i.test(valor) ? "S/N" : valor;
}

/** Resposta de https://brasilapi.com.br/api/cnpj/v1/{cnpj} */
export function deBrasilApi(r: Record<string, unknown>): DadosCnpj {
  const tipo = limpo(r.descricao_tipo_de_logradouro);
  const rua = limpo(r.logradouro);
  const logradouro = tipo && rua && !rua.toUpperCase().startsWith(tipo.toUpperCase()) ? `${tipo} ${rua}` : rua;
  return {
    razaoSocial: limpo(r.razao_social),
    nomeFantasia: limpo(r.nome_fantasia),
    logradouro: capitalizar(logradouro),
    numero: semNumero(limpo(r.numero)),
    complemento: limpo(r.complemento),
    bairro: capitalizar(limpo(r.bairro)),
    cidade: capitalizar(limpo(r.municipio)),
    uf: limpo(r.uf)?.toUpperCase() ?? null,
    cep: formatarCep(limpo(r.cep)),
    situacao: limpo(r.descricao_situacao_cadastral),
  };
}

/** Resposta de https://receitaws.com.br/v1/cnpj/{cnpj} (reserva quando a BrasilAPI falha). */
export function deReceitaWs(r: Record<string, unknown>): DadosCnpj {
  return {
    razaoSocial: limpo(r.nome),
    nomeFantasia: limpo(r.fantasia),
    logradouro: capitalizar(limpo(r.logradouro)),
    numero: semNumero(limpo(r.numero)),
    complemento: limpo(r.complemento),
    bairro: capitalizar(limpo(r.bairro)),
    cidade: capitalizar(limpo(r.municipio)),
    uf: limpo(r.uf)?.toUpperCase() ?? null,
    cep: formatarCep(limpo(r.cep)),
    situacao: limpo(r.situacao),
  };
}
