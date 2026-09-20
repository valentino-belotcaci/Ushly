//include node.js type definitions
//usefull to use process.argv, process.exitcode
/// <reference types="node" />

import { PrismaClient } from '@prisma/client';//no 'type' because we create a new prismaClient

//take a normal user and change role to admin
//if admin already exists, it refuses to create another one
//run: npm run admin:bootstrap -- alice@example.com

//email sits in process.argv[2], 0 is node executable, 1 script being executed
const email = process.argv[2]?.trim().toLowerCase();

if (!email) {//check if we gave a real email
  console.error('Usage: npm run admin:bootstrap -- user@example.com');
  process.exitCode = 1;//mark program as unsuccesfull
} else {
  const prisma = new PrismaClient();//create a prisma client used for this script
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (existingAdmin) {
      throw new Error('An administrator already exists; bootstrap is one-time only.');
    }
    //change role to admin
    const result = await prisma.user.updateMany({
      where: { email, role: 'USER' },
      data: { role: 'ADMIN' },
    });
    
    if (result.count !== 1) {
      throw new Error('No matching normal user exists. Register the account first.');
    }
    console.log(`Promoted ${email} to administrator.`);
  } finally {
    await prisma.$disconnect();//disconenct prisma at the end
  }
}
