import { useState } from "react";

/** Copia a URL atual (com os filtros já refletidos na query string) pra área de transferência. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — falha silenciosa,
      // não é crítico o suficiente pra interromper o usuário com um erro.
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[12px] text-text-dim transition hover:border-border-strong hover:text-text active:scale-[0.97]"
    >
      {copied ? (
        <span className="text-accent">link copiado</span>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M6.5 9.5L9.5 6.5M7 4L7.5 3.5a2.5 2.5 0 013.5 3.5L10.5 8M9 12l-.5.5a2.5 2.5 0 01-3.5-3.5L5.5 8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          copiar link
        </>
      )}
    </button>
  );
}
