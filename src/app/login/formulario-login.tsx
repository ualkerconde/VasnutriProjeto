"use client";

import { useActionState, useState } from "react";
import { entrar, type EstadoLogin } from "@/lib/auth/acoes";

const campo =
  "h-[52px] w-full rounded-[14px] border-[1.5px] border-linha bg-superficie px-4 text-[15px] font-medium text-texto transition-[border-color,box-shadow] outline-none placeholder:text-suave/70 focus:border-verde focus:shadow-[0_0_0_4px_rgb(43_212_138/0.22)]";

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <form action={acao} className="animate-subir flex w-full max-w-[400px] flex-col gap-[22px] [animation-delay:80ms]">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[34px] font-bold tracking-[-0.03em]">Bem-vindo de volta</h2>
        <p className="text-[15px] text-suave">Entre com seu e-mail da equipe.</p>
      </div>

      {estado.erro && (
        <p role="alert" className="rounded-[14px] bg-[#FCE4DE] px-4 py-3 text-sm font-medium text-[#9A2B12]">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-semibold text-texto-2">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          placeholder="nome@vasnutri.com.br"
          className={campo}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="senha" className="text-[13px] font-semibold text-texto-2">
            Senha
          </label>
          <span className="text-[13px] text-suave">Esqueceu? Fale com o administrador.</span>
        </div>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={`${campo} pr-14`}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
            className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-suave hover:bg-linha-suave"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {mostrarSenha && <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-texto-2">
        <input type="checkbox" name="lembrar" className="size-[18px] accent-verde" />
        Manter conectado neste aparelho
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="flex h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-tinta text-base font-semibold text-fundo transition-colors hover:bg-[#163A2C] disabled:cursor-wait disabled:opacity-80"
      >
        {enviando ? "Entrando…" : "Entrar"}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2BD48A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>

      <div className="flex items-center gap-3 rounded-[14px] bg-[#E6EEE9] px-4 py-3.5 text-[13px] leading-normal text-texto-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B7A4B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
          <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        Cada pessoa vê só as telas do seu perfil: Administrador, Comercial ou Técnico.
      </div>
    </form>
  );
}
