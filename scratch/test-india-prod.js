async function test() {
  const url = 'https://indiastyle.com.ar/productos/1BL1854349A/';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();

  const getMeta = (prop) => {
    const m = html.match(new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']`, 'i')) ||
              html.match(new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+property=["']${prop}["']`, 'i'));
    return m ? m[1] : null;
  };

  const title = getMeta('og:title') || '';
  const desc = getMeta('og:description') || '';
  const image = getMeta('og:image:secure_url') || getMeta('og:image') || '';
  const price = getMeta('tiendanube:price');
  const stock = getMeta('tiendanube:stock') || '1';

  console.log({
    url,
    title: title.replace(/\s*\|\s*India Style/i, '').trim(),
    desc,
    image,
    price: price ? parseFloat(price) : null,
    inStock: parseInt(stock, 10) > 0
  });
}
test();
