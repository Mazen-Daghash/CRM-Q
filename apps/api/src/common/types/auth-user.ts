import { UserRole } from '@qubix/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

