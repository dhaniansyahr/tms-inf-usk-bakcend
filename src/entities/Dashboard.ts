export interface ChartDataPoint {
    name: string;
    value: number;
    label?: string;
    fill?: string;
}

export interface TimeSeriesDataPoint {
    date: string;
    value: number;
    name?: string;
}

export interface TodaySchedule {
    id: string;
    hari: string;
    kelas?: string;
    shift: {
        startTime: string;
        endTime: string;
    };
    ruangan: {
        nama: string;
        lokasi: string;
    };
    matakuliah: {
        nama: string;
        kode: string;
        sks: number;
    };
    jadwalDosen: {
        dosen: {
            nama: string;
            nip: string;
        };
    }[];
    meetings: {
        id: string;
        tanggal: Date;
        pertemuan: number;
        absensi: {
            id: string;
            mahasiswaId?: string;
            dosenId?: string;
            isPresent: boolean;
            waktuAbsen?: Date;
        }[];
    }[];
    hasAttendance: boolean;
    attendanceCount: number;
    totalStudents: number;
}

export interface AttendanceSchedule {
    id: string;
    hari: string;
    shift: {
        startTime: string;
        endTime: string;
    };
    ruangan: {
        nama: string;
    };
    matakuliah: {
        nama: string;
        kode: string;
    };
    meetings: {
        id: string;
        pertemuan: number;
        absensi: {
            mahasiswa?: {
                nama: string;
                npm: string;
            };
            dosen?: {
                nama: string;
            };
            isPresent: boolean;
            waktuAbsen?: Date;
        }[];
    }[];
}

export interface SummaryCards {
    totalStudents: number;
    totalDosen: number;
    totalCourses: number;
    totalActiveSchedules: number;
    todaySchedulesCount: number;
    pendingAssistantApplications: number;
}
