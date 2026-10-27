import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, Cartao, Dados, LinkBotao, Selecao, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, hoje, paraInputData } from "@/lib/datas";
import { db } from "@/lib/db";
import { clientesParaSelecao, opcoes, usuariosAtivos } from "@/lib/listas";
import { enviarArquivo } from "../../funil/[id]/acoes-tecnicas";
import { FormArquivo, ItemArquivo } from "@/components/arquivos";
import { concluirSolicitacao, excluirSolicitacao, reabrirSolicitacao, salvarSolicitacao } from "../acoes";
import { CamposSolicitacao } from "../campos";
import { situacaoSolicitacao } from "@/lib/solicitacoes";

export const metadata: Metadata = { title: "Solicitação" };

export default async function DetalheSolicitacao({ params }: PageProps<"/solicitacoes/[id]">) {
  await exigirModulo("SOLICITACOES");
  const { id } = await params;
  const s = await db.solicitacaoEscritorio.findUnique({
    where: { id },
    include: {
      cliente: true,
      processo: { select: { id: true, numeroOrcamento: true } },
      validadoPor: { select: { nome: true } },
      arquivos: { orderBy: { criadoEm: "desc" }, include: { enviadoPor: { select: { nome: true } } } },
    },
  });
  if (!s) notFound();
  const [clientes, usuarios, processos] = await Promise.all([
    clientesParaSelecao(),
    usuariosAtivos(),
    db.processo.findMany({ where: { clienteId: s.clienteId }, select: { id: true, numeroOrcamento: true }, orderBy: { numeroOrcamento: "desc" } }),
  ]);
  const hojeData = hoje();
  const sit = situacaoSolicitacao(s, hojeData);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Solicitação do escritório"
        titulo={s.servico}
        descricao={
          <>
            <Link href={`/clientes/${s.clienteId}`} className="font-semibold">
              {s.cliente.nomeFantasia}
            </Link>
            {s.processo && (
              <>
                {" · "}
                <Link href={`/funil/${s.processo.id}`}>Processo nº {s.processo.numeroOrcamento}</Link>
              </>
            )}
          </>
        }
        acoes={
          <>
            <Selo cor={sit.cor}>{sit.rotulo}</Selo>
            <LinkBotao href="/solicitacoes" variante="secundario">
              Voltar
            </LinkBotao>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Dados" className="flex-[999_1_520px]">
          <Formulario acao={salvarSolicitacao.bind(null, s.id)}>
            <CamposSolicitacao
              s={s}
              clientes={opcoes(clientes, (c) => c.nomeFantasia)}
              processos={processos.map((p) => ({ valor: p.id, rotulo: `Nº ${p.numeroOrcamento}` }))}
              usuarios={opcoes(usuarios, (u) => u.nome)}
            />
          </Formulario>
        </Cartao>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <Cartao titulo="Conclusão">
            {s.status === "CONCLUIDO" ? (
              <>
                <Dados
                  itens={[
                    ["Concluída em", fmtData(s.concluidoEm)],
                    ...(s.requerValidacao ? ([["Validada por", s.validadoPor?.nome ?? "—"]] as [string, string][]) : []),
                  ]}
                />
                <div className="mt-4">
                  <BotaoAcao acao={reabrirSolicitacao.bind(null, s.id)}>Reabrir</BotaoAcao>
                </div>
              </>
            ) : (
              <Formulario acao={concluirSolicitacao.bind(null, s.id)} botao="Concluir solicitação" variante="menta">
                <Campo rotulo="Data de conclusão" nome="concluidoEm" type="date" defaultValue={paraInputData(hojeData)} />
                {s.requerValidacao && <Selecao rotulo="Quem realizou a validação" nome="validadoPorId" required vazio="Escolha" opcoes={opcoes(usuarios, (u) => u.nome)} />}
              </Formulario>
            )}
          </Cartao>

          <Cartao titulo="Anexos">
            {s.arquivos.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {s.arquivos.map((a) => (
                  <ItemArquivo key={a.id} arquivo={a} hoje={hojeData} />
                ))}
              </ul>
            )}
            <FormArquivo acao={enviarArquivo.bind(null, { solicitacaoEscritorioId: s.id })} />
          </Cartao>

          <Cartao titulo="Excluir">
            <BotaoAcao acao={excluirSolicitacao.bind(null, s.id)} variante="perigo" confirmar="Excluir esta solicitação?">
              Excluir solicitação
            </BotaoAcao>
          </Cartao>
        </div>
      </div>
    </>
  );
}
