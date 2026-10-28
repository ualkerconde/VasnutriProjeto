import "server-only";
import type { UsuarioAtual } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { ErroValidacao } from "@/lib/form";
import { regrasDosCampos, type ChaveCampo, type RegraCampo } from "./campos";

export const ADMINISTRADOR = "Administrador";

export function ehAdministrador(usuario: UsuarioAtual) {
  return usuario.perfis.includes(ADMINISTRADOR);
}

/** O perfil do usuário pode alterar processos que estão nesta etapa? */
export async function podeAlterarNaEtapa(usuario: UsuarioAtual, etapaId: number) {
  if (ehAdministrador(usuario)) return true;
  const permissao = await db.etapaPerfil.findFirst({ where: { etapaId, perfilId: { in: usuario.perfilIds } }, select: { etapaId: true } });
  return Boolean(permissao);
}

export type RegrasProcesso = { podeAlterar: boolean; campos: Record<ChaveCampo, RegraCampo> };

export async function regrasDoProcesso(usuario: UsuarioAtual, etapaId: number): Promise<RegrasProcesso> {
  const [podeAlterar, configs] = await Promise.all([podeAlterarNaEtapa(usuario, etapaId), db.campoProcesso.findMany()]);
  return {
    podeAlterar,
    campos: regrasDosCampos({ etapa: etapaId, podeAlterar, administrador: ehAdministrador(usuario), perfilIds: usuario.perfilIds, configs }),
  };
}

/** Para nas ações que alteram o processo quando o perfil não pode mexer na etapa atual. */
export async function exigirAlteracaoProcesso(usuario: UsuarioAtual, processoId: string | null | undefined) {
  if (!processoId) return;
  const processo = await db.processo.findUnique({ where: { id: processoId }, select: { etapaAtual: { select: { id: true, nome: true } } } });
  if (!processo) throw new ErroValidacao("Processo não encontrado.");
  if (!(await podeAlterarNaEtapa(usuario, processo.etapaAtual.id))) {
    throw new ErroValidacao(
      `Seu perfil pode ver, mas não alterar processos na etapa "${processo.etapaAtual.nome}". Isso é definido em Cadastros › Permissões do funil.`,
    );
  }
}

/** Campos que o usuário pode ver, fora da tela do processo (ex.: lista de processos do cliente). */
export async function camposVisiveis(usuario: UsuarioAtual) {
  const { campos } = await regrasDoProcesso(usuario, 0);
  return Object.fromEntries(Object.entries(campos).map(([chave, regra]) => [chave, regra.visivel])) as Record<ChaveCampo, boolean>;
}
