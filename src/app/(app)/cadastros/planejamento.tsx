import { BotaoAcao, Formulario } from "@/components/formulario";
import { Campo, Cartao } from "@/components/ui";
import { ADMINISTRADOR } from "@/lib/funil/permissoes";
import { ACOES_CARTAO, type PermissoesCartao } from "@/lib/planejamento/regras";
import { adicionarChecklistVisita, alternarChecklistVisita, salvarColunasPlanejamento, salvarPermissoesPlanejamento } from "./acoes";

type Perfil = { id: string; nome: string };
type Usuario = { id: string; nome: string; perfis: string[] };

const celula = "px-2 py-2 text-center";
const caixa = "size-4 cursor-pointer accent-verde disabled:cursor-not-allowed";

/** Cadastros › Planejamento: quem vira coluna, o que cada perfil faz nos cartões e o checklist da visita. */
export function CadastroPlanejamento({
  gerePerfis,
  perfis,
  regras,
  usuarios,
  colunas,
  checklist,
}: {
  gerePerfis: boolean;
  perfis: Perfil[];
  regras: ({ perfilId: string } & PermissoesCartao)[];
  usuarios: Usuario[];
  colunas: { usuarioId: string; ordem: number }[];
  checklist: { id: string; descricao: string; ativo: boolean }[];
}) {
  const regraDe = new Map(regras.map((r) => [r.perfilId, r]));
  const coluna = new Map(colunas.map((c) => [c.usuarioId, c]));

  return (
    <Cartao id="planejamento" titulo="Planejamento (agenda de visitas)">
      <div className="flex flex-col gap-8">
        {gerePerfis && (
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="font-bold">1. Consultores que aparecem como colunas</h3>
              <p className="text-sm text-suave">
                Marque quem recebe visitas no quadro. A ordem é crescente (1, 2, 3…). Sem ninguém marcado, entram os usuários com perfil Técnico.
              </p>
            </div>
            <Formulario acao={salvarColunasPlanejamento} botao="Salvar colunas" variante="secundario">
              <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
                {usuarios.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 rounded-xl bg-fundo px-3 py-1.5">
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
                      <input type="checkbox" name="coluna" value={u.id} defaultChecked={coluna.has(u.id)} className="size-[18px] flex-none accent-verde" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{u.nome}</span>
                        <span className="block truncate text-xs text-suave">{u.perfis.join(", ") || "Sem perfil"}</span>
                      </span>
                    </label>
                    <input
                      type="number"
                      name={`ordem:${u.id}`}
                      min={0}
                      max={999}
                      defaultValue={coluna.get(u.id)?.ordem ?? ""}
                      aria-label={`Ordem de ${u.nome}`}
                      placeholder="Ordem"
                      className="h-9 w-20 rounded-lg border-[1.5px] border-linha bg-superficie px-2 text-sm"
                    />
                  </li>
                ))}
              </ul>
            </Formulario>
          </section>
        )}

        {gerePerfis && (
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="font-bold">2. O que cada perfil pode fazer nos cartões</h3>
              <p className="text-sm text-suave">
                Vale para quem tem o módulo Planejamento (em Perfis e permissões). O Administrador pode sempre.
              </p>
            </div>
            <Formulario acao={salvarPermissoesPlanejamento} botao="Salvar permissões" variante="secundario">
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full border-collapse text-sm">
                  <thead className="text-xs text-suave">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold uppercase">Perfil</th>
                      {ACOES_CARTAO.map((a) => (
                        <th key={a.chave} className={`${celula} font-semibold`} title={a.descricao}>
                          {a.rotulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&>tr]:border-t [&>tr]:border-linha-suave [&>tr:hover]:bg-fundo">
                    {perfis.map((p) => {
                      const admin = p.nome === ADMINISTRADOR;
                      const regra = regraDe.get(p.id);
                      return (
                        <tr key={p.id}>
                          <td className="px-2 py-2">{p.nome}</td>
                          {ACOES_CARTAO.map((a) => (
                            <td key={a.chave} className={celula}>
                              <input
                                type="checkbox"
                                name="pode"
                                value={`${p.id}:${a.chave}`}
                                defaultChecked={admin || (regra ? regra[a.chave] : true)}
                                disabled={admin}
                                aria-label={`${p.nome} pode ${a.rotulo}`}
                                className={caixa}
                              />
                              {admin && <input type="hidden" name="pode" value={`${p.id}:${a.chave}`} />}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-suave">{ACOES_CARTAO.map((a) => `${a.rotulo}: ${a.descricao.toLowerCase()}`).join(" · ")}.</p>
            </Formulario>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-bold">{gerePerfis ? "3. " : ""}Checklist da visita</h3>
            <p className="text-sm text-suave">Itens que o consultor marca ao finalizar a visita.</p>
          </div>
          {checklist.length > 0 && (
            <ul className="flex max-w-xl flex-col gap-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-fundo px-3 py-1.5 text-sm">
                  <span className={item.ativo ? "" : "text-suave line-through"}>{item.descricao}</span>
                  <BotaoAcao acao={alternarChecklistVisita.bind(null, item.id)} variante="fantasma">
                    {item.ativo ? "Desativar" : "Reativar"}
                  </BotaoAcao>
                </li>
              ))}
            </ul>
          )}
          <Formulario acao={adicionarChecklistVisita} botao="Adicionar item" variante="secundario" limparAoSalvar className="max-w-xl">
            <Campo rotulo="Novo item" nome="descricao" required placeholder="Ex.: Termômetros calibrados" />
          </Formulario>
        </section>
      </div>
    </Cartao>
  );
}
