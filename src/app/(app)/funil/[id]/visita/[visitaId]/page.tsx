import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/formulario";
import { ItemArquivo } from "@/components/arquivos";
import { CabecalhoPagina, Cartao, Dados, LinkBotao, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtDataHora, hoje, paraInputDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { opcoes, usuariosAtivos } from "@/lib/listas";
import { ROTULO_STATUS_VISITA } from "@/lib/planejamento/regras";
import { excluirVisita, salvarVisita } from "../../acoes-tecnicas";
import { FormVisita } from "../form-visita";
import { TravaProcesso } from "../../trava";

export const metadata: Metadata = { title: "Visita" };

export default async function EditarVisita({ params }: PageProps<"/funil/[id]/visita/[visitaId]">) {
  await exigirModulo("FUNIL");
  const { id, visitaId } = await params;
  const [visita, usuarios] = await Promise.all([
    db.visita.findUnique({
      where: { id: visitaId },
      include: {
        processo: { include: { cliente: true } },
        agendadaPor: { select: { nome: true } },
        checklist: { include: { item: { select: { descricao: true } } } },
        arquivos: { orderBy: { criadoEm: "asc" }, include: { enviadoPor: { select: { nome: true } } } },
      },
    }),
    usuariosAtivos(),
  ]);
  if (!visita || visita.processoId !== id) notFound();
  const p = visita.processo;

  return (
    <>
      <CabecalhoPagina
        sobretitulo={`Visita de ${fmtDataHora(visita.inicio)}`}
        titulo={p.cliente.nomeFantasia}
        acoes={
          <LinkBotao href={`/funil/${id}#visitas`} variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      {(visita.agendadaPara || visita.checklist.length > 0 || visita.arquivos.length > 0) && (
        <Cartao
          titulo="Do planejamento"
          acoes={<Selo cor={visita.status === "CONCLUIDA" ? "verde" : visita.status === "EM_ANDAMENTO" ? "ambar" : "cinza"}>{ROTULO_STATUS_VISITA[visita.status]}</Selo>}
        >
          <div className="flex flex-col gap-5">
            <Dados
              itens={[
                ["Agendada para", fmtDataHora(visita.agendadaPara)],
                ["Agendada por", visita.agendadaPor?.nome ?? "—"],
                ["Checklist", visita.checklist.length ? visita.checklist.map((c) => `✓ ${c.item.descricao}`).join("\n") : "—"],
              ]}
            />
            {visita.arquivos.length > 0 && (
              <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
                {visita.arquivos.map((a) => (
                  <ItemArquivo key={a.id} arquivo={a} hoje={hoje()} />
                ))}
              </ul>
            )}
          </div>
        </Cartao>
      )}
      <TravaProcesso processoId={id}>
        <Cartao>
          <FormVisita
            acao={salvarVisita.bind(null, id, visita.id)}
            tecnicos={opcoes(usuarios, (u) => u.nome)}
            inclui={{
              fichas: p.incluiFichasTecnicas || visita.fichasTecnicas !== null,
              info: p.incluiInfoNutricional || visita.infoNutricional !== null,
              cardapios: p.incluiCardapios || visita.cardapios !== null,
            }}
            visita={{
              inicio: paraInputDataHora(visita.inicio),
              fim: paraInputDataHora(visita.fim),
              tecnicoId: visita.tecnicoId ?? "",
              realizado: visita.realizado ?? "",
              recebidoPor: visita.recebidoPor ?? "",
              placasColadas: visita.placasColadas,
              fichasTecnicas: visita.fichasTecnicas,
              infoNutricional: visita.infoNutricional,
              cardapios: visita.cardapios,
              teveInconformidade: visita.teveInconformidade,
              inconformidades: visita.inconformidades ?? "",
            }}
          />
        </Cartao>
        <Cartao titulo="Excluir visita">
          <BotaoAcao acao={excluirVisita.bind(null, id, visita.id)} variante="perigo" confirmar="Excluir esta visita?">
            Excluir visita
          </BotaoAcao>
        </Cartao>
      </TravaProcesso>
    </>
  );
}
