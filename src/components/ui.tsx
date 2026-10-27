import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Peças visuais comuns às telas. Todas funcionam em componentes de servidor.

export function CabecalhoPagina({
  sobretitulo,
  titulo,
  descricao,
  acoes,
}: {
  sobretitulo?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="animate-subir flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {sobretitulo && <p className="mb-1.5 font-mono text-xs tracking-[0.1em] text-verde uppercase">{sobretitulo}</p>}
        <h1 className="font-display text-[clamp(28px,3.2vw,40px)] leading-[1.05] font-extrabold tracking-[-0.035em] break-words">
          {titulo}
        </h1>
        {descricao && <p className="mt-2 max-w-2xl text-[15px] text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export function Cartao({
  titulo,
  acoes,
  children,
  className = "",
  escuro = false,
  id,
}: {
  titulo?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  escuro?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`min-w-0 rounded-[22px] p-4 sm:p-6 ${escuro ? "bg-tinta text-claro" : "border border-[#E1E9E4] bg-superficie"} ${className}`}
    >
      {(titulo || acoes) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {titulo && <h2 className="font-display text-[20px] font-bold tracking-[-0.02em]">{titulo}</h2>}
          {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const estilosBotao = {
  primario: "bg-tinta text-fundo hover:bg-[#163A2C]",
  menta: "bg-menta text-tinta hover:bg-[#25BF7B]",
  secundario: "border-[1.5px] border-linha bg-superficie text-texto hover:border-verde",
  perigo: "border-[1.5px] border-[#F3C5B8] bg-superficie text-[#9A2B12] hover:bg-[#FCE4DE]",
  fantasma: "text-verde hover:bg-[#E6EEE9]",
} as const;

export type VarianteBotao = keyof typeof estilosBotao;

export function classeBotao(variante: VarianteBotao = "primario", pequeno = false) {
  return `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-center font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
    pequeno ? "min-h-9 px-3 text-[13px]" : "min-h-11 px-4 text-sm"
  } ${estilosBotao[variante]}`;
}

export function LinkBotao({
  variante = "primario",
  pequeno = false,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: VarianteBotao; pequeno?: boolean }) {
  return <Link {...props} className={`${classeBotao(variante, pequeno)} ${className}`} />;
}

const estilosSelo = {
  verde: "bg-[#E1F5EA] text-[#0B5F3B]",
  ambar: "bg-[#FDF0D5] text-ambar-texto",
  vermelho: "bg-[#FCE4DE] text-[#9A2B12]",
  cinza: "bg-linha-suave text-texto-2",
  tinta: "bg-tinta text-menta",
} as const;

export type CorSelo = keyof typeof estilosSelo;

export function Selo({ cor = "cinza", children }: { cor?: CorSelo; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${estilosSelo[cor]}`}>
      {children}
    </span>
  );
}

export function EstadoVazio({ children }: { children: ReactNode }) {
  return <p className="rounded-[14px] border border-dashed border-linha p-6 text-center text-sm text-suave">{children}</p>;
}

export function Aviso({ cor = "ambar", children }: { cor?: "ambar" | "vermelho" | "verde"; children: ReactNode }) {
  const estilos = {
    ambar: "bg-[#FDF0D5] text-ambar-texto",
    vermelho: "bg-[#FCE4DE] text-[#9A2B12]",
    verde: "bg-[#E1F5EA] text-[#0B5F3B]",
  };
  return <p className={`rounded-[14px] px-4 py-3 text-sm font-medium ${estilos[cor]}`}>{children}</p>;
}

/** Lista de definições: rótulo em cima, valor embaixo. */
export function Dados({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-4">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="min-w-0">
          <dt className="text-xs font-semibold tracking-[0.04em] text-suave uppercase">{rotulo}</dt>
          <dd className="mt-1 text-[15px] break-words whitespace-pre-line">{valor ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs tracking-[0.04em] text-suave">
            {cabecalho.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-linha-suave [&>tr:hover]:bg-fundo [&_td]:px-3 [&_td]:py-3">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ─── Campos de formulário ─────────────────────────────────────────────────

export const classeCampo =
  "w-full min-w-0 rounded-xl border-[1.5px] border-linha bg-superficie px-3.5 text-[15px] text-texto outline-none transition-[border-color,box-shadow] placeholder:text-suave/60 focus:border-verde focus:shadow-[0_0_0_4px_rgb(43_212_138/0.22)] disabled:bg-linha-suave";

type BaseCampo = { rotulo: string; nome: string; ajuda?: string; className?: string };

export function Campo({
  rotulo,
  nome,
  ajuda,
  className = "",
  ...props
}: BaseCampo & Omit<ComponentProps<"input">, "name">) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-texto-2">{rotulo}</span>
      <input name={nome} {...props} className={`${classeCampo} h-11`} />
      {ajuda && <span className="text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function AreaTexto({
  rotulo,
  nome,
  ajuda,
  className = "",
  ...props
}: BaseCampo & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-texto-2">{rotulo}</span>
      <textarea name={nome} rows={3} {...props} className={`${classeCampo} py-2.5 leading-relaxed`} />
      {ajuda && <span className="text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function Selecao({
  rotulo,
  nome,
  ajuda,
  opcoes,
  vazio,
  className = "",
  ...props
}: BaseCampo &
  Omit<ComponentProps<"select">, "name"> & {
    opcoes: { valor: string | number; rotulo: string }[];
    vazio?: string;
  }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-texto-2">{rotulo}</span>
      <select name={nome} {...props} className={`${classeCampo} h-11 cursor-pointer`}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda && <span className="text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function Caixa({
  rotulo,
  nome,
  className = "",
  ...props
}: { rotulo: string; nome: string; className?: string } & Omit<ComponentProps<"input">, "name" | "type">) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-texto-2 ${className}`}>
      <input type="checkbox" name={nome} {...props} className="size-[18px] flex-none accent-verde" />
      {rotulo}
    </label>
  );
}

/** Pergunta Sim/Não que pode ficar sem resposta. */
export function SimNao({ rotulo, nome, valor }: { rotulo: string; nome: string; valor: boolean | null | undefined }) {
  const atual = valor === true ? "sim" : valor === false ? "nao" : "";
  return (
    <Selecao
      rotulo={rotulo}
      nome={nome}
      defaultValue={atual}
      vazio="—"
      opcoes={[
        { valor: "sim", rotulo: "Sim" },
        { valor: "nao", rotulo: "Não" },
      ]}
    />
  );
}

export function Grade({ children, colunas = 2 }: { children: ReactNode; colunas?: 2 | 3 | 4 }) {
  const min = { 2: "260px", 3: "200px", 4: "170px" }[colunas];
  return <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` }}>{children}</div>;
}
