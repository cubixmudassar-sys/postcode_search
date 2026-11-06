export type AuthUser = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  use_case: string | null;
  is_staff: boolean;
};

export type AuthOrganisation = {
  id: number;
  name: string;
  credit_balance: string | number;
  monthly_spend: string | number;
  plan: string;
  is_active?: boolean;
  auto_topup_enabled: boolean;
  auto_topup_amount: string | number | null;
  auto_topup_cap: string | number | null;
  vat_number: string | null;
  billing_name: string | null;
  billing_phone?: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_expires: string | null;
  users_count?: number;
  owner_name?: string | null;
  owner_email?: string | null;
  users?: AdminCustomerUser[];
};

export type AdminCustomerUser = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
};

const TOKEN_KEY = "pp_token";
const USER_KEY = "pp_user";
const ORG_KEY = "pp_org";
const ENV_KEY = "pp_environment";
const QUERY_KEY = "pp_last_query";
const ADDRESS_QUERY_KEY = "pp_last_address_query";
const ADDRESS_POSTCODE_KEY = "pp_last_address_postcode";
const ADDRESS_FILTER_KEY = "pp_last_address_filter";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getOrganisation(): AuthOrganisation | null {
  const raw = localStorage.getItem(ORG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthOrganisation;
  } catch {
    return null;
  }
}

export function getWorkspaceEnvironment(): "Test" | "Live" {
  return localStorage.getItem(ENV_KEY) === "Live" ? "Live" : "Test";
}

export function setWorkspaceEnvironment(environment: "Test" | "Live") {
  localStorage.setItem(ENV_KEY, environment);
  notify();
}

export function setSession(token: string, user: AuthUser, organisation: AuthOrganisation | null) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (organisation) localStorage.setItem(ORG_KEY, JSON.stringify(organisation));
  else localStorage.removeItem(ORG_KEY);
  notify();
}

export function updateOrganisation(organisation: AuthOrganisation | null) {
  if (organisation) localStorage.setItem(ORG_KEY, JSON.stringify(organisation));
  else localStorage.removeItem(ORG_KEY);
  notify();
}

export function updateUser(user: AuthUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  notify();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
  notify();
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setLastPostcodeQuery(query: string) {
  sessionStorage.setItem(QUERY_KEY, query);
}

export function getLastPostcodeQuery() {
  return sessionStorage.getItem(QUERY_KEY) || "SW1A 2AA";
}

export function setLastAddressQuery(query: string) {
  sessionStorage.setItem(ADDRESS_QUERY_KEY, query);
}

export function getLastAddressQuery() {
  return sessionStorage.getItem(ADDRESS_QUERY_KEY) || "";
}

export function setLastAddressSearch(postcode: string, q = "") {
  sessionStorage.setItem(ADDRESS_POSTCODE_KEY, postcode);
  sessionStorage.setItem(ADDRESS_FILTER_KEY, q);
  sessionStorage.setItem(ADDRESS_QUERY_KEY, q || postcode);
}

export function getLastAddressPostcode() {
  return sessionStorage.getItem(ADDRESS_POSTCODE_KEY) || getLastPostcodeQuery();
}

export function getLastAddressFilter() {
  return sessionStorage.getItem(ADDRESS_FILTER_KEY) || "";
}

export function formatMoney(value: string | number | null | undefined, digits = 2) {
  const amount = Number(value ?? 0);
  return `£${amount.toFixed(digits)}`;
}

export function initials(user: AuthUser | null) {
  if (!user) return "PP";
  const first = (user.first_name || user.name || "?").charAt(0);
  const last = (user.last_name || user.name?.split(" ")[1] || "").charAt(0);
  return `${first}${last}`.toUpperCase() || "PP";
}
