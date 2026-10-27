import type { Metadata } from "next";
import { Formulario } from "@/components/formulario";
import { CabecalhoPagina, Cartao, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { servicosAtivos, usuariosAtivos } from "@/lib/listas";
import { criarCliente } from "../acoes";
import { CamposCliente } from "../campos-cliente";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  await exigirModulo("CLIENTES");
  const [servicos, gestores] = await Promise.all([servicosAtivos(), usuariosAtivos()]);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Clientes"
        titulo="Novo cliente"
        acoes={
          <LinkBotao href="/clientes" variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <Cartao>
        <Formulario acao={criarCliente} botao="Cadastrar cliente">
          <CamposCliente servicos={servicos} gestores={gestores} />
        </Formulario>
      </Cartao>
    </>
  );
}
