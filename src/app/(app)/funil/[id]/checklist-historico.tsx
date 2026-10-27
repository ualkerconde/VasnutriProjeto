import { BotaoAcao } from "@/components/formulario";
import { Cartao } from "@/components/ui";
import { fmtDataHora } from "@/lib/datas";
import { formatarDias } from "@/lib/formato";
import { marcarChecklist } from "../acoes";
import type { ProcessoCompleto } from "./dados";

type Item = { id: string; descricao: string; etapaId: number };

export function Checklist({
  processo,
  itens,
  etapas,
}: {
  processo: ProcessoCompleto;
  itens: Item[];
  etapas: { id: number; nome: string }[];
}) {
  const marcados = new Map(processo.checklist.map((c) => [c.itemId, c]));
  const etapaAtual = processo.etapaAtualId;
  const grupos = etapas
    .map((e) => ({ etapa: e, itens: itens.filter((i) => i.etapaId === e.id) }))
    .filter((g) => g.itens.length > 0);

  return (
    <Cartao titulo="Checklist">
      {grupos.length === 0 ? (
        <p className="text-sm text-suave">Nenhum item de checklist cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map(({ etapa, itens }) => (
            <div key={etapa.id} className={etapa.id === etapaAtual ? "" : "opacity-80"}>
              <h3 className="mb-1.5 text-xs font-bold tracking-[0.04em] text-suave uppercase">
                {etapa.id}. {etapa.nome} {etapa.id === etapaAtual && <span className="text-verde">· etapa atual</span>}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {itens.map((item) => {
                  const m = marcados.get(item.id);
                  const feito = Boolean(m?.concluido);
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl bg-fundo px-3 py-2">
                      <BotaoAcao
                        acao={marcarChecklist.bind(null, processo.id, item.id)}
                        variante={feito ? "menta" : "secundario"}
                        rotulo={feito ? `Desmarcar ${item.descricao}` : `Marcar ${item.descricao}`}
                      >
                        {feito ? "✓" : "○"}
                      </BotaoAcao>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className={feito ? "font-semibold" : ""}>{item.descricao}</span>
                        {feito && m?.concluidoEm && (
                          <span className="block text-xs text-suave">
                            {fmtDataHora(m.concluidoEm)}
                            {m.concluidoPor && ` · ${m.concluidoPor.nome}`}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Cartao>
  );
}

export function Historico({ processo, agora }: { processo: ProcessoCompleto; agora: number }) {
  return (
    <Cartao titulo="Histórico de etapas">
      <ol className="relative flex flex-col gap-4 border-l-2 border-linha pl-5">
        {processo.historico.map((h) => {
          const aberto = h.fim === null;
          const dias = ((h.fim?.getTime() ?? agora) - h.inicio.getTime()) / 86_400_000;
          return (
            <li key={h.id} className="relative">
              <span className={`absolute top-1.5 -left-[27px] size-3 rounded-full border-2 ${aberto ? "border-menta bg-menta" : "border-linha bg-superficie"}`} />
              <p className="text-sm font-semibold">
                {h.etapa.id}. {h.etapa.nome}
                {aberto && <span className="ml-2 text-xs font-bold text-verde">atual</span>}
              </p>
              <p className="text-xs text-suave">
                {fmtDataHora(h.inicio)} {h.fim ? `até ${fmtDataHora(h.fim)}` : ""} · {formatarDias(dias)}
                {h.responsavel && ` · ${h.responsavel.nome}`}
              </p>
              {h.motivo && <p className="mt-1 text-sm text-texto-2">{h.motivo}</p>}
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}
