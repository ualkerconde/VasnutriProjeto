import type { Metadata } from "next";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Caixa, Campo, Cartao, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { lerTodasConfigs } from "@/lib/config";
import { db } from "@/lib/db";
import { MENU } from "@/lib/modulos";
import { adicionarChecklist, alternarChecklist, criarPerfil, salvarConfiguracoes, salvarPermissoes } from "./acoes";
import { EdicaoListaSimples } from "./lista-simples";

export const metadata: Metadata = { title: "Cadastros" };

const SECOES = [
  ["motivos", "Motivos de recusa"],
  ["servicos", "Serviços"],
  ["documentacao", "Documentação"],
  ["checklist", "Checklist por etapa"],
  ["perfis", "Perfis e permissões"],
  ["configuracoes", "Configurações"],
] as const;

export default async function Cadastros() {
  const usuario = await exigirModulo("CADASTROS");
  const gerePerfis = usuario.modulos.includes("USUARIOS");

  const [motivos, servicos, documentacoes, etapas, perfis, configs] = await Promise.all([
    db.motivoRecusa.findMany({ orderBy: [{ ativo: "desc" }, { descricao: "asc" }] }),
    db.servico.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    db.tipoDocumentacao.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    db.etapa.findMany({ orderBy: { ordem: "asc" }, include: { checklistItens: { orderBy: { ordem: "asc" } } } }),
    db.perfil.findMany({ orderBy: { nome: "asc" }, include: { permissoes: true, _count: { select: { usuarios: true } } } }),
    lerTodasConfigs(),
  ]);

  return (
    <>
      <CabecalhoPagina sobretitulo="Configuração" titulo="Cadastros" descricao="Listas e regras usadas no dia a dia, que antes ficavam fixas no AppSheet." />

      <nav aria-label="Seções" className="-mt-2 flex flex-wrap gap-2">
        {SECOES.filter(([id]) => id !== "perfis" || gerePerfis).map(([id, rotulo]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-linha bg-superficie px-3 py-1.5 text-[13px] font-semibold text-texto-2 hover:border-verde hover:text-verde">
            {rotulo}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
        <Cartao id="motivos" titulo="Motivos de recusa">
          <EdicaoListaSimples lista="motivos" rotuloNovo="Novo motivo" itens={motivos.map((m) => ({ id: m.id, texto: m.descricao, ativo: m.ativo }))} />
        </Cartao>
        <Cartao id="servicos" titulo="Serviços do cliente">
          <EdicaoListaSimples lista="servicos" rotuloNovo="Novo serviço" itens={servicos.map((s) => ({ id: s.id, texto: s.nome, ativo: s.ativo }))} />
        </Cartao>
        <Cartao id="documentacao" titulo="Documentação contratada">
          <EdicaoListaSimples
            lista="documentacao"
            rotuloNovo="Novo tipo de documentação"
            itens={documentacoes.map((d) => ({ id: d.id, texto: d.nome, ativo: d.ativo }))}
          />
        </Cartao>
      </div>

      <Cartao id="checklist" titulo="Checklist por etapa">
        <p className="mb-4 text-sm text-suave">Itens que aparecem para marcar dentro do processo, em cada etapa.</p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
          {etapas
            .filter((e) => !e.final)
            .map((etapa) => (
              <div key={etapa.id} className="flex flex-col gap-3 rounded-2xl bg-fundo p-4">
                <h3 className="text-sm font-bold">
                  <span className="font-mono text-xs text-suave">{String(etapa.id).padStart(2, "0")}</span> {etapa.nome}
                </h3>
                {etapa.checklistItens.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {etapa.checklistItens.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className={item.ativo ? "" : "text-suave line-through"}>{item.descricao}</span>
                        <BotaoAcao acao={alternarChecklist.bind(null, item.id)} variante="fantasma">
                          {item.ativo ? "Desativar" : "Reativar"}
                        </BotaoAcao>
                      </li>
                    ))}
                  </ul>
                )}
                <Formulario acao={adicionarChecklist.bind(null, etapa.id)} botao="Adicionar item" variante="secundario" limparAoSalvar>
                  <Campo rotulo="Novo item" nome="descricao" required placeholder="Ex.: Pasta do armário ok" />
                </Formulario>
              </div>
            ))}
        </div>
      </Cartao>

      {gerePerfis && (
        <Cartao id="perfis" titulo="Perfis e permissões">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {perfis.map((perfil) => {
              const atuais = perfil.permissoes.map((p) => p.modulo);
              return (
                <div key={perfil.id} className="rounded-2xl bg-fundo p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-bold">{perfil.nome}</h3>
                    <Selo>{perfil._count.usuarios} usuário(s)</Selo>
                  </div>
                  {perfil.descricao && <p className="mb-2 text-sm text-suave">{perfil.descricao}</p>}
                  <Formulario acao={salvarPermissoes.bind(null, perfil.id)} botao="Salvar permissões" variante="secundario">
                    <div className="flex flex-col">
                      {MENU.map((m) => (
                        <Caixa key={m.modulo} rotulo={m.rotulo} nome="modulos" value={m.modulo} defaultChecked={atuais.includes(m.modulo)} />
                      ))}
                    </div>
                  </Formulario>
                </div>
              );
            })}
            <div className="rounded-2xl border border-dashed border-linha p-4">
              <h3 className="mb-3 font-bold">Novo perfil</h3>
              <Formulario acao={criarPerfil} botao="Criar perfil" variante="secundario" limparAoSalvar>
                <Campo rotulo="Nome" nome="nome" required />
                <Campo rotulo="Descrição" nome="descricao" />
              </Formulario>
            </div>
          </div>
        </Cartao>
      )}

      <Cartao id="configuracoes" titulo="Configurações" className="max-w-3xl">
        <Formulario acao={salvarConfiguracoes} botao="Salvar configurações">
          {configs.map((c) =>
            typeof c.valor === "boolean" ? (
              <div key={c.chave}>
                <Caixa rotulo={c.rotulo} nome={c.chave} defaultChecked={c.valor} />
                <p className="ml-7 text-xs text-suave">{c.descricao}</p>
              </div>
            ) : (
              <Campo key={c.chave} rotulo={c.rotulo} nome={c.chave} type="number" min={0} max={365} defaultValue={c.valor} ajuda={c.descricao} className="max-w-sm" />
            ),
          )}
        </Formulario>
      </Cartao>
    </>
  );
}
