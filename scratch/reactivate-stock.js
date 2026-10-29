require('dotenv').config({ path: 'api/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.product.updateMany({
    where: {
      isActive: false,
      rawComposition: { not: null },
    },
    data: {
      isActive: true,
    },
  });
  console.log('Productos reactivados exitosamente:', result.count);
  const totalActivos = await prisma.product.count({ where: { isActive: true } });
  console.log('Total productos activos en catalogo:', totalActivos);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
