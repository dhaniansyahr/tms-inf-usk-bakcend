import { FilteringQueryV2, PagedList } from "$entities/Query";
import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { ASISTEN_LAB_STATUS, PendaftaranAsistenLab } from "@prisma/client";
import { PendaftaranAsistenLabDTO, PenerimaanAsistenLabDTO } from "$entities/PendaftaranAsistenLab";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";

/**
 * TODO:
 * - [ ] Add Get All for Dosen based on Matakuliah yang diampu
 */

// Define extended types with relations
type PendaftaranAsistenLabWithRelations = PendaftaranAsistenLab & {
        mahasiswa: {
                id: string;
                nama: string;
                npm: string;
                semester: number;
                tahunMasuk: string;
                isActive: boolean;
        };
        jadwal: {
                id: string;
                hari: string;
                semester: string;
                tahun: string;
                matakuliah: {
                        id: string;
                        nama: string;
                        kode: string;
                        type: string;
                        sks: number;
                        bidangMinat: string;
                        semester: number;
                };
        };
};

export type CreateResponse = PendaftaranAsistenLab | {};
export async function create(data: PendaftaranAsistenLabDTO): Promise<ServiceResponse<CreateResponse>> {
        try {
                // Validate that mahasiswa and jadwal exist
                const [mahasiswaExists, jadwalExists] = await Promise.all([
                        prisma.mahasiswa.findUnique({
                                where: { id: data.mahasiswaId },
                                select: { id: true },
                        }),
                        prisma.jadwal.findUnique({
                                where: { id: data.jadwalId },
                                select: { id: true },
                        }),
                ]);

                if (!mahasiswaExists) {
                        return {
                                status: false,
                                data: {},
                                err: {
                                        message: "Mahasiswa tidak ditemukan",
                                        code: 404,
                                },
                        };
                }

                if (!jadwalExists) {
                        return {
                                status: false,
                                data: {},
                                err: {
                                        message: "Jadwal tidak ditemukan",
                                        code: 404,
                                },
                        };
                }

                // Check if registration already exists
                const existingRegistration = await prisma.pendaftaranAsistenLab.findFirst({
                        where: {
                                mahasiswaId: data.mahasiswaId,
                                jadwalId: data.jadwalId,
                        },
                });

                if (existingRegistration) {
                        return {
                                status: false,
                                data: {},
                                err: {
                                        message: "Pendaftaran sudah ada untuk mahasiswa dan jadwal ini",
                                        code: 409,
                                },
                        };
                }

                const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.create({
                        data,
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                                tahunMasuk: true,
                                                isActive: true,
                                        },
                                },
                                jadwal: {
                                        select: {
                                                id: true,
                                                hari: true,
                                                semester: true,
                                                tahun: true,
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                type: true,
                                                                sks: true,
                                                                bidangMinat: true,
                                                                semester: true,
                                                        },
                                                },
                                        },
                                },
                        },
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

