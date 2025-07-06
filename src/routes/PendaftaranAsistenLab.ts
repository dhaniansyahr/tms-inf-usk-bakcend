import { Hono } from "hono";
import * as PendaftaranAsistenLabController from "$controllers/rest/PendaftaranAsistenLabController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as PendaftaranAsistenLabValidation from "$validations/PendaftaranAsistenLabValidation";

const PendaftaranAsistenLabRoutes = new Hono();

PendaftaranAsistenLabRoutes.get(
    "/pendaftaran",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getAll
);

PendaftaranAsistenLabRoutes.get(
    "/pendaftaran/jadwal",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getAllJadwal
);

PendaftaranAsistenLabRoutes.get(
    "/pendaftaran/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getById
);

PendaftaranAsistenLabRoutes.post(
    "/pendaftaran",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "create"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.create
);

PendaftaranAsistenLabRoutes.put(
    "/pendaftaran/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "update"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.update
);

PendaftaranAsistenLabRoutes.delete(
    "/pendaftaran",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "delete"),
    PendaftaranAsistenLabController.deleteByIds
);

PendaftaranAsistenLabRoutes.put(
    "/:id/penerimaan",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENERIMAAN_ASISTEN_LAB", "update"),
    PendaftaranAsistenLabValidation.validatePenerimaanAsistenLab,
    PendaftaranAsistenLabController.penerimaanAsistenLab
);

PendaftaranAsistenLabRoutes.put(
    "/:id/assign",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "update"),
    PendaftaranAsistenLabController.assignAsistenLab
);

PendaftaranAsistenLabRoutes.get(
    "/jadwal/:jadwalId",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getAllAsistenLabByJadwalId
);

export default PendaftaranAsistenLabRoutes;
