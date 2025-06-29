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

export interface AbsentDTO {
        jadwalId: string;
        meetingId: string;
        userId: string;
        isPresent: boolean;
}

export interface UpdateAbsensiDTO {
        isPresent?: boolean;
        keterangan?: string;
}
