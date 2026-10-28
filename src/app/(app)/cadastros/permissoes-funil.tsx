import { Formulario } from "@/components/formulario";
import { Cartao } from "@/components/ui";
import { CAMPOS_PROCESSO } from "@/lib/funil/campos";
import { ADMINISTRADOR } from "@/lib/funil/permissoes";
import { salvarCamposSensiveis, salvarEdicaoCampos, salvarPermissoesEtapas } from "./acoes";

type Etapa = { id: number; nome: string };
type Perfil = { id: string; nome: string };
type ConfigCampo = { chave: string; etapasEditaveis: number[]; sensivel: boolean; perfisVisiveis: string[] };

const celula = "px-2 py-2 text-center";
const caixa = "size-4 cursor-pointer accent-verde disabled:cursor-not-allowed";

function Grade({ cabecalho, children }: { cabecalho: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse text-sm">
        <thead className="text-xs text-suave">{cabecalho}</thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-linha-suave [&>tr:hover]:bg-fundo">{children}</tbody>
      </table>
    </div>
  );
}

/** Cadastros › Permissões do funil: as três regras de quem mexe, quando e no quê. */
export function PermissoesFunil({
  etapas,
  perfis,
  permissoes,
  configs,
}: {
  etapas: Etapa[];
  perfis: Perfil[];
  permissoes: { etapaId: number; perfilId: string }[];
  configs: ConfigCampo[];
}) {
  const tem = new Set(permissoes.map((p) => `${p.etapaId}:${p.perfilId}`));
  const config = new Map(configs.map((c) => [c.chave, c]));
  const editavel = (chave: string, etapa: number) => {
    const c = config.get(chave);
    return !c || c.etapasEditaveis.includes(etapa);
  };

  return (
    <Cartao id="permissoes-funil" titulo="Permissões do funil">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-bold">1. Quem pode alterar o processo em cada etapa</h3>
            <p className="text-sm text-suave">
              Quem não está marcado vê o processo, mas não altera nada nele (dados, checklist, visitas, arquivos, mudança de etapa) enquanto ele
              estiver na etapa. O Administrador pode sempre.
            </p>
          </div>
          <Formulario acao={salvarPermissoesEtapas} botao="Salvar quem altera" variante="secundario">
            <Grade
              cabecalho={
                <tr>
                  <th className="px-2 py-2 text-left font-semibold uppercase">Etapa</th>
                  {perfis.map((p) => (
                    <th key={p.id} className={`${celula} font-semibold`}>
                      {p.nome}
                    </th>
                  ))}
                </tr>
              }
            >
              {etapas.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">
                    <span className="font-mono text-xs text-suave">{String(e.id).padStart(2, "0")}</span> {e.nome}
                  </td>
                  {perfis.map((p) => {
                    const admin = p.nome === ADMINISTRADOR;
                    return (
                      <td key={p.id} className={celula}>
                        <input
                          type="checkbox"
                          name="permissao"
                          value={`${e.id}:${p.id}`}
                          defaultChecked={admin || tem.has(`${e.id}:${p.id}`)}
                          disabled={admin}
                          aria-label={`${p.nome} altera em ${e.nome}`}
                          className={caixa}
                        />
                        {admin && <input type="hidden" name="permissao" value={`${e.id}:${p.id}`} />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Grade>
          </Formulario>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-bold">2. Em quais etapas cada campo pode ser editado</h3>
            <p className="text-sm text-suave">Nas etapas desmarcadas o campo aparece travado para todos os perfis.</p>
          </div>
          <Formulario acao={salvarEdicaoCampos} botao="Salvar edição por etapa" variante="secundario">
            <Grade
              cabecalho={
                <tr>
                  <th className="px-2 py-2 text-left font-semibold uppercase">Campo</th>
                  {etapas.map((e) => (
                    <th key={e.id} className={`${celula} font-mono font-semibold`} title={e.nome}>
                      {e.id}
                    </th>
                  ))}
                </tr>
              }
            >
              {CAMPOS_PROCESSO.map((c) => (
                <tr key={c.chave}>
                  <td className="min-w-[220px] px-2 py-2">{c.rotulo}</td>
                  {etapas.map((e) => (
                    <td key={e.id} className={celula}>
                      <input
                        type="checkbox"
                        name="editavel"
                        value={`${c.chave}:${e.id}`}
                        defaultChecked={editavel(c.chave, e.id)}
                        aria-label={`${c.rotulo} editável em ${e.nome}`}
                        className={caixa}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </Grade>
            <p className="text-xs text-suave">
              Números das etapas: {etapas.map((e) => `${e.id}. ${e.nome}`).join(" · ")}. O valor mensal, além disso, só aparece nas etapas 1 a 4.
            </p>
          </Formulario>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-bold">3. Informações sensíveis</h3>
            <p className="text-sm text-suave">
              Marque o campo como sensível e escolha os perfis que podem vê-lo. Para os outros ele some da tela do processo e da ficha do cliente. O
              Administrador sempre vê.
            </p>
          </div>
          <Formulario acao={salvarCamposSensiveis} botao="Salvar campos sensíveis" variante="secundario">
            <Grade
              cabecalho={
                <tr>
                  <th className="px-2 py-2 text-left font-semibold uppercase">Campo</th>
                  <th className={`${celula} font-semibold uppercase`}>Sensível</th>
                  {perfis
                    .filter((p) => p.nome !== ADMINISTRADOR)
                    .map((p) => (
                      <th key={p.id} className={`${celula} font-semibold`}>
                        {p.nome} vê
                      </th>
                    ))}
                </tr>
              }
            >
              {CAMPOS_PROCESSO.map((c) => {
                const atual = config.get(c.chave);
                return (
                  <tr key={c.chave}>
                    <td className="min-w-[220px] px-2 py-2">{c.rotulo}</td>
                    <td className={celula}>
                      <input
                        type="checkbox"
                        name="sensivel"
                        value={c.chave}
                        defaultChecked={atual?.sensivel ?? false}
                        aria-label={`${c.rotulo} é sensível`}
                        className={caixa}
                      />
                    </td>
                    {perfis
                      .filter((p) => p.nome !== ADMINISTRADOR)
                      .map((p) => (
                        <td key={p.id} className={celula}>
                          <input
                            type="checkbox"
                            name="ve"
                            value={`${c.chave}:${p.id}`}
                            defaultChecked={atual?.perfisVisiveis.includes(p.id) ?? false}
                            aria-label={`${p.nome} vê ${c.rotulo}`}
                            className={caixa}
                          />
                        </td>
                      ))}
                  </tr>
                );
              })}
            </Grade>
          </Formulario>
        </section>
      </div>
    </Cartao>
  );
}
