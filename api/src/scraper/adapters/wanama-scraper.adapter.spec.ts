import { WanamaScraperAdapter } from './wanama-scraper.adapter';

describe('WanamaScraperAdapter', () => {
  let adapter: WanamaScraperAdapter;

  beforeEach(() => {
    adapter = new WanamaScraperAdapter();
  });

  it('debe extraer links únicos de productos desde el HTML de una categoría', () => {
    const sampleCategoryHtml = `
      <div>
        <a href="/productos/113-3367_-_camisa_new_margarite">Camisa</a>
        <a href="/productos/110-3313_-_remera_berthie_pima_ii">Remera</a>
        <a href="/productos/113-3367_-_camisa_new_margarite">Duplicado</a>
      </div>
    `;

    const links = adapter.extractProductLinksFromHtml(sampleCategoryHtml);

    expect(links).toEqual([
      '/productos/113-3367_-_camisa_new_margarite',
      '/productos/110-3313_-_remera_berthie_pima_ii',
    ]);
  });

  it('debe parsear un producto completo desde el payload Next.js de POW', () => {
    const payloadObj = {
      item: {
        id: 4613,
        title: 'Camisa New Margarite',
        slug: '113-3367_-_camisa_new_margarite',
        categories: [
          { id: 685, name: 'SS27', slug: 'ss-27' },
          { id: 681, name: 'Camisas', slug: 'camisas-ss27' },
        ],
        description: '• Camisa de ramié.\n• Composición: 100% ramié.',
        total_stock: 17,
        no_stock: false,
        pictures: ['https://wanama.powcdn.com/uploads/camisa.jpg'],
        variant: {
          non_formatted_price: 219990,
          non_formatted_special_price: 175992,
          has_special_price: true,
        },
      },
    };

    const escapedChunk = JSON.stringify(JSON.stringify(payloadObj)).slice(
      1,
      -1,
    );
    const mockHtml = `<script>self.__next_f.push([1,"${escapedChunk}"])</script>`;

    const result = adapter.parseProductFromHtml(
      mockHtml,
      '113-3367_-_camisa_new_margarite',
    );

    expect(result).toEqual({
      externalId: '4613',
      name: 'Camisa New Margarite',
      slug: '113-3367_-_camisa_new_margarite',
      productUrl:
        'https://www.wanama.com/productos/113-3367_-_camisa_new_margarite',
      imageUrl: 'https://wanama.powcdn.com/uploads/camisa.jpg',
      price: 219990,
      specialPrice: 175992,
      category: 'Camisas',
      description: '• Camisa de ramié.\n• Composición: 100% ramié.',
      inStock: true,
    });
  });
});
