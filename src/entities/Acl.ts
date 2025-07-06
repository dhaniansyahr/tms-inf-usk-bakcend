export interface AclDTO {
  roleName: string;
  permissions: {
    subject: string;
    action: string[];
  }[];
}
