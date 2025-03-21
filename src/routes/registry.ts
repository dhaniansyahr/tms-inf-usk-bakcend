import ShiftRoutes from "./Shift";
import UserRoutes from "./User";
import RuanganLaboratoriumRoutes from "./RuanganLaboratorium";
import JadwalRoutes from "./Jadwal";
import UserLevelsRoutes from "./UserLevels";
import AclRoutes from "./Acl";

const RoutesRegistry = {
    UserRoutes,
    ShiftRoutes,
    RuanganLaboratoriumRoutes,
    JadwalRoutes,
    UserLevelsRoutes,
    AclRoutes,
};

export default RoutesRegistry;
