export function generateRandomString(length: number): string {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let code = "";

        for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                code += characters[randomIndex];
        }

        return code;
}

export function isGanjilSemester(): boolean {
        const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed, add 1 to get the correct month number
        return currentMonth >= 1 && currentMonth <= 6; // January to June are considered ganjil semester
}

export function getCurrentAcademicYear(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // JavaScript months are 0-indexed

        // If it's after July, academic year is current year/next year
        // Otherwise it's previous year/current year
        if (month >= 7) {
                return `${year}/${year + 1}`;
        } else {
                return `${year - 1}/${year}`;
        }
}
