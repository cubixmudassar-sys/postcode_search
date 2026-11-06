import { apiRequest, type ApiData } from "./client";
import type { AdminCustomerUser, AuthOrganisation, AuthUser } from "./session";

export type PostcodeRecord = {
  postcode: string;
  outward: string;
  inward: string;
  area: string;
  post_town: string;
  country: string;
  region: string;
  admin_district: string;
  constituency: string;
  nhs_region: string;
  ceremonial_county: string;
  local_authority: string;
  latitude: number | string | null;
  longitude: number | string | null;
  eastings: number | string | null;
  northings: number | string | null;
  quality: string | null;
  status: string;
  source: string | null;
  record_updated: string | null;
  district?: string | null;
  county?: string | null;
  address_count?: number | null;
  coordinates?: {
    latitude: number | string | null;
    longitude: number | string | null;
    precision: string;
  };
};

export type AddressRecord = {
  id?: number;
  postcode: string;
  building: string;
  line1: string;
  locality: string | null;
  post_town: string;
  uprn: string | null;
  online_id?: string | null;
  type?: string | null;
  description?: string | null;
  full_address?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  precision: string | null;
};

export type AddressListMeta = {
  postcode?: string;
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  pagination_enabled?: boolean;
};

export type ApiSettings = {
  per_page: number;
  pagination_enabled: boolean;
};

export type ApiDataWithMeta<T> = ApiData<T> & { meta?: AddressListMeta };

export type UsageLogRecord = {
  id: number;
  postcode: string;
  location: string;
  project: string | null;
  endpoint: string;
  status: string;
  outcome: string;
  cost: number | string;
  latency_ms: number;
  request_id: string;
  environment: "Live" | "Test";
  created_at: string | null;
};

export type ProjectRecord = {
  id: number;
  name: string;
  environment: string;
  request_count: number;
};

export type ApiKeyRecord = {
  id: number;
  name: string;
  type: string;
  environment: string;
  key_prefix: string;
  project_id: number | null;
  project?: string | null;
  last_used_at: string | null;
  plain_key?: string;
};

export type SupportTicketRecord = {
  id: number;
  subject: string;
  body: string;
  status: string;
  user?: { id?: number; name?: string; email?: string } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TeamMemberRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
};

export type BulkJobRecord = {
  id: number;
  status: string;
  step: number;
  filename: string | null;
  mapped_column: string | null;
  row_count: number;
};

export type DashboardOverview = {
  greeting_name: string | null;
  credit_balance: string | number;
  monthly_spend: string | number;
  active_projects: number;
  success_rate: number;
  systems_status: string;
};

export type BillingSummary = {
  organisation: AuthOrganisation;
  summary: {
    available_balance: string | number;
    monthly_spend: string | number;
    plan: string;
    auto_topup_enabled: boolean;
    auto_topup_amount: string | number | null;
    auto_topup_cap: string | number | null;
    next_renewal: string;
  };
};

export type AdminOperationsOverview = {
  metrics: {
    request_volume: number;
    error_rate: number;
    p95_latency_ms: number;
    credit_liability: number | string;
  };
};

export type ProviderRecord = {
  id?: number;
  name: string;
  uptime_pct: number | string;
  latency_ms: number;
  status: string;
};

export type AuditRecord = {
  id?: number;
  action: string;
  meta?: Record<string, unknown> | null;
  user?: { name?: string } | null;
  organisation?: { name?: string } | null;
  created_at?: string | null;
};

export type PricingPackageRecord = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  currency: string;
  amount: string | number | null;
  amount_prefix: string | null;
  billing_period: string | null;
  custom_price_label: string | null;
  price_display: string;
  features: string[];
  cta_label: string;
  cta_target: "create-account" | "contact";
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  monthly_api_calls: number | null;
};

export type PricingPackagePayload = {
  name: string;
  slug: string;
  tagline?: string | null;
  currency: string;
  amount?: number | null;
  amount_prefix?: string | null;
  billing_period?: string | null;
  custom_price_label?: string | null;
  features?: string[];
  cta_label: string;
  cta_target: "create-account" | "contact";
  is_featured?: boolean;
  sort_order?: number;
  is_active?: boolean;
  monthly_api_calls?: number | null;
};

export type UsageSummary = {
  used: number;
  used_test: number;
  used_live: number;
  limit: number | null;
  remaining: number | null;
  plan: string;
  period: string;
};

type AuthPayload = {
  token: string;
  user: AuthUser;
  organisation: AuthOrganisation | null;
};

