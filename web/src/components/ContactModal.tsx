'use client';

import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Sugerir una tienda');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, reason, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el mensaje');
      }

      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al enviar.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setErrorMsg(null);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#191c18]/60 p-4 backdrop-blur-xs"
      onClick={handleReset}
    >
      <div
        className="garment-tag-border relative w-full max-w-lg border-2 border-[#191c18] bg-[#fbf9f5] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleReset}
          aria-label="Cerrar ventana"
          className="font-label absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center border border-[#cfc6b4] bg-[#f3efe6] text-sm font-bold text-[#191c18] transition-colors hover:border-[#191c18] hover:bg-[#191c18] hover:text-[#f3efe6]"
        >
          ✕
        </button>

        <span className="font-label text-[11px] font-bold tracking-widest text-[#2b593f] uppercase">
          Plastic Who? · Buzón Abierto
        </span>

        {submitted ? (
          <div className="mt-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2b593f]/10 text-2xl text-[#2b593f]">
              ✓
            </div>
            <h3 className="font-editorial mt-3 text-2xl font-bold text-[#191c18]">
              ¡Gracias por escribirnos!
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#494c45]">
              Tu sugerencia nos ayuda a mantener este archivo textil
              transparente y libre de engaños comerciales. Te responderemos a la
              brevedad.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="font-label mt-6 cursor-pointer border border-[#191c18] bg-[#191c18] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#f3efe6] transition-colors hover:bg-[#343831]"
            >
              Volver al Catálogo
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-editorial mt-1 text-2xl font-bold text-[#191c18]">
              Sugerir una tienda o prenda
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5a5d55]">
              ¿Conocés una marca argentina con buenas telas? ¿Encontraste un
              error en la composición de una prenda? Dejanos tu comentario.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="font-label block text-[11px] font-bold tracking-wider text-[#191c18] uppercase"
                >
                  Tu Nombre *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sofía"
                  className="font-label mt-1 w-full border border-[#cfc6b4] bg-[#f3efe6] px-3 py-2 text-xs text-[#191c18] placeholder:text-[#8c887e] focus:border-[#191c18] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="font-label block text-[11px] font-bold tracking-wider text-[#191c18] uppercase"
                >
                  Tu Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  className="font-label mt-1 w-full border border-[#cfc6b4] bg-[#f3efe6] px-3 py-2 text-xs text-[#191c18] placeholder:text-[#8c887e] focus:border-[#191c18] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-reason"
                  className="font-label block text-[11px] font-bold tracking-wider text-[#191c18] uppercase"
                >
                  Motivo del Mensaje
                </label>
                <select
                  id="contact-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="font-label mt-1 w-full border border-[#cfc6b4] bg-[#f3efe6] px-3 py-2 text-xs text-[#191c18] focus:border-[#191c18] focus:outline-none"
                >
                  <option value="Sugerir una tienda">
                    Sugerir una tienda nueva para auditar
                  </option>
                  <option value="Corregir composición">
                    Avisar un error de composición en una prenda
                  </option>
                  <option value="Consulta sobre semáforo">
                    Consulta sobre los criterios de fibras
                  </option>
                  <option value="Otro comentario">
                    Otro comentario o feedback general
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="font-label block text-[11px] font-bold tracking-wider text-[#191c18] uppercase"
                >
                  Mensaje *
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribí acá tu sugerencia, link de la tienda o detalle de la prenda..."
                  className="font-label mt-1 w-full border border-[#cfc6b4] bg-[#f3efe6] px-3 py-2 text-xs text-[#191c18] placeholder:text-[#8c887e] focus:border-[#191c18] focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="border border-[#b33c2e]/40 bg-[#b33c2e]/10 p-2.5 text-xs text-[#8a281d]">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="font-label cursor-pointer border border-[#cfc6b4] bg-[#f3efe6] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#5a5d55] transition-colors hover:border-[#191c18] hover:text-[#191c18]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-label cursor-pointer border border-[#191c18] bg-[#191c18] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#f3efe6] transition-colors hover:bg-[#343831] disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
