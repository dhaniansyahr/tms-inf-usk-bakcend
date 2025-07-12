import { Hono } from "hono";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as MasterDataController from "$controllers/rest/MasterDataController";

const MasterDataRoutes = new Hono();

MasterDataRoutes.get(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "read"),
    MasterDataController.getAllMahasiswa
);

MasterDataRoutes.get(
    "/dosen",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "read"),
    MasterDataController.getAllDosen
);

MasterDataRoutes.get(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "read"),
    MasterDataController.getAllMatakuliah
);

MasterDataRoutes.get(
    "/mahasiswa/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "read"),
    MasterDataController.getByIdMahasiswa
);

MasterDataRoutes.get(
    "/dosen/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "read"),
    MasterDataController.getByIdDosen
);

MasterDataRoutes.get(
    "/mata-kuliah/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "read"),
    MasterDataController.getByIdMatakuliah
);

export default MasterDataRoutes;
