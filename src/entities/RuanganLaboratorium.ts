export interface RuanganLaboratoriumDTO {
    id: string;
    nama: string;
    lokasi: string;
    namaKepalaLab: string;
    nipKepalaLab: string;
    histroyKepalaLabId: string;
    kapasitas: number;
}

export interface AssignKepalaLabDTO {
    id: string;
    nama: string;
    nip: string;
}
