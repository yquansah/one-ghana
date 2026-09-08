export interface SaaSEnv {
  DB: D1Database;
  RESEARCH_BUCKET: R2Bucket;
  NOTIFICATION_QUEUE: Queue<{ outboxId: string }>;
  RESEARCH_WORKFLOW: Workflow<{ kind: 'hourly' | 'daily'; scheduledAt: string }>;
  ASSETS: Fetcher;
  ENVIRONMENT: 'staging' | 'production' | 'test';
  APP_ORIGIN: string;
  WORKOS_API_KEY?: string;
  WORKOS_CLIENT_ID?: string;
  SESSION_ENCRYPTION_KEY?: string;
  ADMIN_EMAILS?: string;
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  EMAIL_FROM?: string;
  UNSUBSCRIBE_SECRET?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  MONTHLY_BUDGET_USD?: string;
  FIXED_COST_RESERVE_USD?: string;
  RESEARCH_ENABLED?: string;
  EMAIL_ENABLED?: string;
}
