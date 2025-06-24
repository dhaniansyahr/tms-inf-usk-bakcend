import { ServiceResponse, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { SEMESTER, BIDANG_MINAT, ASISTEN_LAB_STATUS } from "@prisma/client";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";

// Chart data interfaces
interface ChartDataPoint {
        name: string;
        value: number;
        label?: string;
        fill?: string;
}

interface TimeSeriesDataPoint {
        date: string;
        value: number;
        name?: string;
}

interface MultiSeriesDataPoint {
        name: string;
        [key: string]: string | number;
}

interface RadarDataPoint {
        subject: string;
        A: number;
        B: number;
        fullMark: number;
}

export interface DashboardData {
        // Overview Cards
        totalStudents: number;
        totalDosen: number;
        totalCourses: number;
        totalSchedules: number;

        // Bar Charts
        studentsBySemester: ChartDataPoint[];
        coursesByBidangMinat: ChartDataPoint[];
        schedulesByDay: ChartDataPoint[];
        roomUtilization: ChartDataPoint[];
        dosenWorkload: ChartDataPoint[];

        // Pie Charts
        courseTypeDistribution: ChartDataPoint[];
        studentDistributionBySemester: ChartDataPoint[];
        bidangMinatDistribution: ChartDataPoint[];
        assistantApplicationStatus: ChartDataPoint[];

        // Line Charts
        monthlyEnrollmentTrend: TimeSeriesDataPoint[];
        assistantApplicationsTrend: TimeSeriesDataPoint[];

        // Area Charts
        weeklyScheduleDensity: MultiSeriesDataPoint[];

        // Radar Chart
        roomUtilizationRadar: RadarDataPoint[];

        // Treemap Data
        courseHierarchy: {
                name: string;
                children: {
                        name: string;
                        size: number;
                        fill?: string;
                }[];
        }[];
}

/**
 * Get comprehensive dashboard data for various chart types
 */
export async function getDashboardData(): Promise<ServiceResponse<{}>> {
        try {
                const currentSemester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;
                const currentYear = getCurrentAcademicYear();

                // Parallel data fetching for better performance
                const [
                        totalStudents,
                        totalDosen,
                        totalCourses,
                        totalSchedules,
                        studentsBySemester,
                        coursesByBidangMinat,
                        schedulesByDay,
                        roomUtilization,
                        dosenWithSchedules,
                        courseTypes,
                        assistantApplications,
                        enrollmentData,
                        allRooms,
                        allShifts,
                ] = await Promise.all([
                        // Overview counts
                        prisma.mahasiswa.count({ where: { isActive: true } }),
                        prisma.dosen.count(),
                        prisma.matakuliah.count(),
                        prisma.jadwal.count({
                                where: {
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                },
                        }),

                        // Students by semester
                        prisma.mahasiswa.groupBy({
                                by: ["semester"],
                                where: { isActive: true },
                                _count: { id: true },
                                orderBy: { semester: "asc" },
                        }),

                        // Courses by bidang minat
                        prisma.matakuliah.groupBy({
                                by: ["bidangMinat"],
                                _count: { id: true },
                        }),

                        // Schedules by day
                        prisma.jadwal.groupBy({
                                by: ["hari"],
                                where: {
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                },
                                _count: { id: true },
                        }),

                        // Room utilization
                        prisma.jadwal.groupBy({
                                by: ["ruanganId"],
                                where: {
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                },
                                _count: { id: true },
                                take: 10,
                                orderBy: {
                                        _count: {
                                                id: "desc",
                                        },
                                },
                        }),

                        // Dosen workload
                        prisma.jadwal.findMany({
                                where: {
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                },
                                include: {
                                        dosen: {
                                                select: { nama: true },
                                        },
                                },
                        }),

                        // Course types
                        prisma.matakuliah.groupBy({
                                by: ["type"],
                                _count: { id: true },
                        }),

                        // Assistant applications
                        prisma.pendaftaranAsistenLab.groupBy({
                                by: ["status"],
                                _count: { id: true },
                        }),

                        // Monthly enrollment data (last 6 months)
                        prisma.mahasiswa.findMany({
                                where: {
                                        isActive: true,
                                        createdAt: {
                                                gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
                                        },
                                },
                                select: { createdAt: true },
                        }),

                        // All rooms for utilization calculation
                        prisma.ruanganLaboratorium.findMany({
                                where: { isActive: true },
                                select: { id: true, nama: true },
                        }),

                        // All shifts for radar chart
                        prisma.shift.findMany({
                                where: { isActive: true },
                                select: { id: true, startTime: true, endTime: true },
                        }),
                ]);

                // Process data for charts
                const dashboardData: DashboardData = {
                        // Overview
                        totalStudents,
                        totalDosen,
                        totalCourses,
                        totalSchedules,

                        // Bar Charts
                        studentsBySemester: studentsBySemester.map((item) => ({
                                name: `Semester ${item.semester}`,
                                value: item._count.id,
                                fill: getColorForSemester(item.semester),
                        })),

                        coursesByBidangMinat: coursesByBidangMinat.map((item) => ({
                                name: item.bidangMinat,
                                value: item._count.id,
                                fill: getColorForBidangMinat(item.bidangMinat),
                        })),

                        schedulesByDay: schedulesByDay.map((item) => ({
                                name: item.hari,
                                value: item._count.id,
                                fill: getColorForDay(item.hari),
                        })),

                        roomUtilization: await Promise.all(
                                roomUtilization.map(async (item) => {
                                        const room = await prisma.ruanganLaboratorium.findUnique({
                                                where: { id: item.ruanganId },
                                                select: { nama: true },
                                        });
                                        return {
                                                name: room?.nama || "Unknown",
                                                value: item._count.id,
                                                fill: getColorForUtilization(item._count.id),
                                        };
                                })
                        ),

                        dosenWorkload: processDosenWorkload(dosenWithSchedules),

                        // Pie Charts
                        courseTypeDistribution: courseTypes.map((item) => ({
                                name: item.type,
                                value: item._count.id,
                                fill: item.type === "WAJIB" ? "#8884d8" : "#82ca9d",
                        })),

                        studentDistributionBySemester: studentsBySemester.map((item) => ({
                                name: `Semester ${item.semester}`,
                                value: item._count.id,
                                fill: getColorForSemester(item.semester),
                        })),

                        bidangMinatDistribution: coursesByBidangMinat.map((item) => ({
                                name: item.bidangMinat,
                                value: item._count.id,
                                fill: getColorForBidangMinat(item.bidangMinat),
                        })),

                        assistantApplicationStatus: assistantApplications.map((item) => ({
                                name: item.status,
                                value: item._count.id,
                                fill: getColorForStatus(item.status),
                        })),

                        // Line Charts
                        monthlyEnrollmentTrend: processMonthlyTrend(enrollmentData),
                        assistantApplicationsTrend: await getAssistantApplicationsTrend(),

                        // Area Charts
                        weeklyScheduleDensity: await getWeeklyScheduleDensity(),

                        // Radar Chart
                        roomUtilizationRadar: await getRoomUtilizationRadar(allRooms, allShifts),

                        // Treemap
                        courseHierarchy: await getCourseHierarchy(),
                };

                return {
                        status: true,
                        data: dashboardData,
                };
        } catch (err) {
                Logger.error(`DashboardService.getDashboardData : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get specific chart data by type
 */
export async function getChartData(chartType: string): Promise<ServiceResponse<any>> {
        try {
                switch (chartType) {
                        case "students-semester":
                                return await getStudentsBySemesterChart();
                        case "courses-bidang-minat":
                                return await getCoursesByBidangMinatChart();
                        case "schedule-utilization":
                                return await getScheduleUtilizationChart();
                        case "room-utilization":
                                return await getRoomUtilizationChart();
                        case "assistant-applications":
                                return await getAssistantApplicationsChart();
                        case "enrollment-trend":
                                return await getEnrollmentTrendChart();
                        default:
                                return {
                                        status: false,
                                        data: {},
                                        err: {
                                                message: "Chart type tidak valid",
                                                code: 400,
                                        },
                                };
                }
        } catch (err) {
                Logger.error(`DashboardService.getChartData : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

// Helper functions
function getColorForSemester(semester: number): string {
        const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1", "#d084d0", "#ffb347", "#87ceeb"];
        return colors[semester % colors.length];
}

function getColorForBidangMinat(bidangMinat: BIDANG_MINAT): string {
        const colorMap = {
                RPL: "#8884d8",
                DATA_MINING: "#82ca9d",
                JARINGAN: "#ffc658",
                GIS: "#ff7c7c",
                UMUM: "#8dd1e1",
        };
        return colorMap[bidangMinat] || "#cccccc";
}

function getColorForDay(day: string): string {
        const colorMap = {
                SENIN: "#8884d8",
                SELASA: "#82ca9d",
                RABU: "#ffc658",
                KAMIS: "#ff7c7c",
                JUMAT: "#8dd1e1",
                SABTU: "#d084d0",
        };
        return colorMap[day as keyof typeof colorMap] || "#cccccc";
}

function getColorForUtilization(count: number): string {
        if (count >= 15) return "#ff4444";
        if (count >= 10) return "#ffa500";
        if (count >= 5) return "#ffff00";
        return "#00ff00";
}

function getColorForStatus(status: ASISTEN_LAB_STATUS): string {
        const colorMap = {
                PENDING: "#ffc658",
                DISETUJUI: "#82ca9d",
                DITOLAK: "#ff7c7c",
        };
        return colorMap[status] || "#cccccc";
}

function processDosenWorkload(schedules: any[]): ChartDataPoint[] {
        const workloadMap = new Map();

        schedules.forEach((schedule) => {
                schedule.dosen.forEach((dosen: any) => {
                        const name = dosen.nama;
                        workloadMap.set(name, (workloadMap.get(name) || 0) + 1);
                });
        });

        return Array.from(workloadMap.entries())
                .map(([name, count]) => ({
                        name,
                        value: count,
                        fill: getColorForUtilization(count),
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
}

function processMonthlyTrend(enrollmentData: any[]): TimeSeriesDataPoint[] {
        const monthlyMap = new Map();

        enrollmentData.forEach((item) => {
                const date = new Date(item.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
        });

        return Array.from(monthlyMap.entries())
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date));
}

async function getAssistantApplicationsTrend(): Promise<TimeSeriesDataPoint[]> {
        const applications = await prisma.pendaftaranAsistenLab.findMany({
                where: {
                        createdAt: {
                                gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
                        },
                },
                select: { createdAt: true },
        });

        return processMonthlyTrend(applications);
}

async function getWeeklyScheduleDensity(): Promise<MultiSeriesDataPoint[]> {
        const schedules = await prisma.jadwal.findMany({
                where: {
                        semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                        tahun: getCurrentAcademicYear(),
                        deletedAt: null,
                },
                include: {
                        shift: {
                                select: { startTime: true },
                        },
                },
        });

        const dayMap = new Map();
        const days = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

        days.forEach((day) => {
                dayMap.set(day, { name: day, morning: 0, afternoon: 0, evening: 0 });
        });

        schedules.forEach((schedule) => {
                const hour = parseInt(schedule.shift.startTime.split(":")[0]);
                let timeSlot = "morning";

                if (hour >= 12 && hour < 17) timeSlot = "afternoon";
                else if (hour >= 17) timeSlot = "evening";

                const dayData = dayMap.get(schedule.hari);
                if (dayData) {
                        dayData[timeSlot]++;
                }
        });

        return Array.from(dayMap.values());
}

async function getRoomUtilizationRadar(rooms: any[], shifts: any[]): Promise<RadarDataPoint[]> {
        const currentSemester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;
        const currentYear = getCurrentAcademicYear();

        const roomData = await Promise.all(
                rooms.slice(0, 6).map(async (room) => {
                        const morningCount = await prisma.jadwal.count({
                                where: {
                                        ruanganId: room.id,
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                        shift: {
                                                startTime: {
                                                        lt: "12:00",
                                                },
                                        },
                                },
                        });

                        const afternoonCount = await prisma.jadwal.count({
                                where: {
                                        ruanganId: room.id,
                                        semester: currentSemester,
                                        tahun: currentYear,
                                        deletedAt: null,
                                        shift: {
                                                startTime: {
                                                        gte: "12:00",
                                                },
                                        },
                                },
                        });

                        return {
                                subject: room.nama,
                                A: morningCount,
                                B: afternoonCount,
                                fullMark: 20,
                        };
                })
        );

        return roomData;
}

async function getCourseHierarchy(): Promise<any[]> {
        const coursesByBidangMinat = await prisma.matakuliah.groupBy({
                by: ["bidangMinat", "type"],
                _count: { id: true },
        });

        const hierarchy = new Map();

        coursesByBidangMinat.forEach((item) => {
                const bidangMinat = item.bidangMinat;
                if (!hierarchy.has(bidangMinat)) {
                        hierarchy.set(bidangMinat, {
                                name: bidangMinat,
                                children: [],
                        });
                }

                hierarchy.get(bidangMinat).children.push({
                        name: item.type,
                        size: item._count.id,
                        fill: getColorForBidangMinat(bidangMinat),
                });
        });

        return Array.from(hierarchy.values());
}

// Individual chart data functions
async function getStudentsBySemesterChart(): Promise<ServiceResponse<ChartDataPoint[]>> {
        const data = await prisma.mahasiswa.groupBy({
                by: ["semester"],
                where: { isActive: true },
                _count: { id: true },
                orderBy: { semester: "asc" },
        });

        return {
                status: true,
                data: data.map((item) => ({
                        name: `Semester ${item.semester}`,
                        value: item._count.id,
                        fill: getColorForSemester(item.semester),
                })),
        };
}

async function getCoursesByBidangMinatChart(): Promise<ServiceResponse<ChartDataPoint[]>> {
        const data = await prisma.matakuliah.groupBy({
                by: ["bidangMinat"],
                _count: { id: true },
        });

        return {
                status: true,
                data: data.map((item) => ({
                        name: item.bidangMinat,
                        value: item._count.id,
                        fill: getColorForBidangMinat(item.bidangMinat),
                })),
        };
}

async function getScheduleUtilizationChart(): Promise<ServiceResponse<ChartDataPoint[]>> {
        const data = await prisma.jadwal.groupBy({
                by: ["hari"],
                where: {
                        semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                        tahun: getCurrentAcademicYear(),
                        deletedAt: null,
                },
                _count: { id: true },
        });

        return {
                status: true,
                data: data.map((item) => ({
                        name: item.hari,
                        value: item._count.id,
                        fill: getColorForDay(item.hari),
                })),
        };
}

async function getRoomUtilizationChart(): Promise<ServiceResponse<ChartDataPoint[]>> {
        const data = await prisma.jadwal.groupBy({
                by: ["ruanganId"],
                where: {
                        semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                        tahun: getCurrentAcademicYear(),
                        deletedAt: null,
                },
                _count: { id: true },
                take: 10,
                orderBy: {
                        _count: {
                                id: "desc",
                        },
                },
        });

        const chartData = await Promise.all(
                data.map(async (item) => {
                        const room = await prisma.ruanganLaboratorium.findUnique({
                                where: { id: item.ruanganId },
                                select: { nama: true },
                        });
                        return {
                                name: room?.nama || "Unknown",
                                value: item._count.id,
                                fill: getColorForUtilization(item._count.id),
                        };
                })
        );

        return {
                status: true,
                data: chartData,
        };
}

async function getAssistantApplicationsChart(): Promise<ServiceResponse<ChartDataPoint[]>> {
        const data = await prisma.pendaftaranAsistenLab.groupBy({
                by: ["status"],
                _count: { id: true },
        });

        return {
                status: true,
                data: data.map((item) => ({
                        name: item.status,
                        value: item._count.id,
                        fill: getColorForStatus(item.status),
                })),
        };
}

async function getEnrollmentTrendChart(): Promise<ServiceResponse<TimeSeriesDataPoint[]>> {
        const data = await prisma.mahasiswa.findMany({
                where: {
                        isActive: true,
                        createdAt: {
                                gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000),
                        },
                },
                select: { createdAt: true },
        });

        return {
                status: true,
                data: processMonthlyTrend(data),
        };
}
