import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { ASISTEN_LAB_STATUS, PendaftaranAsistenLab } from "@prisma/client";
import { PendaftaranAsistenLabDTO, PenerimaanAsistenLabDTO } from "$entities/PendaftaranAsistenLab";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

/**
 * TODO:
 * - [ ] Add Get All for Dosen based on Matakuliah yang diampu
 */

export type CreateResponse = PendaftaranAsistenLab | {};
export async function create(data: PendaftaranAsistenLabDTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.create({
            data,
        });

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<PendaftaranAsistenLab[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [pendaftaranAsistenLab, totalData] = await Promise.all([
            prisma.pendaftaranAsistenLab.findMany(usedFilters),
            prisma.pendaftaranAsistenLab.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: pendaftaranAsistenLab,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = PendaftaranAsistenLab | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.findUnique({
            where: {
                id,
            },
            include: {
                mahasiswa: true,
                matakuliah: true,
            },
        });

        if (!pendaftaranAsistenLab) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = PendaftaranAsistenLab | {};
export async function update(id: string, data: PendaftaranAsistenLabDTO): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.findUnique({
            where: {
                id,
            },
        });

        if (!pendaftaranAsistenLab) return INVALID_ID_SERVICE_RESPONSE;

        pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        idArray.forEach(async (id) => {
            await prisma.pendaftaranAsistenLab.delete({
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
        Logger.error(`PendaftaranAsistenLabService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type PenerimaanAsistenLabResponse = PendaftaranAsistenLab | {};
export async function penerimaanAsistenLab(
    id: string,
    data: PenerimaanAsistenLabDTO
): Promise<ServiceResponse<PenerimaanAsistenLabResponse>> {
    try {
        const { status, keterangan } = data;

        let pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.findUnique({
            where: {
                id,
            },
        });

        if (!pendaftaranAsistenLab) return INVALID_ID_SERVICE_RESPONSE;

        if (status === ASISTEN_LAB_STATUS.DISETUJUI) {
            pendaftaranAsistenLab.status = status;
        }

        if (status === ASISTEN_LAB_STATUS.DITOLAK && keterangan) {
            pendaftaranAsistenLab.status = status;
            pendaftaranAsistenLab.keterangan = keterangan;
        }

        pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.penerimaanAsistenLab : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
