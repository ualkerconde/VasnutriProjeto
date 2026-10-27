import type { Metadata } from "next";
import { Formulario } from "@/components/formulario";
import { CabecalhoPagina, Caixa, Campo, Cartao, Grade, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { criarUsuario } from "../acoes";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NovoUsuario() {
  await exigirModulo("USUARIOS");
  const perfis = await db.perfil.findMany({ orderBy: { nome: "asc" } });

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Usuários"
        titulo="Novo usuário"
        acoes={
          <LinkBotao href="/usuarios" variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <Cartao>
        <Formulario acao={criarUsuario} botao="Criar usuário">
          <Grade>
            <Campo rotulo="Nome" nome="nome" required />
            <Campo rotulo="E-mail" nome="email" type="email" required />
            <Campo rotulo="Senha inicial" nome="senha" type="password" required minLength={10} ajuda="Pelo menos 10 caracteres. A pessoa pode trocar depois." />
          </Grade>
          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold text-texto-2">Perfis</legend>
            <div className="flex flex-wrap gap-x-6">
              {perfis.map((p) => (
                <Caixa key={p.id} rotulo={p.nome} nome="perfis" value={p.id} />
              ))}
            </div>
          </fieldset>
        </Formulario>
      </Cartao>
    </>
  );
}
