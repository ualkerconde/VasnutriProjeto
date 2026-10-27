import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao, LinkBotao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtDataHora } from "@/lib/datas";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Usuários" };

export default async function Usuarios() {
  await exigirModulo("USUARIOS");
  const usuarios = await db.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      perfis: { include: { perfil: true } },
      acessos: { where: { sucesso: true }, orderBy: { dataHora: "desc" }, take: 1 },
    },
  });

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Acesso"
        titulo="Usuários"
        descricao="Cada perfil define quais telas a pessoa vê."
        acoes={<LinkBotao href="/usuarios/novo">Novo usuário</LinkBotao>}
      />
      <Cartao>
        <Tabela cabecalho={["Nome", "E-mail", "Perfis", "Último acesso", "Situação"]}>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>
                <Link href={`/usuarios/${u.id}`} className="font-semibold hover:text-verde">
                  {u.nome}
                </Link>
              </td>
              <td className="text-texto-2">{u.email}</td>
              <td className="text-texto-2">{u.perfis.map((p) => p.perfil.nome).join(", ") || "—"}</td>
              <td className="text-texto-2">{fmtDataHora(u.acessos[0]?.dataHora)}</td>
              <td>{u.ativo ? <Selo cor="verde">Ativo</Selo> : <Selo>Desativado</Selo>}</td>
            </tr>
          ))}
        </Tabela>
      </Cartao>
    </>
  );
}
