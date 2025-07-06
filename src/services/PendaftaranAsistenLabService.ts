import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import {
    ASISTEN_LAB_STATUS,
    Jadwal,
    PendaftaranAsistenLab,
    SEMESTER,
} from "@prisma/client";
import {
    PendaftaranAsistenLabDTO,
    PenerimaanAsistenLabDTO,
} from "$entities/PendaftaranAsistenLab";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { ulid } from "ulid";
import { isGanjilSemester } from "$utils/strings.utils";

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
export async function create(
    data: PendaftaranAsistenLabDTO
): Promise<ServiceResponse<CreateResponse>> {
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
        const existingRegistration =
            await prisma.pendaftaranAsistenLab.findFirst({
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
                    message:
                        "Pendaftaran sudah ada untuk mahasiswa dan jadwal ini",
                    code: 409,
                },
            };
        }

        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.create(
            {
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
            }
        );

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse =
    | PagedList<PendaftaranAsistenLabWithRelations[]>
    | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
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
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

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
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        const pendaftaranAsistenLab =
            await prisma.pendaftaranAsistenLab.findUnique({
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
export async function update(
    id: string,
    data: PendaftaranAsistenLabDTO
): Promise<ServiceResponse<UpdateResponse>> {
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

        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update(
            {
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
            }
        );

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
        const nonExistentIds = idArray.filter(
            (id) => !existingIds.includes(id)
        );

        if (nonExistentIds.length > 0) {
            return {
                status: false,
                data: {},
                err: {
                    message: `Data tidak ditemukan untuk ID: ${nonExistentIds.join(
                        ", "
                    )}`,
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

export type PenerimaanAsistenLabResponse =
    | PendaftaranAsistenLabWithRelations
    | {};
export async function penerimaanAsistenLab(
    id: string,
    data: PenerimaanAsistenLabDTO
): Promise<ServiceResponse<PenerimaanAsistenLabResponse>> {
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
                    message:
                        "Tidak dapat mengubah status pendaftaran yang sudah disetujui",
                    code: 400,
                },
            };
        }

        // Prepare update data based on status
        let updateData: {
            status: ASISTEN_LAB_STATUS;
            keterangan?: string | null;
        } = { status };

        if (status === ASISTEN_LAB_STATUS.DITOLAK) {
            if (!keterangan) {
                return {
                    status: false,
                    data: {},
                    err: {
                        message:
                            "Keterangan diperlukan saat menolak pendaftaran",
                        code: 400,
                    },
                };
            }
            updateData.keterangan = keterangan;
        } else if (status === ASISTEN_LAB_STATUS.DISETUJUI) {
            // Clear keterangan when approving
            updateData.keterangan = null;
        }

        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update(
            {
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
            }
        );

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(
            `PendaftaranAsistenLabService.penerimaanAsistenLab : ${err}`
        );
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function assignAsistenLab(
    id: string
): Promise<ServiceResponse<{}>> {
    try {
        // Find the pendaftaran record by ID
        const pendaftaran = await prisma.pendaftaranAsistenLab.findUnique({
            where: { id },
            include: {
                mahasiswa: {
                    select: {
                        id: true,
                        nama: true,
                        npm: true,
                        semester: true,
                        tahunMasuk: true,
                    },
                },
                jadwal: {
                    select: {
                        id: true,
                        semester: true,
                        tahun: true,
                        matakuliah: {
                            select: {
                                id: true,
                                nama: true,
                                kode: true,
                            },
                        },
                    },
                },
            },
        });

        if (!pendaftaran) return INVALID_ID_SERVICE_RESPONSE;

        // Check if the pendaftaran is approved
        if (pendaftaran.status !== ASISTEN_LAB_STATUS.DISETUJUI)
            return BadRequestWithMessage(
                "Pendaftaran harus disetujui terlebih dahulu sebelum dapat ditugaskan"
            );

        // Check if asisten lab already exists for this mahasiswa and jadwal
        const existingAsisten = await prisma.asistenLab.findFirst({
            where: {
                mahasiswaId: pendaftaran.mahasiswaId,
                jadwalId: pendaftaran.jadwalId,
                deletedAt: null,
            },
        });

        if (existingAsisten)
            return BadRequestWithMessage(
                "Mahasiswa sudah ditugaskan sebagai asisten lab untuk jadwal ini"
            );

        // Get ASISTEN_LABORATORIUM user level
        const asistenUserLevel = await prisma.userLevels.findFirst({
            where: {
                name: "ASISTEN_LABORATORIUM",
            },
        });

        if (!asistenUserLevel)
            return BadRequestWithMessage(
                "User level ASISTEN_LABORATORIUM tidak ditemukan"
            );

        // Create AsistenLab record
        const asistenLab = await prisma.asistenLab.create({
            data: {
                id: ulid(),
                mahasiswaId: pendaftaran.mahasiswaId,
                jadwalId: pendaftaran.jadwalId,
                semester: pendaftaran.jadwal.semester === "GANJIL" ? 1 : 2, // Convert to number
                tahun: pendaftaran.jadwal.tahun,
                userLevelId: asistenUserLevel.id,
            },
        });

        // Connect the asisten to the jadwal (many-to-many relationship)
        await prisma.jadwal.update({
            where: { id: pendaftaran.jadwalId },
            data: {
                asisten: {
                    connect: { id: asistenLab.id },
                },
            },
        });

        // Update mahasiswa to link with asisten lab
        await prisma.mahasiswa.update({
            where: { id: pendaftaran.mahasiswaId },
            data: {
                asistenLabId: asistenLab.id,
            },
        });

        const result = {
            asistenLab: {
                id: asistenLab.id,
                mahasiswaId: asistenLab.mahasiswaId,
                jadwalId: asistenLab.jadwalId,
                semester: asistenLab.semester,
                tahun: asistenLab.tahun,
                userLevelId: asistenLab.userLevelId,
                createdAt: asistenLab.createdAt,
                updatedAt: asistenLab.updatedAt,
            },
            mahasiswa: pendaftaran.mahasiswa,
            jadwal: pendaftaran.jadwal,
            message: `${pendaftaran.mahasiswa.nama} berhasil ditugaskan sebagai asisten lab untuk ${pendaftaran.jadwal.matakuliah.nama}`,
        };

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.assignAsistenLab : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAllAsistenLabByJadwalId(
    jadwalId: string
): Promise<ServiceResponse<{}>> {
    try {
        const asistenLab = await prisma.asistenLab.findMany({
            where: { jadwalId },
            include: {
                Mahasiswa: true,
            },
        });

        if (!asistenLab) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: asistenLab,
        };
    } catch (err) {
        Logger.error(
            `PendaftaranAsistenLabService.getAllAsistenLabByJadwalId : ${err}`
        );
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponseJadwal = PagedList<Jadwal[]> | {};
export async function getAllJadwal(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        // Build base include configuration
        const includeConfig = {
            ruangan: {
                select: {
                    nama: true,
                    lokasi: true,
                },
            },
            shift: {
                select: {
                    startTime: true,
                    endTime: true,
                },
            },
            dosen: {
                select: {
                    nama: true,
                    nip: true,
                },
            },
            matakuliah: {
                select: {
                    nama: true,
                    kode: true,
                    sks: true,
                },
            },
            mahasiswa: {
                select: {
                    id: true,
                    nama: true,
                    npm: true,
                    semester: true,
                },
            },
            asisten: {
                include: {
                    Mahasiswa: {
                        select: {
                            nama: true,
                            npm: true,
                        },
                    },
                },
            },
        };

        // Build base where conditions
        const baseWhere = {
            ...usedFilters.where,
            matakuliah: {
                nama: {
                    contains: "PRAKTIKUM",
                },
            },
            semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
        };

        // Build final query configuration
        const queryConfig = {
            ...usedFilters,
            include: includeConfig,
            where: baseWhere,
            orderBy: [
                { hari: "desc" as const },
                { shift: { startTime: "asc" as const } },
            ],
        };

        // Execute queries in parallel
        const [jadwal, totalData] = await Promise.all([
            prisma.jadwal.findMany(queryConfig),
            prisma.jadwal.count({
                where: baseWhere,
            }),
        ]);

        // Calculate pagination
        const totalPage = Math.ceil(totalData / usedFilters.take);

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