export type GetAllResponse = PagedList<PendaftaranAsistenLabWithRelations[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                // Add include relations to the filters
                const includeRelations = {
                        mahasiswa: {
                                select: {
                                        id: true,
                                        nama: true,
                                        npm: true,
                                        semester: true,
                                        tahunMasuk: true,
                                        isActive: true,
                                },
                        },
                        jadwal: {
                                select: {
                                        id: true,
                                        hari: true,
                                        semester: true,
                                        tahun: true,
                                        matakuliah: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                        kode: true,
                                                        type: true,
                                                        sks: true,
                                                        bidangMinat: true,
                                                        semester: true,
                                                },
                                        },
                                },
                        },
                };

                const [pendaftaranAsistenLab, totalData] = await Promise.all([
                        prisma.pendaftaranAsistenLab.findMany({
                                ...usedFilters,
                                include: includeRelations,
                        }),
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

export type GetByIdResponse = PendaftaranAsistenLabWithRelations | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
        try {
                const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.findUnique({
                        where: {
                                id,
                        },
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                                tahunMasuk: true,
                                                isActive: true,
                                        },
                                },
                                jadwal: {
                                        select: {
                                                id: true,
                                                hari: true,
                                                semester: true,
                                                tahun: true,
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                type: true,
                                                                sks: true,
                                                                bidangMinat: true,
                                                                semester: true,
                                                        },
                                                },
                                        },
                                },
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

export type UpdateResponse = PendaftaranAsistenLabWithRelations | {};
export async function update(id: string, data: PendaftaranAsistenLabDTO): Promise<ServiceResponse<UpdateResponse>> {
        try {
                // Check if record exists
                const existingRecord = await prisma.pendaftaranAsistenLab.findUnique({
                        where: { id },
                        select: { id: true },
                });

                if (!existingRecord) return INVALID_ID_SERVICE_RESPONSE;

                // Validate mahasiswa and jadwal if they are being updated
                if (data.mahasiswaId || data.jadwalId) {
                        const validationPromises = [];

                        if (data.mahasiswaId) {
                                validationPromises.push(
                                        prisma.mahasiswa.findUnique({
                                                where: { id: data.mahasiswaId },
                                                select: { id: true },
                                        })
                                );
                        }

                        if (data.jadwalId) {
                                validationPromises.push(
                                        prisma.jadwal.findUnique({
                                                where: { id: data.jadwalId },
                                                select: { id: true },
                                        })
                                );
                        }

                        const validationResults = await Promise.all(validationPromises);

                        if (data.mahasiswaId && !validationResults[0]) {
                                return {
                                        status: false,
                                        data: {},
                                        err: {
                                                message: "Mahasiswa tidak ditemukan",
                                                code: 404,
                                        },
                                };
                        }

                        if (data.jadwalId && !validationResults[data.mahasiswaId ? 1 : 0]) {
                                return {
                                        status: false,
                                        data: {},
                                        err: {
                                                message: "Jadwal tidak ditemukan",
                                                code: 404,
                                        },
                                };
                        }
                }

                const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update({
                        where: { id },
                        data,
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                                tahunMasuk: true,
                                                isActive: true,
                                        },
                                },
                                jadwal: {
                                        select: {
                                                id: true,
                                                hari: true,
                                                semester: true,
                                                tahun: true,
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                type: true,
                                                                sks: true,
                                                                bidangMinat: true,
                                                                semester: true,
                                                        },
                                                },
                                        },
                                },
                        },
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

                // Validate all IDs exist before deleting
                const existingRecords = await prisma.pendaftaranAsistenLab.findMany({
                        where: {
                                id: {
                                        in: idArray,
                                },
                        },
                        select: { id: true },
                });

                const existingIds = existingRecords.map((record) => record.id);
                const nonExistentIds = idArray.filter((id) => !existingIds.includes(id));

                if (nonExistentIds.length > 0) {
                        return {
                                status: false,
                                data: {},
                                err: {
                                        message: `Data tidak ditemukan untuk ID: ${nonExistentIds.join(", ")}`,
                                        code: 404,
                                },
                        };
                }

                // Use deleteMany for better performance
                await prisma.pendaftaranAsistenLab.deleteMany({
                        where: {
                                id: {
                                        in: idArray,
                                },
                        },
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

export type PenerimaanAsistenLabResponse = PendaftaranAsistenLabWithRelations | {};
export async function penerimaanAsistenLab(id: string, data: PenerimaanAsistenLabDTO): Promise<ServiceResponse<PenerimaanAsistenLabResponse>> {
        try {
                const { status, keterangan } = data;

                // Check if record exists
                const existingRecord = await prisma.pendaftaranAsistenLab.findUnique({
                        where: { id },
                        select: { id: true, status: true },
                });

                if (!existingRecord) return INVALID_ID_SERVICE_RESPONSE;

                // Validate status transition
                if (existingRecord.status === ASISTEN_LAB_STATUS.DISETUJUI) {
                        return {
                                status: false,
                                data: {},
                                err: {
                                        message: "Tidak dapat mengubah status pendaftaran yang sudah disetujui",
                                        code: 400,
                                },
                        };
                }

                // Prepare update data based on status
                let updateData: { status: ASISTEN_LAB_STATUS; keterangan?: string | null } = { status };

                if (status === ASISTEN_LAB_STATUS.DITOLAK) {
                        if (!keterangan) {
                                return {
                                        status: false,
                                        data: {},
                                        err: {
                                                message: "Keterangan diperlukan saat menolak pendaftaran",
                                                code: 400,
                                        },
                                };
                        }
                        updateData.keterangan = keterangan;
                } else if (status === ASISTEN_LAB_STATUS.DISETUJUI) {
                        // Clear keterangan when approving
                        updateData.keterangan = null;
                }

                const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update({
                        where: { id },
                        data: updateData,
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                                tahunMasuk: true,
                                                isActive: true,
                                        },
                                },
                                jadwal: {
                                        select: {
                                                id: true,
                                                hari: true,
                                                semester: true,
                                                tahun: true,
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                type: true,
                                                                sks: true,
                                                                bidangMinat: true,
                                                                semester: true,
                                                        },
                                                },
                                        },
                                },
                        },
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

// Additional helper functions based on schema relationships

export type GetByMahasiswaIdResponse = PagedList<PendaftaranAsistenLabWithRelations[]> | {};
export async function getByMahasiswaId(mahasiswaId: string, filters: FilteringQueryV2): Promise<ServiceResponse<GetByMahasiswaIdResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2({
                        ...filters,
                        filters: {
                                ...filters.filters,
                                mahasiswaId: mahasiswaId,
                        },
                });

                const includeRelations = {
                        mahasiswa: {
                                select: {
                                        id: true,
                                        nama: true,
                                        npm: true,
                                        semester: true,
                                        tahunMasuk: true,
                                        isActive: true,
                                },
                        },
                        jadwal: {
                                select: {
                                        id: true,
                                        hari: true,
                                        semester: true,
                                        tahun: true,
                                        matakuliah: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                        kode: true,
                                                        type: true,
                                                        sks: true,
                                                        bidangMinat: true,
                                                        semester: true,
                                                },
                                        },
                                },
                        },
                };

                const [pendaftaranAsistenLab, totalData] = await Promise.all([
                        prisma.pendaftaranAsistenLab.findMany({
                                ...usedFilters,
                                include: includeRelations,
                        }),
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
                Logger.error(`PendaftaranAsistenLabService.getByMahasiswaId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type GetByJadwalIdResponse = PagedList<PendaftaranAsistenLabWithRelations[]> | {};
export async function getByJadwalId(jadwalId: string, filters: FilteringQueryV2): Promise<ServiceResponse<GetByJadwalIdResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2({
                        ...filters,
                        filters: {
                                ...filters.filters,
                                jadwalId: jadwalId,
                        },
                });

                const includeRelations = {
                        mahasiswa: {
                                select: {
                                        id: true,
                                        nama: true,
                                        npm: true,
                                        semester: true,
                                        tahunMasuk: true,
                                        isActive: true,
                                },
                        },
                        jadwal: {
                                select: {
                                        id: true,
                                        hari: true,
                                        semester: true,
                                        tahun: true,
                                        matakuliah: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                        kode: true,
                                                        type: true,
                                                        sks: true,
                                                        bidangMinat: true,
                                                        semester: true,
                                                },
                                        },
                                },
                        },
                };

                const [pendaftaranAsistenLab, totalData] = await Promise.all([
                        prisma.pendaftaranAsistenLab.findMany({
                                ...usedFilters,
                                include: includeRelations,
                        }),
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
                Logger.error(`PendaftaranAsistenLabService.getByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type GetByMatakuliahIdResponse = PagedList<PendaftaranAsistenLabWithRelations[]> | {};
export async function getByMatakuliahId(matakuliahId: string, filters: FilteringQueryV2): Promise<ServiceResponse<GetByMatakuliahIdResponse>> {
        try {
                // Since there's no direct matakuliahId in PendaftaranAsistenLab anymore,
                // we need to filter through jadwal relationship
                const jadwalIds = await prisma.jadwal.findMany({
                        where: { matakuliahId },
                        select: { id: true },
                });

                const jadwalIdArray = jadwalIds.map((jadwal) => jadwal.id);

                const usedFilters = buildFilterQueryLimitOffsetV2({
                        ...filters,
                        filters: {
                                ...filters.filters,
                                jadwalId: {
                                        in: jadwalIdArray,
                                },
                        },
                });

                const includeRelations = {
                        mahasiswa: {
                                select: {
                                        id: true,
                                        nama: true,
                                        npm: true,
                                        semester: true,
                                        tahunMasuk: true,
                                        isActive: true,
                                },
                        },
                        jadwal: {
                                select: {
                                        id: true,
                                        hari: true,
                                        semester: true,
                                        tahun: true,
                                        matakuliah: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                        kode: true,
                                                        type: true,
                                                        sks: true,
                                                        bidangMinat: true,
                                                        semester: true,
                                                },
                                        },
                                },
                        },
                };

                const [pendaftaranAsistenLab, totalData] = await Promise.all([
                        prisma.pendaftaranAsistenLab.findMany({
                                ...usedFilters,
                                include: includeRelations,
                        }),
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
                Logger.error(`PendaftaranAsistenLabService.getByMatakuliahId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
