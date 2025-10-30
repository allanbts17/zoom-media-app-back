declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    RECALL_API_KEY: string;
    RECALL_BASE?: string;
    GCS_BUCKET: string;
    PUBLIC_PREFIX: string;
    GOOGLE_APPLICATION_CREDENTIALS?: string;
  }
}
