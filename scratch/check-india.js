require('dotenv').config({ path: 'api/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const brand = await prisma.brand.findUnique({
    where: { slug: 'india-style' },
    include: { products: { take: 5 } }
  });
  console.log('India Style en DB:', brand.name, 'Productos count:', brand.products.length);
  console.log('Sample product:', {
    name: brand.products[0].name,
    category: brand.products[0].category,
    rawComposition: brand.products[0].rawComposition,
    trafficLight: brand.products[0].trafficLight,
    price: brand.products[0].price,
    isActive: brand.products[0].isActive
  });
  const totalActivos = await prisma.product.count({ where: { isActive: true } });
  console.log('Total activo en todo el catalogo:', totalActivos);
}
test().finally(() => prisma.$disconnect());
