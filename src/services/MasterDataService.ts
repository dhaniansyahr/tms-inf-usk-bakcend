import { prisma } from "$utils/prisma.utils";
import { FilteringQueryV2, PagedList } from "$entities/Query";
import { Dosen, Mahasiswa, Matakuliah } from "@prisma/client";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import Logger from "$pkg/logger";

export type GetAllMahasiswaResponse = PagedList<Mahasiswa[]> | {};
export async function getAllMahasiswa(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllMahasiswaResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [mahasiswa, totalData] = await Promise.all([
            prisma.mahasiswa.findMany(usedFilters),
            prisma.mahasiswa.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: mahasiswa,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`MasterDataService.getAllMahasiswa : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdMahasiswaResponse = Mahasiswa | {};
export async function getByIdMahasiswa(
    id: string
): Promise<ServiceResponse<GetByIdMahasiswaResponse>> {
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
        Logger.error(`MasterDataService.getByIdMahasiswa : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllDosenResponse = PagedList<Dosen[]> | {};
export async function getAllDosen(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllDosenResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [dosen, totalData] = await Promise.all([
            prisma.dosen.findMany(usedFilters),
            prisma.dosen.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: dosen,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`MasterDataService.getAllDosen : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdDosenResponse = Dosen | {};
export async function getByIdDosen(
    id: string
): Promise<ServiceResponse<GetByIdDosenResponse>> {
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
        Logger.error(`MasterDataService.getByIdDosen : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllMatakuliahResponse = PagedList<Matakuliah[]> | {};
export async function getAllMatakuliah(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllMatakuliahResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [matakuliah, totalData] = await Promise.all([
            prisma.matakuliah.findMany(usedFilters),
            prisma.matakuliah.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: matakuliah,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`MasterDataService.getAllMatakuliah : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdMatakuliahResponse = Matakuliah | {};
export async function getByIdMatakuliah(
    id: string
): Promise<ServiceResponse<GetByIdMatakuliahResponse>> {
    try {
        let matakuliah = await prisma.matakuliah.findUnique({
            where: {
                id,
            },
        });

        if (!matakuliah) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: matakuliah,
        };
    } catch (err) {
        Logger.error(`MasterDataService.getByIdMatakuliah : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
