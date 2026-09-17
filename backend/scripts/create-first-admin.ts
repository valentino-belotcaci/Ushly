/// <reference types="node" />

import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:bootstrap -- user@example.com');
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient();
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (existingAdmin) {
      throw new Error('An administrator already exists; bootstrap is one-time only.');
    }

    const result = await prisma.user.updateMany({
      where: { email, role: 'USER' },
      data: { role: 'ADMIN' },
    });
    if (result.count !== 1) {
      throw new Error('No matching normal user exists. Register the account first.');
    }
    console.log(`Promoted ${email} to administrator.`);
  } finally {
    await prisma.$disconnect();
  }
}
