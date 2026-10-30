import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { paraInputDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA } from "@/lib/funil/regras";
import { deslocarSemana, diaIso, semanaDe } from "@/lib/planejamento/regras";
import { consultoresDoQuadro, permissoesPlanejamento } from "@/lib/planejamento/servico";
import { QuadroPlanejamento, type CartaoVisita } from "./quadro";

export const metadata: Metadata = { title: "Planejamento" };

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" });

export default async function Planejamento({ searchParams }: PageProps<"/planejamento">) {
  const usuario = await exigirModulo("PLANEJAMENTO");
  const { semana: semanaParam, visita: visitaParam, meus } = await searchParams;

  // Vindo de uma notificação: abre a semana da visita.
  let dia = typeof semanaParam === "string" ? semanaParam : diaIso(new Date());
  if (typeof visitaParam === "string" && /^[0-9a-f-]{36}$/.test(visitaParam)) {
    const v = await db.visita.findUnique({ where: { id: visitaParam }, select: { inicio: true } });
    if (v) dia = diaIso(v.inicio);
  }
  const semana = semanaDe(dia);
  const atual = semanaDe(diaIso(new Date()));
  const ehSemanaAtual = semana.segunda === atual.segunda;
  const soMeus = meus === "1";

  const [pode, { consultores, configurado }, visitas, processos, checklist] = await Promise.all([
    permissoesPlanejamento(usuario),
    consultoresDoQuadro(),
    db.visita.findMany({
      where: {
        OR: [
          { inicio: { gte: semana.inicio, lt: semana.fim } },
          // Na semana atual, o que ficou para trás sem finalizar aparece como atrasado.
          ...(ehSemanaAtual ? [{ inicio: { lt: semana.inicio }, status: { not: "CONCLUIDA" as const } }] : []),
        ],
        ...(soMeus ? { tecnicoId: usuario.id } : {}),
      },
      orderBy: { inicio: "asc" },
      include: {
        processo: { select: { id: true, cliente: { select: { nomeFantasia: true, bairro: true, cidade: true } } } },
        _count: { select: { checklist: true, arquivos: true } },
      },
    }),
    db.processo.findMany({
      where: { etapaAtualId: { not: ETAPA.RECUSADOS } },
      select: { id: true, numeroOrcamento: true, cliente: { select: { nomeFantasia: true } }, etapaAtual: { select: { id: true, nome: true } } },
      orderBy: [{ cliente: { nomeFantasia: "asc" } }, { criadoEm: "desc" }],
    }),
    db.checklistVisitaItem.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { descricao: "asc" }], select: { id: true, descricao: true } }),
  ]);

  // Quem tem cartão na semana aparece como coluna mesmo fora da lista de consultores.
  const colunas = [...consultores];
  const faltando = visitas.map((v) => v.tecnicoId).filter((id): id is string => Boolean(id) && !colunas.some((c) => c.id === id));
  if (faltando.length > 0) {
    const extras = await db.usuario.findMany({ where: { id: { in: [...new Set(faltando)] } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
    colunas.push(...extras);
  }
  const colunasVisiveis = soMeus ? colunas.filter((c) => c.id === usuario.id) : colunas;

  const agora = new Date();
  const cartoes: CartaoVisita[] = visitas.map((v) => ({
    id: v.id,
    processoId: v.processo.id,
    cliente: v.processo.cliente.nomeFantasia,
    local: [v.processo.cliente.bairro, v.processo.cliente.cidade].filter(Boolean).join(", "),
    tecnicoId: v.tecnicoId,
    status: v.status,
    inicio: v.inicio.toISOString(),
    inicioInput: paraInputDataHora(v.inicio),
    fim: v.fim?.toISOString() ?? null,
    dia: diaIso(v.inicio),
    resumo: v.realizado,
    itensChecklist: v._count.checklist,
    fotos: v._count.arquivos,
    atrasada: v.status === "AGENDADA" && v.inicio < agora,
    duracaoPrevistaMin: v.duracaoPrevistaMin,
  }));

  const contagem = { AGENDADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 };
  for (const c of cartoes) contagem[c.status]++;

  // Novo cartão: hoje às 8h se for a semana atual, senão a segunda às 8h.
  const sugestao = `${ehSemanaAtual ? diaIso(agora) : semana.segunda}T08:00`;
  const fimSemana = new Date(semana.fim.getTime() - 86_400_000);
  const titulo = `${fmtDia.format(new Date(`${semana.segunda}T00:00:00Z`))} a ${fmtDia.format(new Date(`${diaIso(fimSemana)}T00:00:00Z`))}`;
  const link = ({ semana: s = semana.segunda, meus: m = soMeus }: { semana?: string; meus?: boolean }) => {
    const q = new URLSearchParams();
    if (s !== atual.segunda) q.set("semana", s);
    if (m) q.set("meus", "1");
    return `/planejamento${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Planejamento"
        titulo="Agenda de visitas"
        descricao="Cada coluna é um consultor e cada cartão é uma visita técnica do processo do cliente. Arraste o cartão (ou use Mover) para trocar o consultor."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border-[1.5px] border-linha bg-superficie p-1">
          <Link href={link({ semana: deslocarSemana(semana.segunda, -1) })} aria-label="Semana anterior" className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-fundo">
            ‹
          </Link>
          <span className="min-w-[150px] px-1 text-center text-sm font-semibold">{titulo}</span>
          <Link href={link({ semana: deslocarSemana(semana.segunda, 1) })} aria-label="Próxima semana" className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-fundo">
            ›
          </Link>
        </div>
        {!ehSemanaAtual && (
          <Link href={link({ semana: atual.segunda })} className="min-h-11 content-center rounded-xl px-3 text-sm font-semibold text-verde hover:bg-[#E6EEE9]">
            Esta semana
          </Link>
        )}
        <Link
          href={link({ meus: !soMeus })}
          aria-pressed={soMeus}
          className={`min-h-11 content-center rounded-xl border-[1.5px] px-3 text-sm font-semibold ${soMeus ? "border-tinta bg-tinta text-menta" : "border-linha bg-superficie text-texto-2 hover:border-verde"}`}
        >
          Só a minha agenda
        </Link>
        <span className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Selo>{contagem.AGENDADA} agendada(s)</Selo>
          <Selo cor="ambar">{contagem.EM_ANDAMENTO} em andamento</Selo>
          <Selo cor="verde">{contagem.CONCLUIDA} concluída(s)</Selo>
        </span>
      </div>

      {!configurado && consultores.length === 0 && (
        <p className="rounded-[14px] bg-[#FDF0D5] px-4 py-3 text-sm font-medium text-ambar-texto">
          Nenhum consultor no quadro ainda. Escolha quem aparece como coluna em Cadastros › Planejamento (ou dê o perfil Técnico aos consultores).
        </p>
      )}

      <QuadroPlanejamento
        cartoes={cartoes}
        colunas={colunasVisiveis}
        mostrarSemConsultor={!soMeus}
        pode={pode}
        usuarioId={usuario.id}
        consultores={colunas}
        processos={processos.map((p) => ({
          valor: p.id,
          rotulo: `${p.cliente.nomeFantasia} · ${p.etapaAtual.id === ETAPA.VISITAS ? "Visitas técnicas" : `etapa ${p.etapaAtual.id}`} · nº ${p.numeroOrcamento}`,
        }))}
        checklist={checklist}
        sugestaoInicio={sugestao}
      />
    </>
  );
}
