export interface AuditLog {
  id: string;

  action: string;
  entityType: string;
  entityId: string;
  userId: string;

  metadata?: Record<string, any> | null;

  createdAt: Date;
}
