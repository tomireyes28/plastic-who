import { CatalogExplorer } from '../components/CatalogExplorer';
import { fetchBrands, fetchProducts } from '../lib/api';
import { BrandSummary, ProductCardItem } from '../types/catalog';

const FALLBACK_BRANDS: BrandSummary[] = [
  {
    id: 'fallback-wanama',
    name: 'Wanama',
    slug: 'wanama',
    websiteUrl: 'https://www.wanama.com',
    platform: 'POW',
    isKnownBrand: true,
    lastScrapedAt: null,
    productCount: 2,
  },
];

const FALLBACK_PRODUCTS: ProductCardItem[] = [
  {
    id: 'sample-1',
    externalId: '4613',
    name: 'Camisa New Margarite',
    slug: '113-3367_-_camisa_new_margarite',
    productUrl:
      'https://www.wanama.com/productos/113-3367_-_camisa_new_margarite',
    imageUrl:
      'https://wanama.powcdn.com/uploads/picture/image/72735/sabana_11333670w-7_1790601463.jpg',
    price: 219990,
    specialPrice: 175992,
    category: 'Camisas',
    rawComposition: '100% ramié.',
    naturalPercentage: 100,
    semiSyntheticPercentage: 0,
    syntheticPercentage: 0,
    trafficLight: 'GREEN',
    hasSyntheticLining: false,
    inStock: true,
    brand: {
      id: 'fallback-wanama',
      name: 'Wanama',
      slug: 'wanama',
    },
    fibers: [
      {
        fiberName: 'ramié',
        category: 'NATURAL',
        percentage: 100,
        isLining: false,
      },
    ],
  },
  {
    id: 'sample-2',
    externalId: '3313',
    name: 'Remera Berthie Pima II',
    slug: '110-3313_-_remera_berthie_pima_ii',
    productUrl:
      'https://www.wanama.com/productos/110-3313_-_remera_berthie_pima_ii',
    imageUrl: null,
    price: 69990,
    specialPrice: null,
    category: 'Remeras',
    rawComposition: '100% algodón.',
    naturalPercentage: 100,
    semiSyntheticPercentage: 0,
    syntheticPercentage: 0,
    trafficLight: 'GREEN',
    hasSyntheticLining: false,
    inStock: true,
    brand: {
      id: 'fallback-wanama',
      name: 'Wanama',
      slug: 'wanama',
    },
    fibers: [
      {
        fiberName: 'algodón',
        category: 'NATURAL',
        percentage: 100,
        isLining: false,
      },
    ],
  },
];

export default async function HomePage() {
  let brands: BrandSummary[] = FALLBACK_BRANDS;
  let products: ProductCardItem[] = FALLBACK_PRODUCTS;
  let isUsingFallback = false;

  try {
    const [fetchedBrands, fetchedProducts] = await Promise.all([
      fetchBrands(),
      fetchProducts({ limit: 120 } as never),
    ]);
    if (fetchedBrands.length > 0) {
      brands = fetchedBrands;
    }
    if (fetchedProducts.length > 0) {
      products = fetchedProducts;
    } else {
      isUsingFallback = true;
    }
  } catch {
    isUsingFallback = true;
  }

  return (
    <main>
      {isUsingFallback && (
        <div className="border-b border-[#c48b28]/40 bg-[#c48b28]/15 px-4 py-2 text-center">
          <p className="font-label text-xs text-[#6e4b0c]">
            Modo vista previa local (Iniciá el backend con{' '}
            <code className="font-bold">npm run dev:api</code> para ver todo el
            catálogo en vivo desde Supabase).
          </p>
        </div>
      )}
      <CatalogExplorer initialBrands={brands} initialProducts={products} />
    </main>
  );
}
