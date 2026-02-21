// ─── Schema Types (specs/schemas/*.yaml) ────────────────────────────────────

export interface SchemaFieldConstraints {
  unique?: boolean;
  max_length?: number;
  min?: number;
  max?: number;
}

export interface SchemaField {
  name: string;
  type: string; // string | number | decimal | boolean | uuid | datetime | enum | json | text
  required?: boolean;
  description?: string;
  default?: unknown;
  format?: string;
  values?: string[];
  ref?: string;
  encrypted?: boolean;
  constraints?: SchemaFieldConstraints;
}

export interface SchemaRelationship {
  name: string;
  type: string; // has_many | has_one | belongs_to | many_to_many
  target: string;
  foreign_key: string;
  join_table?: string;
  target_key?: string;
}

export interface SchemaIndex {
  fields: string[];
  unique?: boolean;
  type?: string; // btree | hash | gin | gist
  description?: string;
}

export interface SchemaTransitionState {
  from: string;
  to: string[];
}

export interface SchemaTransition {
  field: string;
  states: SchemaTransitionState[];
  on_invalid: string; // reject | warn | log
}

export interface SchemaSeed {
  name: string;
  description?: string;
  strategy: string; // migration | fixture | script
  data?: Record<string, unknown>[];
  source?: string;
  count_estimate?: number;
}

export interface SchemaSpec {
  name: string;
  description?: string;
  inherits?: string;
  fields: SchemaField[];
  relationships?: SchemaRelationship[];
  indexes?: SchemaIndex[];
  transitions?: SchemaTransition;
  seed?: SchemaSeed[];
}

// ─── UI Page Types (specs/ui/*.yaml) ─────────────────────────────────────────

export interface ThemeConfig {
  color_scheme?: string; // light | dark | system
  primary_color?: string;
  font_family?: string;
  border_radius?: number;
}

export interface NavigationItem {
  page: string;
  icon?: string;
  label: string;
  badge?: string;
}

export interface NavigationConfig {
  type: string; // sidebar | topbar | tabs | drawer | none
  items: NavigationItem[];
}

export interface SharedComponent {
  id: string;
  description?: string;
  used_by?: string[];
  props?: string[];
}

export interface PageEntry {
  id: string;
  route: string;
  name: string;
  description?: string;
  layout?: string; // sidebar | full | centered | split | stacked
  auth_required?: boolean;
}

export interface PagesConfig {
  app_type?: string;
  framework?: string;
  router?: string;
  state_management?: string;
  component_library?: string;
  theme?: ThemeConfig;
  pages: PageEntry[];
  navigation?: NavigationConfig;
  shared_components?: SharedComponent[];
}

export interface EmptyState {
  message: string;
  description?: string;
  icon?: string;
  action?: { label: string; navigate?: string; flow?: string };
}

export interface PaginationConfig {
  type?: string; // cursor | offset | load-more
  page_size?: number;
}

export interface SectionButton {
  label: string;
  icon?: string;
  navigate?: string;
  flow?: string;
  variant?: string;
  args?: Record<string, unknown>;
  confirm?: boolean;
  confirm_message?: string;
}

export interface ItemAction {
  label: string;
  icon?: string;
  navigate?: string;
  flow?: string;
  args?: Record<string, unknown>;
  confirm?: boolean;
  confirm_message?: string;
  variant?: string;
}

export interface PageSection {
  id: string;
  component: string;
  position?: string;
  label?: string;
  data_source?: string;
  query?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  item_template?: Record<string, unknown>;
  item_actions?: ItemAction[];
  pagination?: PaginationConfig;
  buttons?: SectionButton[];
  empty_state?: EmptyState;
  visible_when?: string;
}

export interface FormSubmit {
  flow: string;
  args?: Record<string, unknown>;
  label: string;
  loading_label?: string;
  variant?: string;
  success?: { message: string; redirect?: string; action?: string };
  error?: { message: string; retry?: boolean };
}

export interface FormField {
  name: string;
  type: string; // text | number | select | multi-select | search-select | date | datetime | textarea | toggle | tag-input | file | color | slider
  label: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  options?: string[];
  options_source?: string;
  search_source?: string;
  display_field?: string;
  value_field?: string;
  validation?: string;
  visible_when?: string;
  allow_empty?: boolean;
  accept?: string;
  max_size_mb?: number;
  min?: number;
  max?: number;
  step?: number;
  autocomplete_source?: string;
  autocomplete_field?: string;
}

export interface FormSpec {
  id: string;
  label: string;
  description?: string;
  position?: string; // modal | sidebar | inline | drawer
  fields: FormField[];
  submit: FormSubmit;
  visible_when?: string;
  prefill_source?: string;
  prefill_args?: Record<string, unknown>;
}

export interface PageState {
  store?: string;
  initial_fetch?: string[];
  local?: Record<string, unknown>;
}

export interface UIPageSpec {
  page: string;
  route: string;
  sections?: PageSection[];
  forms?: FormSpec[];
  state?: PageState;
  loading?: string; // skeleton | spinner | blur
  error?: string; // retry-banner | error-page | toast
  refresh?: string; // pull-to-refresh | auto-{N}s | manual | none
}

// ─── Infrastructure Types (specs/infrastructure.yaml) ────────────────────────

export interface ServiceConfig {
  id: string;
  type: string; // server | datastore | worker | proxy
  runtime?: string;
  framework?: string;
  engine?: string;
  entry?: string;
  port?: number;
  health?: string;
  depends_on?: string[];
  dev_command?: string;
  setup?: string;
  env_file?: string;
  volumes?: string[];
  environment?: Record<string, string>;
  config?: string;
  management_port?: number;
}

export interface EnvironmentDeployment {
  strategy?: string; // process-manager | docker-compose | kubernetes | serverless | platform
  reverse_proxy?: string;
  ssl?: string;
  registry?: string;
  replicas?: Record<string, number>;
}

export interface DeploymentConfig {
  local?: EnvironmentDeployment;
  staging?: EnvironmentDeployment;
  production?: EnvironmentDeployment;
}

export interface InfrastructureSpec {
  services: ServiceConfig[];
  startup_order?: string[];
  deployment?: DeploymentConfig;
}
