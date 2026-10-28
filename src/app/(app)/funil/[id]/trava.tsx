import type { ReactNode } from "react";
import { Aviso } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { podeAlterarNaEtapa } from "@/lib/funil/permissoes";

/**
 * Deixa o conteúdo só para leitura quando o perfil não pode alterar o processo na etapa atual
 * (Cadastros › Permissões do funil). As ações conferem a mesma regra no servidor.
 */
export async function TravaProcesso({ processoId, children }: { processoId: string; children: ReactNode }) {
  const usuario = await exigirUsuario();
  const processo = await db.processo.findUnique({ where: { id: processoId }, select: { etapaAtual: { select: { id: true, nome: true } } } });
  const pode = !processo || (await podeAlterarNaEtapa(usuario, processo.etapaAtual.id));
  if (pode) return <>{children}</>;
  return (
    <>
      <Aviso>
        Seu perfil pode ver, mas não alterar processos na etapa <strong>{processo.etapaAtual.nome}</strong>.
      </Aviso>
      <fieldset disabled className="contents">
        {children}
      </fieldset>
    </>
  );
}
