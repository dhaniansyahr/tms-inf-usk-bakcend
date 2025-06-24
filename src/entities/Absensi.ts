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

export interface MeetingAttendanceStatistics {
        total: number;
        present: number;
        absent: number;
        attendancePercentage: number;
}

export interface MeetingAttendanceResponse {
        meeting: {
                id: string;
                tanggal: string;
                pertemuan: number;
                jadwal: {
                        id: string;
                        hari: string;
                        semester: string;
                        tahun: string;
                        matakuliah: {
                                id: string;
                                nama: string;
                                kode: string;
                                sks: number;
                        };
                        shift: {
                                startTime: string;
                                endTime: string;
                        };
                        ruangan: {
                                nama: string;
                                lokasi: string;
                        };
                } | null;
        };
        attendance: {
                mahasiswa: {
                        id: string;
                        nama: string;
                        npm: string;
                        semester: number;
                        isPresent: boolean;
                        waktuAbsen: Date | null;
                        keterangan: string | null;
                        absensiId: string | null;
                        hasAbsensi: boolean;
                }[];
                dosen: {
                        id: string;
                        nama: string;
                        nip: string;
                        isPresent: boolean;
                        waktuAbsen: Date | null;
                        keterangan: string | null;
                        absensiId: string | null;
                        hasAbsensi: boolean;
                }[];
        };
        statistics: {
                mahasiswa: MeetingAttendanceStatistics;
                dosen: MeetingAttendanceStatistics;
                overall: {
                        totalParticipants: number;
                        totalPresent: number;
                        totalAbsent: number;
                        attendancePercentage: number;
                };
        };
        summary: {
                attendanceStatus: "BAIK" | "CUKUP" | "KURANG";
                meetingStatus: "BERLANGSUNG" | "TIDAK_ADA_PESERTA";
                lastUpdated: string;
        };
}
