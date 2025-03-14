import "../../src/paths";
import { prisma } from "../../src/utils/prisma.utils";
import { seedUserLevels } from "./seedUserLevels";
import { seedUsers } from "./seedUser";
import { seedShift } from "./seedShift";
import { seedRuangan } from "./seedRuangan";
import { seedMataKuliah } from "./seedMataKuliah";
async function seed() {
    await seedUserLevels(prisma);
    await seedUsers(prisma);
    await seedShift(prisma);
    await seedRuangan(prisma);
    await seedMataKuliah(prisma);
}

seed().then(() => {
    console.log("ALL SEEDING DONE");
});
