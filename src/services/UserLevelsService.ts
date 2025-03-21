import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { UserLevels } from "@prisma/client";
import { UserLevelsDTO } from "$entities/UserLevels";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

export type CreateResponse = UserLevels | {};
export async function create(data: UserLevelsDTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        data.name = data.name.toUpperCase().replace(/ /g, "_");
        const userLevels = await prisma.userLevels.create({
            data,
        });

        return {
            status: true,
            data: userLevels,
        };
    } catch (err) {
        Logger.error(`UserLevelsService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<UserLevels[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [userLevels, totalData] = await Promise.all([
            prisma.userLevels.findMany(usedFilters),
            prisma.userLevels.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: userLevels,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`UserLevelsService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = UserLevels | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let userLevels = await prisma.userLevels.findUnique({
            where: {
                id,
            },
        });

        if (!userLevels) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: userLevels,
        };
    } catch (err) {
        Logger.error(`UserLevelsService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = UserLevels | {};
export async function update(id: string, data: UserLevelsDTO): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let userLevels = await prisma.userLevels.findUnique({
            where: {
                id,
            },
        });

        if (!userLevels) return INVALID_ID_SERVICE_RESPONSE;

        data.name = data.name.toUpperCase().replace(/ /g, "_");
        userLevels = await prisma.userLevels.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: userLevels,
        };
    } catch (err) {
        Logger.error(`UserLevelsService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        idArray.forEach(async (id) => {
            await prisma.userLevels.delete({
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
        Logger.error(`UserLevelsService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
