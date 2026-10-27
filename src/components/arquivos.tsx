import { BotaoAcao, Formulario } from "@/components/formulario";
import { Campo, Grade, Selecao } from "@/components/ui";
import { removerArquivo } from "@/app/(app)/funil/[id]/acoes-tecnicas";
import { fmtData } from "@/lib/datas";

export function ItemArquivo({
  arquivo,
  hoje,
}: {
  arquivo: { id: string; categoria: string; tipo: string | null; descricao: string | null; data: Date; validade: Date | null; mime: string | null; enviadoPor: { nome: string } | null };
  hoje: Date;
}) {
  const imagem = arquivo.mime?.startsWith("image/") && arquivo.mime !== "image/svg+xml";
  const vencido = arquivo.validade && arquivo.validade < hoje;
  return (
    <li className="flex gap-3 rounded-xl bg-fundo p-2.5">
      <a href={`/arquivos/${arquivo.id}`} target="_blank" rel="noopener" className="flex size-16 flex-none items-center justify-center overflow-hidden rounded-lg bg-linha-suave text-xs font-bold text-suave">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/arquivos/${arquivo.id}`} alt={arquivo.descricao ?? "Foto"} className="size-full object-cover" loading="lazy" />
        ) : (
          (arquivo.mime?.split("/")[1] ?? "arq").slice(0, 4).toUpperCase()
        )}
      </a>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <a href={`/arquivos/${arquivo.id}`} target="_blank" rel="noopener" className="truncate font-semibold hover:text-verde">
          {arquivo.descricao || arquivo.tipo || (arquivo.categoria === "FOTO" ? "Foto" : "Anexo")}
        </a>
        <span className="text-xs text-suave">
          {fmtData(arquivo.data)}
          {arquivo.enviadoPor && ` · ${arquivo.enviadoPor.nome}`}
        </span>
        {arquivo.validade && <span className={`text-xs ${vencido ? "font-semibold text-[#9A2B12]" : "text-suave"}`}>Validade {fmtData(arquivo.validade)}</span>}
      </span>
      <BotaoAcao acao={removerArquivo.bind(null, arquivo.id)} variante="fantasma" rotulo="Apagar arquivo" confirmar="Apagar este arquivo?">
        ✕
      </BotaoAcao>
    </li>
  );
}

export function FormArquivo({ acao }: { acao: Parameters<typeof Formulario>[0]["acao"] }) {
  return (
    <details className="rounded-xl border border-dashed border-linha p-3">
      <summary className="cursor-pointer text-sm font-semibold">Enviar foto ou anexo</summary>
      <div className="mt-3">
        <Formulario acao={acao} botao="Enviar" variante="secundario" limparAoSalvar>
          <Campo rotulo="Arquivo (até 15 MB)" nome="arquivo" type="file" required accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="[&_input]:py-2" />
          <Grade>
            <Selecao
              rotulo="Categoria"
              nome="categoria"
              opcoes={[
                { valor: "ANEXO", rotulo: "Anexo" },
                { valor: "FOTO", rotulo: "Foto" },
              ]}
            />
            <Campo rotulo="Tipo" nome="tipo" placeholder="Ex.: alvará, laudo de potabilidade" />
            <Campo rotulo="Validade do documento" nome="validade" type="date" />
          </Grade>
          <Campo rotulo="Descrição" nome="descricao" />
        </Formulario>
      </div>
    </details>
  );
}
