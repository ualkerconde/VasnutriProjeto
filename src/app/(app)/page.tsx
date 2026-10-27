import type { Metadata } from "next";
import { exigirModulo } from "@/lib/auth/sessao";
import { dataPorExtenso, formatarDias, primeiroNome, saudacao } from "@/lib/formato";
import { dadosDoPainel } from "@/lib/painel";

export const metadata: Metadata = { title: "Painel" };

export default async function Painel({ searchParams }: PageProps<"/">) {
  const usuario = await exigirModulo("PAINEL");
  const { "sem-acesso": semAcesso } = await searchParams;
  const dados = await dadosDoPainel(usuario.id);
  const agora = new Date();
  const maior = Math.max(1, ...dados.funil.map((l) => l.quantidade));

  const indicadores = [
    { rotulo: "Processos em andamento", valor: dados.emAndamento, nota: "Etapas 1 a 11", selo: "FUNIL", escuro: true },
    { rotulo: "Orçamentos aguardando", valor: dados.orcamentosAguardando, nota: "Esperando aprovação do cliente", selo: "ETAPA 2" },
    { rotulo: "Clientes cadastrados", valor: dados.clientes, nota: "Carteira completa", selo: "CADASTRO" },
    { rotulo: "Notificações novas", valor: dados.naoLidas, nota: "Não lidas por você", selo: "AVISOS", alerta: dados.naoLidas > 0 },
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

      <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {indicadores.map((k, i) => (
          <article
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
          </article>
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
          <h2 id="titulo-voce" className="mb-4 font-display text-[22px] font-bold tracking-[-0.02em]">
            Precisa de você
          </h2>
          {dados.notificacoes.length === 0 ? (
            <p className="rounded-[14px] bg-claro/5 p-4 text-sm text-claro-2">
              Nada pendente agora. Avisos de prazos, vencimentos e etapas aparecem aqui.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {dados.notificacoes.map((n) => (
                <li key={n.id} className="flex gap-3 rounded-[14px] bg-claro/5 p-3.5">
                  <span className="mt-1.5 size-2.5 flex-none rounded-full bg-ambar" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm leading-snug font-semibold">{n.titulo}</span>
                    {n.mensagem && <span className="text-[13px] leading-snug text-claro-2">{n.mensagem}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
