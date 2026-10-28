import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { AreaTexto, CabecalhoPagina, Campo, Cartao, Grade, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { paraInputData } from "@/lib/datas";
import { db } from "@/lib/db";
import { adicionarSetor, excluirColeta, removerSetor, salvarColeta, salvarSetor } from "../../acoes-tecnicas";
import { TravaProcesso } from "../../trava";

export const metadata: Metadata = { title: "Coleta de dados" };

// Perguntas do formulário de diagnóstico, na ordem do AppSheet.
const GRUPOS: { titulo: string; campos: [string, string, boolean?][] }[] = [
  {
    titulo: "Funcionamento",
    campos: [
      ["horarioPublico", "Horário de funcionamento ao público"],
      ["horarioProducao", "Horário de produção"],
    ],
  },
  {
    titulo: "Responsáveis",
    campos: [
      ["responsavelLegalNome", "Responsável legal (nome)"],
      ["responsavelLegalCargo", "Cargo"],
      ["responsavelLegalRg", "RG"],
      ["responsavelLegalCpf", "CPF"],
      ["responsavelLegalTelefone", "Telefone do responsável"],
      ["telefoneEmpresa", "Telefone da empresa"],
      ["responsavelRelatorio", "Quem recebe o relatório"],
      ["encarregadosSetores", "Encarregados de cada setor", true],
    ],
  },
  {
    titulo: "Água, lixo e controle de pragas",
    campos: [
      ["dedetizadora", "Dedetizadora", true],
      ["fornecimentoAgua", "Fornecimento de água", true],
      ["caixasDagua", "Caixas d'água (quantidade e litros)", true],
      ["limpezaCaixaDagua", "Limpeza da caixa d'água", true],
      ["coletaLixoComum", "Coleta de lixo comum", true],
      ["coletaLixoOrganico", "Coleta de lixo orgânico", true],
      ["coletaOleo", "Coleta de óleo", true],
    ],
  },
  {
    titulo: "Higiene e equipamentos",
    campos: [
      ["medicinaSegurancaTrabalho", "Medicina e segurança do trabalho (PCMSO/PPRA)", true],
      ["responsaveisHigienizacao", "Responsáveis pela higienização", true],
      ["materiaisLimpeza", "Materiais de limpeza e diluição", true],
      ["escalaLimpeza", "Escala de limpeza", true],
      ["equipamentosRefrigeracao", "Equipamentos de refrigeração e aquecimento", true],
      ["principaisFornecedores", "Principais fornecedores", true],
      ["observacoes", "Observações", true],
    ],
  },
];

export default async function Coleta({ params }: PageProps<"/funil/[id]/coleta/[coletaId]">) {
  await exigirModulo("FUNIL");
  const { id, coletaId } = await params;
  const coleta = await db.coletaDados.findUnique({
    where: { id: coletaId },
    include: { setores: { orderBy: { nome: "asc" } }, processo: { include: { cliente: true } } },
  });
  if (!coleta || coleta.processoId !== id) notFound();
  const valores = coleta as unknown as Record<string, string | null>;

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Coleta de dados"
        titulo={coleta.processo.cliente.nomeFantasia}
        descricao="Diagnóstico feito no local."
        acoes={
          <LinkBotao href={`/funil/${id}#coletas`} variante="secundario">
            Voltar ao processo
          </LinkBotao>
        }
      />
      <TravaProcesso processoId={id}>

        <Cartao titulo="Formulário">
          <Formulario acao={salvarColeta.bind(null, coleta.id)} botao="Salvar coleta">
            <Campo rotulo="Data de preenchimento" nome="dataPreenchimento" type="date" defaultValue={paraInputData(coleta.dataPreenchimento)} className="max-w-xs" />
            {GRUPOS.map((g) => (
              <fieldset key={g.titulo} className="flex flex-col gap-3 border-t border-linha pt-4">
                <legend className="pr-2 font-display text-base font-bold">{g.titulo}</legend>
                <Grade>
                  {g.campos.map(([nome, rotulo, longo]) =>
                    longo ? (
                      <AreaTexto key={nome} rotulo={rotulo} nome={nome} rows={2} defaultValue={valores[nome] ?? ""} />
                    ) : (
                      <Campo key={nome} rotulo={rotulo} nome={nome} defaultValue={valores[nome] ?? ""} />
                    ),
                  )}
                </Grade>
              </fieldset>
            ))}
          </Formulario>
        </Cartao>

        <Cartao titulo={`Setores do estabelecimento (${coleta.setores.length})`}>
          <div className="flex flex-col gap-3">
            {coleta.setores.map((s) => (
              <details key={s.id} className="rounded-xl bg-fundo p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  {s.nome}
                  <span className="ml-2 font-normal text-suave">{[s.piso, s.parede, s.teto].filter(Boolean).join(" · ")}</span>
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <Formulario acao={salvarSetor.bind(null, s.id)} variante="secundario">
                    <CamposSetor setor={s} />
                  </Formulario>
                  <div>
                    <BotaoAcao acao={removerSetor.bind(null, s.id)} variante="perigo" confirmar="Remover este setor?">
                      Remover setor
                    </BotaoAcao>
                  </div>
                </div>
              </details>
            ))}
            <details className="rounded-xl border border-dashed border-linha p-3" open={coleta.setores.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold">Adicionar setor</summary>
              <div className="mt-3">
                <Formulario acao={adicionarSetor.bind(null, coleta.id)} botao="Adicionar setor" variante="secundario" limparAoSalvar>
                  <CamposSetor />
                </Formulario>
              </div>
            </details>
          </div>
        </Cartao>

        <Cartao titulo="Excluir coleta">
          <BotaoAcao acao={excluirColeta.bind(null, id, coleta.id)} variante="perigo" confirmar="Excluir esta coleta e os setores dela?">
            Excluir coleta
          </BotaoAcao>
        </Cartao>
      </TravaProcesso>
    </>
  );
}

function CamposSetor({
  setor,
}: {
  setor?: { nome: string; piso: string | null; parede: string | null; teto: string | null; portas: string[]; janelas: string[]; ralo: string | null; equipamentos: string | null };
}) {
  return (
    <>
      <Grade colunas={3}>
        <Campo rotulo="Setor" nome="nome" required defaultValue={setor?.nome} placeholder="Ex.: Cozinha" />
        <Campo rotulo="Tipo de piso" nome="piso" defaultValue={setor?.piso ?? ""} />
        <Campo rotulo="Tipo de parede" nome="parede" defaultValue={setor?.parede ?? ""} />
        <Campo rotulo="Tipo de teto" nome="teto" defaultValue={setor?.teto ?? ""} />
        <Campo rotulo="Portas" nome="portas" defaultValue={setor?.portas.join(", ") ?? ""} ajuda="Separe por vírgula" />
        <Campo rotulo="Janelas" nome="janelas" defaultValue={setor?.janelas.join(", ") ?? ""} ajuda="Separe por vírgula" />
        <Campo rotulo="Tipo de ralo" nome="ralo" defaultValue={setor?.ralo ?? ""} />
      </Grade>
      <AreaTexto rotulo="Lista de equipamentos" nome="equipamentos" rows={2} defaultValue={setor?.equipamentos ?? ""} />
    </>
  );
}
