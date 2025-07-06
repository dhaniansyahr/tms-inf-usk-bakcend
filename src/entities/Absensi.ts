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
  meetingId: string;
  isPresent: boolean;
  keterangan?: string;
}

export interface AbsentDTO {
  meetingId: string;
  userId: string;
  isPresent: boolean;
}

export interface UpdateAbsensiDTO {
  isPresent?: boolean;
  keterangan?: string;
}
