import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/formulario";
import { Cartao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, tempoRelativo } from "@/lib/datas";
import { dataPorExtenso, formatarDias, primeiroNome, saudacao } from "@/lib/formato";
import { linkDaNotificacao } from "@/lib/notificacoes";
import { dadosDoPainel, itensCriticos, type CardCritico } from "@/lib/painel";
import { situacaoCiclo } from "@/lib/visitas";
import { abrirNotificacao } from "./notificacoes/acoes";

export const metadata: Metadata = { title: "Painel" };

export default async function Painel({ searchParams }: PageProps<"/">) {
  const usuario = await exigirModulo("PAINEL");
  const { "sem-acesso": semAcesso } = await searchParams;
  const agora = new Date();
  const [dados, criticos] = await Promise.all([dadosDoPainel(usuario.id), itensCriticos(usuario.modulos, agora)]);
  const pendentes = criticos.filter((c) => c.quantidade > 0).length;
  const maior = Math.max(1, ...dados.funil.map((l) => l.quantidade));

  const indicadores = [
    { rotulo: "Processos em andamento", valor: dados.emAndamento, nota: `${dados.clientes} cliente(s) cadastrados`, selo: "FUNIL", escuro: true, href: "/funil" },
    { rotulo: "Orçamentos aguardando", valor: dados.orcamentosAguardando, nota: "Esperando aprovação do cliente", selo: "ETAPA 2", href: "/funil" },
    {
      rotulo: "Visitas atrasadas",
      valor: dados.clientesComVisitaAtrasada,
      nota: "Clientes abaixo do contratado no ciclo",
      selo: "ETAPA 11",
      alerta: dados.clientesComVisitaAtrasada > 0,
      href: "/visitas",
    },
    {
      rotulo: "Solicitações vencidas",
      valor: dados.solicitacoesVencidas,
      nota: "Escritório, em aberto com prazo passado",
      selo: "PRAZO",
      alerta: dados.solicitacoesVencidas > 0,
      href: "/solicitacoes",
    },
  ];

  return (
    <>
      {semAcesso && (
        <p role="alert" className="rounded-[14px] bg-[#FDF0D5] px-4 py-3 text-sm font-medium text-ambar-texto">
          Seu perfil não tem acesso àquela tela.
        </p>
      )}

      <header className="animate-subir flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1.5 font-mono text-xs tracking-[0.1em] text-verde">{dataPorExtenso(agora)}</p>
          <h1 className="font-display text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-extrabold tracking-[-0.035em]">
            {saudacao(agora)}, {primeiroNome(usuario.nome)}.
          </h1>
        </div>
      </header>

      {criticos.length > 0 && (
        <section aria-labelledby="titulo-criticos" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-criticos" className="font-display text-[22px] font-bold tracking-[-0.02em]">
              Atenção agora
            </h2>
            <span className="text-[13px] text-suave">
              {pendentes === 0 ? "Tudo em dia" : `${pendentes} de ${criticos.length} ponto(s) pedem ação`}
            </span>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
            {[...criticos]
              .sort((a, b) => Number(b.quantidade > 0) - Number(a.quantidade > 0) || Number(b.gravidade === "alta") - Number(a.gravidade === "alta"))
              .map((c, i) => (
                <CartaoCritico key={c.chave} card={c} atraso={i * 50} />
              ))}
          </div>
        </section>
      )}

      <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {indicadores.map((k, i) => (
          <Link
            href={k.href}
            key={k.rotulo}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-subir flex flex-col gap-3.5 rounded-[22px] p-[22px] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgb(11_22_18/0.25)] ${
              k.escuro ? "bg-tinta text-claro" : "border border-[#E1E9E4] bg-superficie"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-semibold ${k.escuro ? "text-claro-2" : "text-texto-2"}`}>{k.rotulo}</span>
              <span
                className={`rounded-lg px-2 py-1 font-mono whitespace-nowrap text-[11px] tracking-[0.06em] ${
                  k.alerta ? "bg-[#FDF0D5] text-ambar-texto" : k.escuro ? "bg-menta/15 text-menta" : "bg-[#E6EEE9] text-[#0B5F3B]"
                }`}
              >
                {k.selo}
              </span>
            </div>
            <span className="font-display text-[52px] leading-none font-extrabold tracking-[-0.04em]">{k.valor}</span>
            <span className={`text-[13px] ${k.escuro ? "text-claro-2" : "text-suave"}`}>{k.nota}</span>
          </Link>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="titulo-funil" className="min-w-0 flex-[999_1_520px] rounded-[22px] border border-[#E1E9E4] bg-superficie p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-funil" className="font-display text-[22px] font-bold tracking-[-0.02em]">
              Funil por etapa
            </h2>
            <span className="text-[13px] text-suave">processos · tempo médio na etapa</span>
          </div>
          <ol className="flex flex-col gap-1">
            {dados.funil.map((linha, i) => {
              const largura = linha.quantidade === 0 ? 0 : Math.max(8, Math.round((linha.quantidade / maior) * 100));
              const cor = linha.final ? "bg-[#B8C6BF]" : linha.id === 11 ? "bg-verde" : "bg-menta";
              return (
                <li
                  key={linha.id}
                  className="grid grid-cols-[22px_minmax(0,1fr)_minmax(40px,22%)_22px_44px] items-center gap-2 rounded-xl px-1.5 py-2 hover:bg-fundo sm:grid-cols-[28px_minmax(110px,210px)_minmax(48px,1fr)_32px_64px] sm:gap-3 sm:px-2.5"
                >
                  <span className="font-mono text-xs text-[#6A7A73]">{String(linha.id).padStart(2, "0")}</span>
                  <span className="truncate text-sm font-medium">{linha.nome}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-linha-suave">
                    <span
                      className={`animate-crescer block h-full origin-left rounded-full ${cor}`}
                      style={{ width: `${largura}%`, animationDelay: `${i * 50}ms` }}
                    />
                  </span>
                  <span className="text-right font-mono text-sm">{linha.quantidade}</span>
                  <span className="text-right text-[13px] text-suave">{formatarDias(linha.mediaDias)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="titulo-voce" className="min-w-0 flex-[1_1_320px] rounded-[22px] bg-tinta p-6 text-claro">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 id="titulo-voce" className="font-display text-[22px] font-bold tracking-[-0.02em]">
              Precisa de você
            </h2>
            <Link href="/notificacoes" className="text-[13px] font-semibold text-menta">
              Ver todas{dados.naoLidas > 0 ? ` (${dados.naoLidas})` : ""}
            </Link>
          </div>
          {dados.notificacoes.length === 0 ? (
            <p className="rounded-[14px] bg-claro/5 p-4 text-sm text-claro-2">
              Nada pendente agora. Avisos de prazos, vencimentos e etapas aparecem aqui.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {dados.notificacoes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 rounded-[14px] bg-claro/5 p-3.5">
                  <span className="mt-1.5 size-2.5 flex-none rounded-full bg-ambar" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm leading-snug font-semibold">{n.titulo}</span>
                    <span className="text-[13px] leading-snug text-claro-2">
                      {n.mensagem && `${n.mensagem} · `}
                      {tempoRelativo(n.criadoEm, agora)}
                    </span>
                  </span>
                  {linkDaNotificacao(n) && (
                    <BotaoAcao acao={abrirNotificacao.bind(null, n.id)} variante="menta">
                      Abrir
                    </BotaoAcao>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {usuario.modulos.includes("VISITAS") && dados.ciclos.length > 0 && (
        <Cartao
          titulo="Visitas técnicas · ciclo atual"
          acoes={
            <Link href="/visitas" className="text-sm font-semibold">
              Ver todas
            </Link>
          }
        >
          <Tabela cabecalho={["Cliente", "Visitas no ciclo", "Última visita", "Fim do ciclo", "Situação"]}>
            {dados.ciclos.slice(0, 6).map((c) => {
              const sit = situacaoCiclo(c);
              const pct = c.contratadas ? Math.min(100, Math.round((c.feitas / c.contratadas) * 100)) : 0;
              return (
                <tr key={c.processoId}>
                  <td>
                    <Link href={`/funil/${c.processoId}`} className="font-semibold hover:text-verde">
                      {c.cliente}
                    </Link>
                  </td>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-28 overflow-hidden rounded-full bg-linha-suave">
                        <span className={`animate-crescer block h-full origin-left rounded-full ${c.atrasadas > 0 ? "bg-[#E0703F]" : "bg-menta"}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="font-mono text-[13px] whitespace-nowrap">
                        {c.feitas}
                        {c.contratadas ? ` de ${c.contratadas}` : ""}
                      </span>
                    </span>
                  </td>
                  <td className="text-texto-2">{fmtData(c.ultima)}</td>
                  <td className="text-texto-2">{fmtData(c.ciclo?.fimPrevisto)}</td>
                  <td>
                    <Selo cor={sit.cor}>{sit.rotulo}</Selo>
                  </td>
                </tr>
              );
            })}
          </Tabela>
        </Cartao>
      )}
    </>
  );
}

