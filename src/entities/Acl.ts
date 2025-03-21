export interface AclDTO {
    userLevelId: string;
    permissions: {
        subject: string;
        action: string[];
    }[];
}
