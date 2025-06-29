import { FilteringQueryV2, PagedList } from "$entities/Query";
import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Shift } from "@prisma/client";
import { ShiftDTO } from "$entities/Shift";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

export type CreateResponse = Shift | {};
export async function create(data: ShiftDTO): Promise<ServiceResponse<CreateResponse>> {
        try {
                const shift = await prisma.shift.create({
                        data,
                });

                return {
                        status: true,
                        data: shift,
                };
        } catch (err) {
                Logger.error(`ShiftService.create : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type GetAllResponse = PagedList<Shift[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                usedFilters.where.isActive = true;

                const [shift, totalData] = await Promise.all([
                        prisma.shift.findMany({
                                ...usedFilters,
                                orderBy: {
                                        startTime: "asc",
                                },
                        }),
                        prisma.shift.count({
                                where: usedFilters.where,
                        }),
                ]);

                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

                return {
                        status: true,
                        data: {
                                entries: shift,
                                totalData,
                                totalPage,
                        },
                };
        } catch (err) {
                Logger.error(`ShiftService.getAll : ${err} `);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type GetByIdResponse = Shift | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
        try {
                let shift = await prisma.shift.findUnique({
                        where: {
                                id,
                        },
                });

                if (!shift) return INVALID_ID_SERVICE_RESPONSE;

                return {
                        status: true,
                        data: shift,
                };
        } catch (err) {
                Logger.error(`ShiftService.getById : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type UpdateResponse = Shift | {};
export async function update(id: string, data: ShiftDTO): Promise<ServiceResponse<UpdateResponse>> {
        try {
                let shift = await prisma.shift.findUnique({
                        where: {
                                id,
                        },
                });

                if (!shift) return INVALID_ID_SERVICE_RESPONSE;

                shift = await prisma.shift.update({
                        where: {
                                id,
                        },
                        data,
                });

                return {
                        status: true,
                        data: shift,
                };
        } catch (err) {
                Logger.error(`ShiftService.update : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
        try {
                const idArray: string[] = JSON.parse(ids);

                idArray.forEach(async (id) => {
                        await prisma.shift.update({
                                where: {
                                        id,
                                },
                                data: {
                                        isActive: false,
                                },
                        });
                });

                return {
                        status: true,
                        data: {},
                };
        } catch (err) {
                Logger.error(`ShiftService.deleteByIds : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
