import ShiftRoutes from "./Shift";
import UserRoutes from "./User";
import RuanganLaboratoriumRoutes from "./RuanganLaboratorium";
import JadwalRoutes from "./Jadwal";
import UserLevelsRoutes from "./UserLevels";
import AclRoutes from "./Acl";
import PendaftaranAsistenLabRoutes from "./PendaftaranAsistenLab";
import UploadRoutes from "./UploadFile";

const RoutesRegistry = {
        UserRoutes,
        ShiftRoutes,
        RuanganLaboratoriumRoutes,
        JadwalRoutes,
        UserLevelsRoutes,
        AclRoutes,
        PendaftaranAsistenLabRoutes,
        UploadRoutes,
};

export default RoutesRegistry;
