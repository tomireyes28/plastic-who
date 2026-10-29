async function test() {
  const res = await fetch('https://indiastyle.com.ar/sitemap.xml', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const text = await res.text();
  const prodUrls = [...text.matchAll(/<loc>(https:\/\/indiastyle\.com\.ar\/productos\/[^<]+)<\/loc>/g)].map(m => m[1]);
  console.log('Total prodUrls:', prodUrls.length);

  // Clothing SKUs usually start with digit + 2 letters (e.g. 1PA, 1TO, 1CH, 1BL, 1SH, 1CA, 1HA, 1VE, 1MO, 1TE, 1PO, etc.)
  const skuRegex = /\/productos\/\d[A-Z]{2}[A-Z0-9_-]+\/?$/;
  const skuProds = prodUrls.filter(u => skuRegex.test(u));
  console.log('SKU prods matching clothing pattern:', skuProds.length);
  console.log('Sample SKU prods:', skuProds.slice(0, 10));

  const nonSku = prodUrls.filter(u => !skuRegex.test(u));
  console.log('Sample non-SKU prods:', nonSku.slice(0, 10));
}
test();
