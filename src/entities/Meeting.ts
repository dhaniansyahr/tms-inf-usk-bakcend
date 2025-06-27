export interface MeetingDTO {
        id?: string;
        jadwalId?: string;
        tanggal: string; // YYYY-MM-DD format
        pertemuan: number;
}

export interface UpdateMeetingDTO {
        tanggal?: string; // YYYY-MM-DD format
        pertemuan?: number;
}

export interface MeetingWithJadwalDTO {
        id: string;
        jadwalId: string | null;
        tanggal: string;
        pertemuan: number;
        createdAt: Date;
        updatedAt: Date;
        jadwal?: {
                id: string;
                hari: string;
                semester: string;
                tahun: string;
                matakuliah: {
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
}