export const api = {
  login(email: string, password: string) {
    return apiRequest<ApiData<AuthPayload>>("/auth/login", {
      auth: false,
      body: { email, password },
    });
  },
  register(payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    use_case?: string;
    organisation_name: string;
    project_name: string;
  }) {
    return apiRequest<ApiData<AuthPayload>>("/auth/register", {
      auth: false,
      body: payload,
    });
  },
  logout() {
    return apiRequest<ApiData<{ message: string }>>("/auth/logout", { method: "POST" });
  },
  me() {
    return apiRequest<ApiData<{ user: AuthUser; organisation: AuthOrganisation | null }>>("/auth/me");
  },
  updateProfile(payload: {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    organisation_name?: string;
  }) {
    return apiRequest<ApiData<{ user: AuthUser; organisation: AuthOrganisation | null }>>("/auth/profile", {
      method: "PATCH",
      body: payload,
    });
  },
  lookupPostcode(postcode: string, options: { public?: boolean } = {}) {
    const prefix = options.public ? "/public" : "";
    return apiRequest<ApiData<PostcodeRecord>>(`${prefix}/postcodes/${encodeURIComponent(postcode)}`, {
      auth: options.public ? false : true,
    });
  },
  suggestPostcodes(q: string, options: { public?: boolean; signal?: AbortSignal } = {}) {
    const prefix = options.public ? "/public" : "";
    return apiRequest<ApiData<PostcodeRecord[]>>(`${prefix}/postcodes/suggest`, {
      auth: options.public ? false : true,
      query: { q },
      signal: options.signal,
    });
  },
  listPostcodeAddresses(postcode: string, page?: number, q?: string, options: { public?: boolean; signal?: AbortSignal } = {}) {
    const prefix = options.public ? "/public" : "";
    return apiRequest<ApiDataWithMeta<AddressRecord[]>>(`${prefix}/postcodes/${encodeURIComponent(postcode)}/addresses`, {
      auth: options.public ? false : true,
      query: { page, q },
      signal: options.signal,
    });
  },
  searchAddresses(params: { postcode: string; q?: string; page?: number }, options: { public?: boolean; signal?: AbortSignal } = {}) {
    const prefix = options.public ? "/public" : "";
    return apiRequest<ApiDataWithMeta<AddressRecord[]>>(`${prefix}/addresses`, {
      auth: options.public ? false : true,
      query: {
        postcode: params.postcode,
        q: params.q,
        page: params.page,
      },
      signal: options.signal,
    });
  },
  getAddress(id: number, options: { public?: boolean; signal?: AbortSignal } = {}) {
    const prefix = options.public ? "/public" : "";
    return apiRequest<ApiData<AddressRecord>>(`${prefix}/addresses/${id}`, {
      auth: options.public ? false : true,
      signal: options.signal,
    });
  },
  usageSummary() {
    return apiRequest<ApiData<UsageSummary>>("/usage-summary");
  },
  getApiSettings() {
    return apiRequest<ApiData<ApiSettings>>("/admin/api-settings");
  },
  updateApiSettings(payload: Partial<ApiSettings>) {
    return apiRequest<ApiData<ApiSettings>>("/admin/api-settings", {
      method: "PATCH",
      body: payload,
    });
  },
  dashboardOverview() {
    return apiRequest<ApiData<DashboardOverview>>("/dashboard/overview");
  },
  projects() {
    return apiRequest<ApiData<ProjectRecord[]>>("/projects");
  },
  createProject(name: string, environment: string) {
    return apiRequest<ApiData<ProjectRecord>>("/projects", {
      body: { name, environment },
    });
  },
  apiKeys() {
    return apiRequest<ApiData<ApiKeyRecord[]>>("/api-keys");
  },
  createApiKey(payload: { name: string; type: string; environment: string; project_id: number }) {
    return apiRequest<ApiData<ApiKeyRecord>>("/api-keys", { body: payload });
  },
  usageLogs(filters: { query?: string; environment?: string; billing?: string } = {}) {
    return apiRequest<ApiData<UsageLogRecord[]>>("/usage-logs", { query: filters });
  },
  billing() {
    return apiRequest<ApiData<BillingSummary>>("/billing");
  },
  updateBilling(payload: {
    plan?: string;
    name?: string;
    billing_name?: string | null;
    billing_phone?: string | null;
    vat_number?: string | null;
    auto_topup_enabled?: boolean;
    auto_topup_amount?: number | null;
    auto_topup_cap?: number | null;
  }) {
    return apiRequest<ApiData<BillingSummary>>("/billing", {
      method: "PATCH",
      body: payload,
    });
  },
  purchaseBillingPlan(packageId: number) {
    return apiRequest<ApiData<{
      redirect_method: "redirect" | "form_post";
      payment_url?: string;
      payment_action_url?: string;
      payment_checkout_url?: string;
      payment_fields?: Record<string, string | number>;
      transaction_id: string;
      amount: number;
      currency: string;
    }>>("/billing/purchase", {
      body: { package_id: packageId },
    });
  },
  team() {
    return apiRequest<ApiData<TeamMemberRecord[]>>("/team");
  },
  inviteTeamMember(payload: { name: string; email: string; role: string; password: string }) {
    return apiRequest<ApiData<TeamMemberRecord>>("/team", { body: payload });
  },
  supportTickets() {
    return apiRequest<ApiData<SupportTicketRecord[]>>("/support-tickets");
  },
  createSupportTicket(payload: { subject: string; body: string }) {
    return apiRequest<ApiData<SupportTicketRecord>>("/support-tickets", { body: payload });
  },
  savedLists() {
    return apiRequest<ApiData<unknown[]>>("/saved-lists");
  },
  savePostcode(postcode: string, label?: string, payload?: unknown) {
    return apiRequest<ApiData<unknown>>("/saved-lists/items", {
      body: { postcode, label, payload },
    });
  },
  createBulkJob(payload: { filename?: string; row_count?: number } = {}) {
    return apiRequest<ApiData<BulkJobRecord>>("/bulk-jobs", { body: payload });
  },
  updateBulkJob(id: number, payload: Partial<BulkJobRecord> & { step: number }) {
    return apiRequest<ApiData<BulkJobRecord>>(`/bulk-jobs/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  adminOperationsOverview() {
    return apiRequest<ApiData<AdminOperationsOverview>>("/admin/operations/overview");
  },
  adminProviders() {
    return apiRequest<ApiData<ProviderRecord[]>>("/admin/operations/providers");
  },
  adminAudits() {
    return apiRequest<ApiData<AuditRecord[]>>("/admin/operations/audits");
  },
  adminCustomers(filters: { query?: string; status?: string } = {}) {
    return apiRequest<ApiData<AuthOrganisation[]>>("/admin/customers", { query: filters });
  },
  adminCustomer(id: number) {
    return apiRequest<ApiData<AuthOrganisation>>(`/admin/customers/${id}`);
  },
  updateAdminCustomer(id: number, payload: Partial<{
    name: string;
    plan: string;
    billing_name: string | null;
    vat_number: string | null;
    credit_balance: number;
    monthly_spend: number;
    is_active: boolean;
    auto_topup_enabled: boolean;
    auto_topup_amount: number | null;
    auto_topup_cap: number | null;
  }>) {
    return apiRequest<ApiData<AuthOrganisation>>(`/admin/customers/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  updateAdminCustomerStatus(id: number, is_active: boolean) {
    return apiRequest<ApiData<AuthOrganisation>>(`/admin/customers/${id}/status`, {
      method: "PATCH",
      body: { is_active },
    });
  },
  adminCustomerUsers(id: number) {
    return apiRequest<ApiData<AdminCustomerUser[]>>(`/admin/customers/${id}/users`);
  },
  updateAdminCustomerUser(organisationId: number, userId: number, payload: {
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    is_active?: boolean;
    role?: string;
  }) {
    return apiRequest<ApiData<AdminCustomerUser>>(`/admin/customers/${organisationId}/users/${userId}`, {
      method: "PATCH",
      body: payload,
    });
  },
  adminList(path: string) {
    return apiRequest<ApiData<Record<string, unknown>[]>>(`/admin/${path}`);
  },
  pricingPackages() {
    return apiRequest<ApiData<PricingPackageRecord[]>>("/pricing-packages", { auth: false });
  },
  adminPricingPackages() {
    return apiRequest<ApiData<PricingPackageRecord[]>>("/admin/pricing-packages");
  },
  createPricingPackage(payload: PricingPackagePayload) {
    return apiRequest<ApiData<PricingPackageRecord>>("/admin/pricing-packages", { body: payload });
  },
  updatePricingPackage(id: number, payload: Partial<PricingPackagePayload>) {
    return apiRequest<ApiData<PricingPackageRecord>>(`/admin/pricing-packages/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deletePricingPackage(id: number) {
    return apiRequest<ApiData<{ message: string }>>(`/admin/pricing-packages/${id}`, {
      method: "DELETE",
    });
  },
};
