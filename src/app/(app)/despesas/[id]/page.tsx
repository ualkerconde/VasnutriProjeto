import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, Cartao, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, fmtMoeda, hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { clientesParaSelecao, opcoes } from "@/lib/listas";
import { anexarComprovante, excluirDespesa, removerComprovante, salvarDespesa } from "../acoes";
import { CamposDespesa } from "../campos";

export const metadata: Metadata = { title: "Despesa" };

export default async function DetalheDespesa({ params }: PageProps<"/despesas/[id]">) {
  const usuario = await exigirModulo("DESPESAS");
  const { id } = await params;
  const [despesa, categorias, clientes] = await Promise.all([
    db.despesa.findUnique({
      where: { id },
      include: { categoria: true, usuario: { select: { nome: true } }, arquivos: { orderBy: { criadoEm: "asc" }, select: { id: true, descricao: true, mime: true } } },
    }),
    db.categoriaDespesa.findMany({ orderBy: { nome: "asc" } }),
    clientesParaSelecao(),
  ]);
  if (!despesa || (despesa.usuarioId !== usuario.id && !usuario.modulos.includes("FINANCEIRO"))) notFound();

  return (
    <>
      <CabecalhoPagina
        sobretitulo={`Despesa de ${despesa.usuario.nome}`}
        titulo={`${fmtMoeda(despesa.valor)} · ${despesa.categoria.nome}`}
        descricao={`${fmtData(despesa.data)}${despesa.descricao ? ` · ${despesa.descricao}` : ""}`}
        acoes={<LinkBotao href="/despesas" variante="secundario">Voltar</LinkBotao>}
      />
      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Dados da despesa" className="flex-[999_1_480px]">
          <Formulario acao={salvarDespesa.bind(null, despesa.id)}>
            <CamposDespesa
              categorias={categorias.filter((c) => c.ativo || c.id === despesa.categoriaId).map((c) => ({ valor: c.id, rotulo: c.nome }))}
              clientes={opcoes(clientes, (c) => c.nomeFantasia)}
              despesa={despesa}
              hoje={hoje()}
            />
          </Formulario>
        </Cartao>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <Cartao titulo="Comprovantes">
            {despesa.arquivos.length === 0 ? (
              <p className="mb-4 text-sm text-suave">Nenhum comprovante ainda.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-2">
                {despesa.arquivos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl bg-fundo p-2.5">
                    <a href={`/arquivos/${a.id}`} target="_blank" rel="noopener" className="flex size-14 flex-none items-center justify-center overflow-hidden rounded-lg bg-linha-suave text-xs font-bold text-suave">
                      {a.mime?.startsWith("image/") && a.mime !== "image/svg+xml" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/arquivos/${a.id}`} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        (a.mime?.split("/")[1] ?? "arq").slice(0, 4).toUpperCase()
                      )}
                    </a>
                    <a href={`/arquivos/${a.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-verde">
                      {a.descricao ?? "Comprovante"}
                    </a>
                    <BotaoAcao acao={removerComprovante.bind(null, a.id)} variante="fantasma" rotulo="Remover comprovante" confirmar="Remover este comprovante?">
                      ✕
                    </BotaoAcao>
                  </li>
                ))}
              </ul>
            )}
            <Formulario acao={anexarComprovante.bind(null, despesa.id)} botao="Anexar" variante="secundario" limparAoSalvar>
              <Campo rotulo="Foto ou PDF" nome="comprovante" type="file" required multiple accept="image/*,application/pdf" className="[&_input]:py-2" />
            </Formulario>
          </Cartao>
          <Cartao titulo="Excluir despesa">
            <BotaoAcao acao={excluirDespesa.bind(null, despesa.id)} variante="perigo" confirmar="Excluir esta despesa e os comprovantes?">
              Excluir despesa
            </BotaoAcao>
          </Cartao>
        </div>
      </div>
    </>
  );
}
