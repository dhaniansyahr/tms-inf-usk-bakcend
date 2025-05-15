import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Mahasiswa } from "@prisma/client";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

export type GetAllResponse = PagedList<Mahasiswa[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
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
        Logger.error(`MahasiswaService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Mahasiswa | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
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
        Logger.error(`MahasiswaService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
