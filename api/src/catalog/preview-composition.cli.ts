import { NestFactory } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { CompositionParserService } from '../composition/composition-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildCompositionPreview, readCompositionSnapshot, renderCompositionPreview } from './composition-preview';
import { PreviewCompositionModule } from './preview-composition.module';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--output' || !args[1].trim()) {
    throw new Error('Desde la raíz: node api/dist/catalog/preview-composition.cli.js --output <directorio-nuevo>. Solo vista previa; no existe --apply.');
  }
  const output = resolve(args[1]);
  try {
    await access(output);
    throw new Error('El directorio de salida ya existe.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const context = await NestFactory.createApplicationContext(PreviewCompositionModule, { logger: false });
  try {
    const code = await Promise.all([
      '../composition/composition-parser.service.js', '../composition/fiber-dictionary.js',
      '../composition/traffic-light.service.js', './composition-preview.js',
    ].map(file => readFile(resolve(__dirname, file))));
    const fingerprint = createHash('sha256');
    for (const file of code) fingerprint.update(file);
    const products = await readCompositionSnapshot(context.get(PrismaService));
    const database = new URL(process.env.DATABASE_URL!);
    const databaseFingerprint = createHash('sha256')
      .update([database.hostname, database.port, database.pathname, database.username].join('|')).digest('hex');
    const preview = buildCompositionPreview(products, context.get(CompositionParserService), fingerprint.digest('hex'), databaseFingerprint);
    await mkdir(dirname(output), { recursive: true });
    // Exclusive creation also prevents overwriting an artifact created during the query.
    await mkdir(output);
    await writeFile(resolve(output, 'preview.json'), JSON.stringify(preview, null, 2) + '\n', { flag: 'wx' });
    await writeFile(resolve(output, 'RESUMEN.md'), renderCompositionPreview(preview), { flag: 'wx' });
    console.log(JSON.stringify({ mode: preview.mode, output, summary: preview.summary }, null, 2));
  } finally {
    await context.close();
  }
}

main().catch(() => {
  // Do not print connection strings, environment values or raw provider errors.
  console.error('No se pudo generar la vista previa. Verificá argumentos, un directorio nuevo y la conexión configurada en api/.env. No se aplicaron cambios en la base.');
  process.exitCode = 1;
});
