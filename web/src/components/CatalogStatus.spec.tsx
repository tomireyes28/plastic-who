import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogStatus } from './CatalogStatus';
const brand = { id: 'fixture', slug: 'fixture', name: 'Fixture', websiteUrl: '', platform: 'OTHER', isKnownBrand: false, productCount: 6000, lastScrapedAt: null };
describe('Honest archive scope (H11)', () => {
  it('shows missing dates and a truncated selection rather than claiming freshness', () => {
    const html = renderToStaticMarkup(<CatalogStatus brands={[brand]} loaded={5000} />);
    expect(html).toContain('sin fecha registrada'); expect(html).toContain('5.000 de 6.000');
    expect(html).toContain('corridas parciales'); expect(html).toContain('No se garantiza');
  });
  it('shows actual recorded dates and handles invalid dates', () => {
    const html = renderToStaticMarkup(<CatalogStatus brands={[{ ...brand, lastScrapedAt: '2026-10-01T12:00:00Z' }]} loaded={6000} />);
    expect(html).toContain('1/10/2026'); expect(html).not.toContain('Se cargaron');
    expect(renderToStaticMarkup(<CatalogStatus brands={[{ ...brand, lastScrapedAt: 'invalid' }]} loaded={6000} />)).toContain('sin fecha registrada');
  });
});
