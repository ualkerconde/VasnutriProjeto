import { BotaoAcao, Formulario } from "@/components/formulario";
import { Campo, Selo } from "@/components/ui";
import { adicionarItem, alternarItem, renomearItem, type ListaSimples } from "./acoes";

/** Lista editável de textos com "ativo" (motivos de recusa, serviços, tipos de documentação). */
export function EdicaoListaSimples({
  lista,
  itens,
  rotuloNovo,
}: {
  lista: ListaSimples;
  itens: { id: string; texto: string; ativo: boolean }[];
  rotuloNovo: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {itens.length === 0 ? (
        <p className="text-sm text-suave">Nada cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((item) => (
            <li key={item.id} className="rounded-xl bg-fundo px-3 py-2">
              <details>
                <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center gap-3">
                  <span className={`flex-1 text-sm font-medium ${item.ativo ? "" : "text-suave line-through"}`}>{item.texto}</span>
                  {!item.ativo && <Selo>Inativo</Selo>}
                  <span className="text-xs font-semibold text-verde">Editar</span>
                </summary>
                <div className="mt-3 flex flex-col gap-3 border-t border-linha pt-3">
                  <Formulario acao={renomearItem.bind(null, lista, item.id)} variante="secundario">
                    <Campo rotulo="Descrição" nome="valor" required defaultValue={item.texto} />
                  </Formulario>
                  <div>
                    <BotaoAcao acao={alternarItem.bind(null, lista, item.id)}>{item.ativo ? "Desativar" : "Reativar"}</BotaoAcao>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <Formulario acao={adicionarItem.bind(null, lista)} botao="Adicionar" variante="secundario" limparAoSalvar>
        <Campo rotulo={rotuloNovo} nome="valor" required />
      </Formulario>
    </div>
  );
}
