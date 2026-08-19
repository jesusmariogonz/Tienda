import { runSeed } from "../src/server/services/seed";
import { prisma } from "../src/lib/prisma";

runSeed()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
