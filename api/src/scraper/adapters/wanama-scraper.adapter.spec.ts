import { WanamaScraperAdapter } from './wanama-scraper.adapter';

describe('WanamaScraperAdapter', () => {
  let adapter: WanamaScraperAdapter;

  beforeEach(() => {
    adapter = new WanamaScraperAdapter();
  });

  it('debe descubrir URLs de productos filtrando palabras clave de accesorios', async () => {
    const mockSitemapXml = `
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.wanama.com/productos/113-3367_-_camisa_new_margarite</loc></url>
        <url><loc>https://www.wanama.com/productos/110-3313_-_remera_berthie_pima_ii</loc></url>
        <url><loc>https://www.wanama.com/productos/110-3313_-_cartera_cuero</loc></url>
      </urlset>
    `;

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockSitemapXml,
    } as unknown as Response);

    const urls = await adapter.discoverProductUrls(10);

    expect(urls).toEqual([
      'https://www.wanama.com/productos/113-3367_-_camisa_new_margarite',
      'https://www.wanama.com/productos/110-3313_-_remera_berthie_pima_ii',
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
