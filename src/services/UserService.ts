import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Dosen, Mahasiswa, User } from "@prisma/client";
import { UserDTO, UserRegisterDTO } from "$entities/User";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

export type CreateResponse = User | {};
export async function create(data: UserRegisterDTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        const user = await prisma.user.create({
            data,
        });

        return {
            status: true,
            data: user,
        };
    } catch (err) {
        Logger.error(`UserService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<User[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const userLevels = await prisma.userLevels.findMany();

        usedFilters.where.AND.push({
            userLevelId: {
                in: userLevels
                    .filter((userLevel) => userLevel.name !== "DOSEN" && userLevel.name !== "MAHASISWA")
                    .map((userLevel) => userLevel.id),
            },
        });

        const [user, totalData] = await Promise.all([
            prisma.user.findMany(usedFilters),
            prisma.user.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: user,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`UserService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = User | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let user = await prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                userLevel: true,
            },
        });

        if (!user) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: user,
        };
    } catch (err) {
        Logger.error(`UserService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = User | {};
export async function update(id: string, data: UserDTO): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let user = await prisma.user.findUnique({
            where: {
                id,
            },
        });

        if (!user) return INVALID_ID_SERVICE_RESPONSE;

        user = await prisma.user.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: user,
        };
    } catch (err) {
        Logger.error(`UserService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        idArray.forEach(async (id) => {
            await prisma.user.delete({
                where: {
                    id,
                },
            });
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`UserService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllMahasiswaResponse = PagedList<Mahasiswa[]> | {};
export async function getAllMahasiswa(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllMahasiswaResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [mahasiswa, totalData] = await Promise.all([
            prisma.mahasiswa.findMany(usedFilters),
            prisma.mahasiswa.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: mahasiswa,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`UserService.getAllMahasiswa : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdMahasiswaResponse = Mahasiswa | {};
export async function getByIdMahasiswa(id: string): Promise<ServiceResponse<GetByIdMahasiswaResponse>> {
    try {
        let mahasiswa = await prisma.mahasiswa.findUnique({
            where: {
                id,
            },
        });

        if (!mahasiswa) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: mahasiswa,
        };
    } catch (err) {
        Logger.error(`UserService.getByIdMahasiswa : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllDosenResponse = PagedList<Dosen[]> | {};
export async function getAllDosen(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllDosenResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [dosen, totalData] = await Promise.all([
            prisma.dosen.findMany(usedFilters),
            prisma.dosen.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: dosen,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`UserService.getAllDosen : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdDosenResponse = Dosen | {};
export async function getByIdDosen(id: string): Promise<ServiceResponse<GetByIdDosenResponse>> {
    try {
        let dosen = await prisma.dosen.findUnique({
            where: {
                id,
            },
        });

        if (!dosen) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: dosen,
        };
    } catch (err) {
        Logger.error(`UserService.getByIdDosen : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
