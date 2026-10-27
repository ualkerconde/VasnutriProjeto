import type { Metadata } from "next";
import { Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, Cartao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth/sessao";
import { trocarMinhaSenha } from "../usuarios/acoes";

export const metadata: Metadata = { title: "Minha conta" };

export default async function MinhaConta() {
  const usuario = await exigirUsuario();
  return (
    <>
      <CabecalhoPagina sobretitulo="Minha conta" titulo={usuario.nome} descricao={`${usuario.email} · ${usuario.perfis.join(", ")}`} />
      <Cartao titulo="Trocar senha" className="max-w-xl">
        <Formulario acao={trocarMinhaSenha} botao="Trocar senha" limparAoSalvar>
          <Campo rotulo="Senha atual" nome="senhaAtual" type="password" required autoComplete="current-password" />
          <Campo rotulo="Nova senha" nome="novaSenha" type="password" required minLength={10} autoComplete="new-password" ajuda="Pelo menos 10 caracteres." />
          <Campo rotulo="Confirme a nova senha" nome="confirmacao" type="password" required minLength={10} autoComplete="new-password" />
        </Formulario>
      </Cartao>
    </>
  );
}
