import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { usuarioAtual } from "@/lib/auth/sessao";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

// Etapas do funil que aparecem na trilha animada (a 12, recusados, fica de fora).
const TRILHA = [
  "Escopo",
  "Comercial",
  "Fechamento",
  "Assinatura",
  "Food Checker",
  "Pasta burocrática",
  "Agendamento de diagnóstico",
  "Coleta de dados",
  "Documentação",
  "Treinamento",
  "Visitas técnicas",
];

export default async function PaginaLogin() {
  if (await usuarioAtual()) redirect("/");

  return (
    <div className="flex min-h-screen flex-wrap bg-tinta">
      <section className="fundo-grade relative flex min-w-0 flex-[1_1_620px] flex-col justify-between gap-14 overflow-hidden px-6 py-10 text-claro sm:px-14 sm:py-12">
        <div className="flex flex-wrap items-center gap-3">
          <Marca />
          <span className="rounded-full border border-claro/20 px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-claro-2">
            SEGURANÇA ALIMENTAR
          </span>
        </div>

        <div className="max-w-[640px]">
          <p className="animate-subir mb-5 font-mono text-[13px] tracking-[0.12em] text-menta">
            DO ORÇAMENTO À VISITA TÉCNICA
          </p>
          <h1 className="animate-subir font-display text-[clamp(44px,5.4vw,76px)] leading-[0.98] font-extrabold tracking-[-0.035em] [animation-delay:80ms]">
            Cada cliente,
            <br />
            cada etapa,
            <br />
            <span className="text-menta">sob controle.</span>
          </h1>
          <p className="animate-subir mt-7 max-w-[480px] text-[17px] leading-relaxed text-claro-2 [animation-delay:180ms]">
            O funil completo da consultoria em um só lugar: contratos, coletas de dados, visitas,
            documentos e prazos.
          </p>
        </div>

        <div className="animate-subir flex flex-col gap-4 [animation-delay:280ms]">
          <div className="flex justify-between font-mono text-[11px] tracking-[0.08em] text-claro-3">
            <span>ETAPA 01 · ESCOPO</span>
            <span>ETAPA 11 · VISITAS</span>
          </div>
          <div className="relative h-[18px]" aria-hidden="true">
            <div className="absolute inset-x-0 top-2 h-0.5 bg-claro/15" />
            <div className="absolute inset-0 flex items-center justify-between">
              {TRILHA.map((nome, i) => {
                const ponta = i === 0 || i === TRILHA.length - 1;
                return (
                  <span
                    key={nome}
                    title={nome}
                    className={
                      ponta
                        ? "block size-3.5 rounded-full border-2 border-menta bg-menta"
                        : "block size-2 rounded-full border-2 border-claro/45 bg-tinta"
                    }
                  />
                );
              })}
            </div>
            <div className="animate-percorrer absolute top-[3px] -ml-1.5 size-3 rounded-full bg-menta shadow-[0_0_0_6px_rgb(43_212_138/0.18),0_0_24px_4px_rgb(43_212_138/0.55)]" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-claro-2">
            <span className="inline-flex items-center gap-2">
              <span className="animate-pulsar size-2 rounded-full bg-menta" />
              Histórico de cada passagem de etapa
            </span>
            <span>Ciclos de contrato com visitas periódicas</span>
            <span>Alertas de prazo e validade</span>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-[1_1_440px] items-center justify-center bg-fundo px-4 py-12 sm:px-6">
        <FormularioLogin />
      </section>
    </div>
  );
}
