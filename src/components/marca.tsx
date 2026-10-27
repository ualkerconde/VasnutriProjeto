export function Marca({ tamanho = 36, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 36 36" aria-hidden="true">
        <rect x="1" y="1" width="34" height="34" rx="10" fill="#2BD48A" />
        <path d="M10 11 L18 26 L26 11" fill="none" stroke="#0B1612" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="11" r="2.4" fill="#0B1612" />
      </svg>
      <span className="font-display text-[22px] font-extrabold tracking-tight">vasnutri</span>
    </span>
  );
}
