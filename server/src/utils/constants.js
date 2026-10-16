export const ROLES = Object.freeze({
  ADMIN: 'admin', // Admin / HR
  TRAINER: 'trainer',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
});

export const ROLE_LIST = Object.values(ROLES);

export const ASSIGNMENT_STATUS = Object.freeze({
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
});

export const CERT_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  RENEWED: 'renewed',
});

export const COMPLIANCE_STATUS = Object.freeze({
  COMPLIANT: 'compliant',
  AT_RISK: 'at_risk',
  NON_COMPLIANT: 'non_compliant',
});
