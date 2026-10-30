import "server-only";
import { db } from "@/lib/db";

/** Regras ajustáveis na tela de Cadastros, com o valor usado quando ninguém mudou. */
export const CONFIGURACOES = {
  um_processo_ativo_por_cliente: {
    padrao: true,
    rotulo: "Um processo em andamento por cliente",
    descricao: "Impede abrir um segundo processo para um cliente que já tem um em andamento.",
  },
  dias_orcamento_parado: {
    padrao: 7,
    rotulo: "Avisar orçamento aguardando há (dias)",
    descricao: "Notifica o responsável quando o orçamento espera aprovação por mais tempo que isso.",
  },
  dias_aviso_fim_contrato: {
    padrao: 30,
    rotulo: "Avisar vencimento do contrato com antecedência de (dias)",
    descricao: "Notifica o gestor do cliente e o responsável pelo processo antes do fim do contrato, para renovar.",
  },
  meses_marco_relacionamento: {
    padrao: 6,
    rotulo: "Avisar tempo de contrato a cada (meses)",
    descricao: "Ex.: 6 avisa o gestor aos 6 meses, 1 ano, 1 ano e meio… de contrato, para estreitar a relação. 0 desliga.",
  },
  dias_sem_movimentacao: {
    padrao: 15,
    rotulo: "Processo sem movimentação há (dias)",
    descricao: "No painel, entra nos itens críticos o processo sem nenhuma mudança por mais tempo que isso (fora de Visitas técnicas).",
  },
  dias_sem_visita: {
    padrao: 30,
    rotulo: "Cliente sem visita há (dias)",
    descricao: "No painel, clientes em Visitas técnicas sem visita concluída nesse período.",
  },
  dias_aviso_validade_documento: {
    padrao: 30,
    rotulo: "Avisar validade de documentos com antecedência de (dias)",
    descricao: "Vale para anexos com data de validade.",
  },
  dias_aviso_prazo_solicitacao: {
    padrao: 2,
    rotulo: "Avisar prazo de solicitação com antecedência de (dias)",
    descricao: "Solicitações do escritório em aberto perto do prazo.",
  },
} as const;

export type ChaveConfig = keyof typeof CONFIGURACOES;
type Valor<K extends ChaveConfig> = (typeof CONFIGURACOES)[K]["padrao"] extends boolean ? boolean : number;

export async function lerConfig<K extends ChaveConfig>(chave: K): Promise<Valor<K>> {
  const linha = await db.configuracao.findUnique({ where: { chave } });
  const padrao = CONFIGURACOES[chave].padrao;
  if (!linha || typeof linha.valor !== typeof padrao) return padrao as Valor<K>;
  return linha.valor as Valor<K>;
}

export async function lerTodasConfigs() {
  const linhas = await db.configuracao.findMany();
  const valores = new Map(linhas.map((l) => [l.chave, l.valor]));
  return (Object.keys(CONFIGURACOES) as ChaveConfig[]).map((chave) => {
    const padrao = CONFIGURACOES[chave].padrao;
    const salvo = valores.get(chave);
    return { chave, ...CONFIGURACOES[chave], valor: typeof salvo === typeof padrao ? (salvo as boolean | number) : padrao };
  });
}
