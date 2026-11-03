import { CatalogExplorer } from '../components/CatalogExplorer';
import { loadCatalog } from '../lib/catalog-source';

// Read both Prisma and HTTP sources per request, including after a build.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { mode, brands, products } = await loadCatalog();
  return (
    <main>
      {mode === 'demo' && (
        <div className="border-b border-[#c48b28]/40 bg-[#c48b28]/15 px-4 py-2 text-center">
          <p className="font-label text-xs text-[#6e4b0c]">
            Modo demostración: productos de ejemplo. No representan precios ni disponibilidad actuales.
          </p>
        </div>
      )}
      {products.length === 0 ? (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="font-editorial text-3xl font-bold">Plastic Who?</h1>
          <p className="mt-4">El catálogo no tiene prendas para mostrar en este momento.</p>
          <a href="/" className="mt-4 inline-block underline">Volver a cargar</a>
        </section>
      ) : <CatalogExplorer initialBrands={brands} initialProducts={products} />}
    </main>
  );
}
