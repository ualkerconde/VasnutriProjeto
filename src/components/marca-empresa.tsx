import { lerLogotipo } from "@/lib/logotipo";
import { Marca } from "./marca";

/** Logotipo enviado em Cadastros › Aparência; sem ele, a marca padrão. */
export async function MarcaEmpresa({ tamanho = 30, className = "", altura = 40 }: { tamanho?: number; className?: string; altura?: number }) {
  const logo = await lerLogotipo().catch(() => null);
  if (!logo) return <Marca tamanho={tamanho} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/logotipo?v=${encodeURIComponent(logo.versao)}`} alt="Logotipo" style={{ maxHeight: altura }} className={`block w-auto max-w-[200px] object-contain ${className}`} />
  );
}
