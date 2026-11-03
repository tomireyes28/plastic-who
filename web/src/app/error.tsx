'use client';

export default function CatalogError() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-editorial text-3xl font-bold">No pudimos cargar el catálogo</h1>
      <p className="mt-4">
        La fuente de datos no está disponible. Podés volver a intentar en unos momentos.
      </p>
      <a href="/" className="mt-6 inline-block border border-[#191c18] px-4 py-2 underline">
        Volver a intentar
      </a>
    </main>
  );
}
