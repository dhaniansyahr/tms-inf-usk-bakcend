import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { RuanganLaboratorium } from "@prisma/client";
import {
    AssignKepalaLabDTO,
    RuanganLaboratoriumDTO,
} from "$entities/RuanganLaboratorium";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { ulid } from "ulid";

export type CreateResponse = RuanganLaboratorium | {};
export async function create(
    data: RuanganLaboratoriumDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const ruanganLaboratorium = await prisma.ruanganLaboratorium.create({
            data,
        });

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<RuanganLaboratorium[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        usedFilters.where.isActive = true;
        usedFilters.where.isLab = true;

        const [ruanganLaboratorium, totalData] = await Promise.all([
            prisma.ruanganLaboratorium.findMany(usedFilters),
            prisma.ruanganLaboratorium.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: ruanganLaboratorium,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = RuanganLaboratorium | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let ruanganLaboratorium = await prisma.ruanganLaboratorium.findUnique({
            where: {
                id,
            },
            include: {
                historyKepalaLab: {
                    select: {
                        nama: true,
                        nip: true,
                    },
                },
                historyLabs: true,
            },
        });

        if (!ruanganLaboratorium) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = RuanganLaboratorium | {};
export async function update(
    id: string,
    data: RuanganLaboratoriumDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let ruanganLaboratorium = await prisma.ruanganLaboratorium.findUnique({
            where: {
                id,
            },
        });

        if (!ruanganLaboratorium) return INVALID_ID_SERVICE_RESPONSE;

        ruanganLaboratorium = await prisma.ruanganLaboratorium.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type AssignKepalaLabResponse = RuanganLaboratorium | {};
export async function assignKepalaLab(
    id: string,
    data: AssignKepalaLabDTO
): Promise<ServiceResponse<AssignKepalaLabResponse>> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // First create the history entry
            const historyKepalaLab = await tx.historyKepalaLab.create({
                data: {
                    id: ulid(),
                    nama: data.nama,
                    nip: data.nip,
                    ruanganLabId: id,
                },
            });

            // Then update the ruangan with the new kepala lab
            const ruanganLaboratorium = await tx.ruanganLaboratorium.update({
                where: { id },
                data: {
                    namaKepalaLab: data.nama,
                    nipKepalaLab: data.nip,
                    histroyKepalaLabId: historyKepalaLab.id,
                },
                include: {
                    historyKepalaLab: true,
                    historyLabs: {
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            if (!ruanganLaboratorium) {
                throw new Error("Invalid laboratory room ID");
            }

            return ruanganLaboratorium;
        });

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.assignKepalaLab : ${err}`);

        if (
            err instanceof Error &&
            err.message.includes("Record to update not found")
        ) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        await prisma.ruanganLaboratorium.updateMany({
            where: {
                id: { in: idArray },
            },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
