import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, Cartao, EstadoVazio, Grade, LinkBotao, Selecao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { camposVisiveis } from "@/lib/funil/permissoes";
import { filtroContratoVigente, formatarCnpj, TIPOS_CONTATO } from "@/lib/clientes";
import { fmtData } from "@/lib/datas";
import { db } from "@/lib/db";
import { servicosAtivos, usuariosAtivos } from "@/lib/listas";
import { adicionarContato, excluirCliente, removerContato, salvarCliente } from "../acoes";
import { CamposCliente } from "../campos-cliente";

export const metadata: Metadata = { title: "Cliente" };

export default async function DetalheCliente({ params }: PageProps<"/clientes/[id]">) {
  const usuario = await exigirModulo("CLIENTES");
  const ve = await camposVisiveis(usuario);
  const { id } = await params;

  const [cliente, servicos, gestores, vigente] = await Promise.all([
    db.cliente.findUnique({
      where: { id },
      include: {
        contatos: { orderBy: { tipo: "asc" } },
        servicos: true,
        processos: { orderBy: { criadoEm: "desc" }, include: { etapaAtual: true } },
        solicitacoesEscritorio: { orderBy: { data: "desc" }, take: 10 },
      },
    }),
    servicosAtivos(),
    usuariosAtivos(),
    db.processo.findFirst({ where: { clienteId: id, ...filtroContratoVigente() }, select: { id: true } }),
  ]);
  if (!cliente) notFound();
  const veFunil = usuario.modulos.includes("FUNIL");

  return (
    <>
      <CabecalhoPagina
        sobretitulo={cliente.cnpj ? `CNPJ ${formatarCnpj(cliente.cnpj)}` : "Cliente"}
        titulo={cliente.nomeFantasia}
        descricao={cliente.razaoSocial ?? undefined}
        acoes={
          <>
            {vigente ? <Selo cor="verde">Contrato ativo</Selo> : <Selo>Sem contrato ativo</Selo>}
            {(usuario.modulos.includes("INDICADORES") || usuario.modulos.includes("FINANCEIRO")) && (
              <LinkBotao href={`/indicadores/cliente/${cliente.id}`} variante="secundario">
                Painel do cliente
              </LinkBotao>
            )}
            {veFunil && <LinkBotao href={`/funil/novo?cliente=${cliente.id}`}>Novo processo</LinkBotao>}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Dados cadastrais" className="flex-[999_1_520px]">
          <Formulario acao={salvarCliente.bind(null, cliente.id)}>
            <CamposCliente
              cliente={cliente}
              servicos={servicos}
              gestores={gestores}
              servicosMarcados={cliente.servicos.map((s) => s.servicoId)}
            />
          </Formulario>
        </Cartao>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <Cartao titulo="Contatos">
            {cliente.contatos.length === 0 ? (
              <p className="mb-4 text-sm text-suave">Nenhum contato ainda.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-2">
                {cliente.contatos.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-fundo px-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="block text-xs font-semibold text-suave">{TIPOS_CONTATO[c.tipo]}</span>
                      <span className="break-words">{c.valor}</span>
                      {c.nome && <span className="text-suave"> · {c.nome}</span>}
                    </span>
                    <BotaoAcao acao={removerContato.bind(null, c.id)} variante="fantasma" rotulo="Remover contato" confirmar="Remover este contato?">
                      ✕
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
            <Formulario acao={adicionarContato.bind(null, cliente.id)} botao="Adicionar contato" variante="secundario" limparAoSalvar>
              <Selecao
                rotulo="Tipo"
                nome="tipo"
                opcoes={Object.entries(TIPOS_CONTATO).map(([valor, rotulo]) => ({ valor, rotulo }))}
              />
              <Grade>
                <Campo rotulo="E-mail ou telefone" nome="valor" required />
                <Campo rotulo="Nome (opcional)" nome="nome" />
              </Grade>
            </Formulario>
          </Cartao>

          <Cartao titulo="Excluir cliente">
            <p className="mb-3 text-sm text-suave">Só é possível excluir clientes sem processos nem solicitações.</p>
            <BotaoAcao acao={excluirCliente.bind(null, cliente.id)} variante="perigo" confirmar="Excluir este cliente de vez?">
              Excluir cliente
            </BotaoAcao>
          </Cartao>
        </div>
      </div>

      <Cartao titulo="Processos e contratos">
        {cliente.processos.length === 0 ? (
          <EstadoVazio>Nenhum processo para este cliente.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Orçamento", "Etapa", "Contrato", "Validade", "Criado em"]}>
            {cliente.processos.map((p) => (
              <tr key={p.id}>
                <td>
                  {veFunil ? (
                    <Link href={`/funil/${p.id}`} className="font-semibold hover:text-verde">
                      Nº {p.numeroOrcamento}
                    </Link>
                  ) : (
                    `Nº ${p.numeroOrcamento}`
                  )}
                </td>
                <td>
                  <Selo cor={p.etapaAtual.final ? "vermelho" : p.etapaAtual.id === 11 ? "verde" : "cinza"}>
                    {p.etapaAtual.id}. {p.etapaAtual.nome}
                  </Selo>
                </td>
                <td>{ve.numeroContrato ? (p.numeroContrato ?? "—") : "•••"}</td>
                <td>{ve.validadeContrato ? fmtData(p.validadeContrato) : "•••"}</td>
                <td>{fmtData(p.criadoEm)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>

      {cliente.solicitacoesEscritorio.length > 0 && (
        <Cartao titulo="Solicitações do escritório">
          <ul className="flex flex-col gap-2">
            {cliente.solicitacoesEscritorio.map((s) => (
              <li key={s.id}>
                <Link href={`/solicitacoes/${s.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-fundo px-3 py-2.5 text-sm hover:text-verde">
                  <span className="font-semibold">{s.servico}</span>
                  <span className="text-suave">{fmtData(s.data)}</span>
                  <Selo cor={s.status === "CONCLUIDO" ? "verde" : "ambar"}>{s.status === "CONCLUIDO" ? "Concluída" : "Em aberto"}</Selo>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}