function CartaoCritico({ card: c, atraso }: { card: CardCritico; atraso: number }) {
  const ok = c.quantidade === 0;
  const cor = ok ? "bg-menta" : c.gravidade === "alta" ? "bg-[#E0703F]" : "bg-ambar";
  return (
    <article
      style={{ animationDelay: `${atraso}ms` }}
      className={`animate-subir flex min-w-0 flex-col gap-3 rounded-[22px] border bg-superficie p-5 ${
        ok ? "border-[#E1E9E4]" : c.gravidade === "alta" ? "border-[#F3C5B8]" : "border-[#F2DDB0]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-2.5 flex-none rounded-full ${cor}`} />
          <h3 className="text-sm leading-snug font-semibold text-texto-2">{c.titulo}</h3>
        </div>
        <span className={`font-display text-[32px] leading-none font-extrabold tracking-[-0.03em] ${ok ? "text-verde" : ""}`}>{c.quantidade}</span>
      </div>
      {c.destaque && <span className="-mt-1 font-mono text-sm font-semibold text-[#9A2B12]">{c.destaque}</span>}
      {ok ? (
        <p className="text-[13px] text-suave">Tudo em dia.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {c.itens.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex flex-col rounded-lg px-2 py-1.5 -mx-2 hover:bg-fundo">
                  <span className="truncate text-sm font-semibold">{item.titulo}</span>
                  <span className="truncate text-xs text-suave">{item.detalhe}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-auto text-xs text-suave">{c.descricao}</p>
        </>
      )}
      {!ok && c.href && (
        <Link href={c.href} className="text-[13px] font-semibold text-verde">
          Ver tudo
        </Link>
      )}
    </article>
  );
}
