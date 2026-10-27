import type { Metadata } from "next";
import Link from "next/link";
import { Formulario } from "@/components/formulario";
import { AreaTexto, CabecalhoPagina, Caixa, Campo, Cartao, Grade, LinkBotao, Selecao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { clientesParaSelecao, opcoes, usuariosAtivos } from "@/lib/listas";
import { criarProcesso } from "../acoes";

export const metadata: Metadata = { title: "Novo processo" };

export default async function NovoProcesso({ searchParams }: PageProps<"/funil/novo">) {
  const usuario = await exigirModulo("FUNIL");
  const { cliente } = await searchParams;
  const [clientes, usuarios] = await Promise.all([clientesParaSelecao(), usuariosAtivos()]);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Funil"
        titulo="Novo processo"
        descricao="O processo começa na etapa 1 com o orçamento À enviar. O número do orçamento é gerado automaticamente."
        acoes={
          <LinkBotao href="/funil" variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <Cartao className="max-w-3xl">
        {clientes.length === 0 ? (
          <p className="text-sm text-suave">
            Cadastre o cliente primeiro em{" "}
            <Link href="/clientes/novo" className="font-semibold">
              Clientes › Novo cliente
            </Link>
            .
          </p>
        ) : (
          <Formulario acao={criarProcesso} botao="Criar processo">
            <Grade>
              <Selecao
                rotulo="Cliente"
                nome="clienteId"
                required
                vazio="Escolha o cliente"
                defaultValue={typeof cliente === "string" ? cliente : ""}
                opcoes={opcoes(clientes, (c) => c.nomeFantasia)}
                ajuda="Não está na lista? Cadastre em Clientes."
              />
              <Selecao rotulo="Responsável" nome="responsavelId" defaultValue={usuario.id} opcoes={opcoes(usuarios, (u) => u.nome)} />
              <Campo rotulo="Plano" nome="plano" placeholder="Ex.: START - R$ 499,00 mensais" />
            </Grade>
            <AreaTexto rotulo="Observações" nome="observacoes" />
            <details className="rounded-xl bg-fundo p-4">
              <summary className="cursor-pointer text-sm font-semibold">Cliente que entra direto em Visitas técnicas</summary>
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-suave">
                  Para clientes que já têm contrato e não passam pelo funil. O processo nasce na etapa 11 com orçamento aprovado e o primeiro ciclo aberto.
                </p>
                <Caixa rotulo="Criar direto em Visitas técnicas" nome="diretoVisitas" />
                <Grade>
                  <Campo rotulo="Fim do contrato" nome="validadeContrato" type="date" />
                  <Campo rotulo="Visitas contratadas no ciclo" nome="visitasContratadas" type="number" min={0} />
                </Grade>
              </div>
            </details>
          </Formulario>
        )}
      </Cartao>
    </>
  );
}
