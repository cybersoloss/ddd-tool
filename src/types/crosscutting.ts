export interface ObservabilityConfig {
  logging?: { level?: 'debug' | 'info' | 'warn' | 'error'; include_input?: boolean; include_output?: boolean };
  metrics?: { enabled?: boolean; custom_counters?: string[] };
  tracing?: { enabled?: boolean; span_name?: string };
}

export interface SecurityConfig {
  authentication?: { required?: boolean; methods?: string[]; roles?: string[] };
  rate_limiting?: { enabled?: boolean; requests_per_minute?: number; key?: 'ip' | 'api_key' | 'user' | 'custom' };
  encryption?: { at_rest?: boolean; in_transit?: boolean; pii_fields?: string[] };
  audit?: { enabled?: boolean };
}
