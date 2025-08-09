# Excel Template for Jadwal Matakuliah Teori

## Overview

This endpoint processes Excel files to create schedules (Jadwal) for theory courses (Matakuliah Teori) automatically.

## Endpoint

```
POST /jadwal/process-excel-teori
```

## Authentication

-   Requires JWT token
-   Requires "JADWAL" create permission

## Excel File Requirements

### File Format

-   `.xlsx` or `.xls` format
-   Maximum file size: 5MB
-   First sheet will be processed

### Required Columns

| Column Name       | Description                | Example                                             | Required |
| ----------------- | -------------------------- | --------------------------------------------------- | -------- |
| KODE              | Course code                | "SMPA001"                                           | ✅       |
| NAMA              | Course name                | "PROPOSAL PENELITIAN"                               | ✅       |
| KELAS             | Class identifier           | "E"                                                 | ✅       |
| KOORDINATOR_KELAS | Class coordinator with NIP | "Sri Azizah Nazhifah, S.Kom., M.ScNIP. 19930407..." | ✅       |
| RUANG             | Room name                  | "Lab DMIR"                                          | ✅       |
| HARI              | Day of week                | "Rabu"                                              | ✅       |
| WAKTU             | Time slot                  | "08.00-09.40"                                       | ✅       |

### Day Values (HARI)

Must be one of (both Indonesian and English formats are supported):

**Indonesian:**

-   Senin
-   Selasa
-   Rabu
-   Kamis
-   Jumat
-   Sabtu

**English:**

-   SENIN
-   SELASA
-   RABU
-   KAMIS
-   JUMAT
-   SABTU

### Validation Rules

1. **Matakuliah Validation**:

    - Course code must exist in database
    - Course must be marked as `isTeori: true`

2. **Dosen Validation**:

    - NIP will be extracted from KOORDINATOR_KELAS field
    - If NIP not found, system will try to find dosen by name and update their NIP
    - Dosen must exist in database (either by NIP or name)

3. **Ruangan Validation**:

    - Room name will be searched in database (partial match)
    - **If room doesn't exist, it will be automatically created** with:
        - Name: from Excel
        - Location: "Auto-generated from Excel"
        - Status: Active

4. **Shift Validation**:

    - Time format must match existing shifts in database

5. **Duplicate Prevention**:
    - Cannot create duplicate schedules for the same course in current semester

## Sample Excel Data

| KODE    | NAMA                         | KELAS | KOORDINATOR_KELAS                                 | RUANG          | HARI   | WAKTU       |
| ------- | ---------------------------- | ----- | ------------------------------------------------- | -------------- | ------ | ----------- |
| SMPA001 | PROPOSAL PENELITIAN          | E     | Sri Azizah Nazhifah, S.Kom., M.ScNIP. 19930407... | Lab DMIR       | Rabu   | 08.00-09.40 |
| SMPA002 | KULIAH KERJA PRAKTIK         | E     | Maulyanda, S.Tr.Kom., M.KomNIP. 19970824...       | Lab Komputer 1 | Senin  | 10.00-11.40 |
| SMPA003 | PRAKTIK PEMBELAJARAN SAINS A | E     | Imam Andhika, M.KomNIP. 19941114...               | Lab Komputer 2 | Selasa | 13.00-14.40 |

## Response Format

### Success Response

```json
{
    "content": {
        "totalRows": 3,
        "processedRows": 3,
        "successCount": 2,
        "errorCount": 1,
        "errors": [
            {
                "row": 3,
                "message": "Matakuliah with kode 'SMPA003' not found or is not TEORI",
                "data": {
                    "KODE": "SMPA003",
                    "NAMA": "PRAKTIK PEMBELAJARAN SAINS A",
                    "KELAS": "E",
                    "KOORDINATOR_KELAS": "Imam Andhika, M.KomNIP. 19941114...",
                    "RUANG": "Lab Komputer 2",
                    "HARI": "Selasa",
                    "WAKTU": "13.00-14.40"
                }
            }
        ],
        "createdSchedules": [
            {
                "matakuliahKode": "SMPA001",
                "matakuliahNama": "PROPOSAL PENELITIAN",
                "dosenNama": "Sri Azizah Nazhifah",
                "ruanganNama": "Lab DMIR",
                "shiftTime": "08:00-09:40",
                "hari": "RABU",
                "kelas": "E"
            },
            {
                "matakuliahKode": "SMPA002",
                "matakuliahNama": "KULIAH KERJA PRAKTIK",
                "dosenNama": "Maulyanda",
                "ruanganNama": "Lab Komputer 1",
                "shiftTime": "10:00-11:40",
                "hari": "SENIN",
                "kelas": "E"
            }
        ]
    },
    "message": "Excel processing completed successfully!",
    "errors": []
}
```

### Error Response

```json
{
    "content": null,
    "message": "Excel file is empty or has no valid data",
    "errors": []
}
```

## Error Handling

The system will:

1. Process each row individually
2. Continue processing even if some rows fail
3. Provide detailed error messages for each failed row
4. Return summary of successful and failed operations

## Common Error Messages

-   "Missing required fields" - One or more required columns are empty
-   "Matakuliah with kode 'XXX' not found or is not TEORI" - Course doesn't exist or isn't a theory course
-   "Could not extract NIP from Koordinator Kelas: 'XXX'" - NIP format is invalid
-   "Dosen with NIP 'XXX' or name 'YYY' not found" - Lecturer doesn't exist in database
-   "Failed to update NIP for dosen 'XXX'" - Error updating lecturer's NIP
-   "Failed to create ruangan 'XXX'" - Error creating new room
-   "Shift 'XXX' not found" - Time slot doesn't exist
-   "Invalid hari 'XXX'" - Day value is not valid
-   "Schedule already exists for matakuliah 'XXX'" - Duplicate schedule detected

## Notes

-   Only theory courses (`isTeori: true`) will be processed
-   NIP is automatically extracted from the KOORDINATOR_KELAS field using regex pattern
-   **If dosen NIP not found, system will search by name and update their NIP**
-   **If ruangan doesn't exist, it will be automatically created**
-   Schedules are created for the current semester and academic year
-   Each schedule will automatically generate 12 meeting sessions
-   The system uses the existing conflict detection logic
-   Time format should match your database shift format (e.g., "08.00-09.40")
