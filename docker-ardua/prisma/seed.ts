import { categories, products, productsItem, gameRecords, carModel } from './constants';
import { prisma } from './prisma-client';
import { hashSync } from 'bcrypt';


async function up() {
  await prisma.user.createMany({
    data: [
      {
        fullName: 'Pi',
        email: 'umdom2@gmail.com',
        password: hashSync('123123', 10),
        role: 'ADMIN',
      },
      {
        fullName: 'Yatsyk',
        email: 'yatsyk@gmail.com',
        password: hashSync('123123', 10),
        role: 'USER',
      },
      {
        fullName: '123',
        email: '123@123.com',
        password: hashSync('123123', 10),
        role: 'USER',
      },
    ],
  });

  await prisma.category.createMany({
    data: categories,
  });

  await prisma.product.createMany({
    data: products,
  });

  await prisma.productItem.createMany({
    data: productsItem,
  });

  await prisma.gameRecords.createMany({
    data: gameRecords,
  });

  await prisma.carModel.createMany({
    data: carModel,
  });
}

async function down() {
  await prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Category" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Product" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ProductItem" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "GameRecords" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "CarModel" RESTART IDENTITY CASCADE`;
}

async function main() {
  try {
    await down();
    await up();
  } catch (e) {
    console.error(e);
  }
}

main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
