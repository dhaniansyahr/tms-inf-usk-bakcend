import "../../src/paths";
import { prisma } from "../../src/utils/prisma.utils";
import { seedUserLevels } from "./seedUserLevels";
import { seedUsers } from "./seedUser";
import { seedShift } from "./seedShift";
import { seedRuangan, seedRuanganLab } from "./seedRuangan";
import { seedMataKuliah } from "./seedMataKuliah";
import { seedMahasiswa } from "./seedMahasiswa";
import { seedDosen } from "./seedDosen";
import { seedAcl } from "./seedAcl";
import { seedJadwal } from "./seedJadwal";

async function seed() {
        await seedUserLevels(prisma);
        await seedUsers(prisma);
        await seedMahasiswa(prisma);
        await seedDosen(prisma);
        await seedShift(prisma);
        await seedAcl(prisma);
        await seedRuangan(prisma);
        await seedRuanganLab(prisma);
        await seedMataKuliah(prisma);
        await seedJadwal(prisma);
}

seed().then(() => {
        console.log("ALL SEEDING DONE");
});
