export interface AbsensiDTO {
        id?: string;
        mahasiswaId: string;
        jadwalId: string;
        meetingId?: string;
        dosenId?: string;
        isPresent?: boolean;
        keterangan?: string;
        waktuAbsen?: Date;
}

export interface CreateAbsensiDTO {
        jadwalId: string;
        meetingId: string;
        isPresent: boolean;
        keterangan?: string;
}

export interface UpdateAbsensiDTO {
        isPresent?: boolean;
        keterangan?: string;
}

export interface AbsensiPerMeetingDTO {
        meetingId: string;
        attendanceList: {
                mahasiswaId: string;
                isPresent: boolean;
                keterangan?: string;
        }[];
}

export interface AbsensiSummaryDTO {
        jadwalId: string;
        totalMeetings: number;
        totalStudents: number;
        attendanceStats: {
                meetingId: string;
                pertemuan: number;
                tanggal: string;
                presentCount: number;
                absentCount: number;
                attendanceRate: number;
        }[];
}
