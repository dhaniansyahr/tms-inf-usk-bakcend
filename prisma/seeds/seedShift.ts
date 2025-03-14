import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedShift(prisma: PrismaClient) {
    const countShift = await prisma.shift.count();

    const data = [
        {
            id: ulid(),
            startTime: "08:00",
            endTime: "09:40",
            isActive: true,
        },
        {
            id: ulid(),
            startTime: "09:50",
            endTime: "11:30",
            isActive: true,
        },
        {
            id: ulid(),
            startTime: "12:00",
            endTime: "13:40",
            isActive: true,
        },
        {
            id: ulid(),
            startTime: "14:00",
            endTime: "15:40",
            isActive: true,
        },
        {
            id: ulid(),
            startTime: "16:00",
            endTime: "17:40",
            isActive: true,
        },
    ];

    if (countShift === 0) {
        await prisma.shift.createMany({
            data: data,
        });
    }
}
