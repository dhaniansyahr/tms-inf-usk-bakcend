import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Jadwal } from "@prisma/client";
import { JadwalDTO } from "$entities/Jadwal";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { jadwalGeneticService } from "./JadwalGeneticService";

export type CreateResponse = Jadwal | {};
export async function create(data: JadwalDTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        const jadwal = await prisma.jadwal.create({
            data,
        });

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`JadwalService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Jadwal[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        usedFilters.include = {
            ruangan: true,
            shift: true,
            dosen: true,
            matakuliah: true,
        };

        const [jadwal, totalData] = await Promise.all([
            prisma.jadwal.findMany(usedFilters),
            prisma.jadwal.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: jadwal,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`JadwalService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Jadwal | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let jadwal = await prisma.jadwal.findUnique({
            where: {
                id,
            },
        });

        if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`JadwalService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Jadwal | {};
export async function update(id: string, data: JadwalDTO): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let jadwal = await prisma.jadwal.findUnique({
            where: {
                id,
            },
        });

        if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

        jadwal = await prisma.jadwal.update({
            where: {
                id,
            },
            data,
        });

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`JadwalService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        idArray.forEach(async (id) => {
            await prisma.jadwal.delete({
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
        Logger.error(`JadwalService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function generateScheduleWithGenetic(): Promise<ServiceResponse<Jadwal[]>> {
    try {
        // Generate schedules using genetic algorithm
        const schedules = await jadwalGeneticService.generateSchedule();

        // Convert schedules to Jadwal format and save to database
        const savedSchedules = await Promise.all(
            schedules.map(async (schedule) => {
                return prisma.jadwal.create({
                    data: {
                        id: schedule.id,
                        matakuliahId: schedule.matakuliahId,
                        ruanganId: schedule.ruanganId,
                        shiftId: schedule.shiftId,
                        dosenId: schedule.dosenId,
                        day: new Date().toISOString().split("T")[0], // You might want to adjust this
                    },
                });
            })
        );

        return {
            status: true,
            data: savedSchedules,
        };
    } catch (err) {
        Logger.error(`JadwalService.generateScheduleWithGenetic : ${err}`);
        return {
            status: false,
            err: { message: (err as Error).message, code: 500 },
            data: [],
        };
    }
}
