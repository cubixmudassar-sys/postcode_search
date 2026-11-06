import { useNavigate } from "react-router-dom";

export type ContentPageKey =
  | "product"
  | "postcode-lookup"
  | "address-finder"
  | "api-access"
  | "bulk-processing"
  | "resources"
  | "help-centre"
  | "system-status"
  | "data-sources"
  | "changelog"
  | "company"
  | "about"
  | "contact"
  | "accessibility"
  | "privacy"
  | "cookies"
  | "terms"
  | "create-account";

export type View =
  | "home"
  | "postcode"
  | "address"
  | "pricing"
  | "developers"
  | "api-docs"
  | "signin"
  | "dashboard"
  | "admin"
  | "admin-login"
  | "content"
  | "register";

export type Page = View | ContentPageKey;

export const contentPageKeys: Exclude<ContentPageKey, "create-account">[] = [
  "product",
  "postcode-lookup",
  "address-finder",
  "api-access",
  "bulk-processing",
  "resources",
  "help-centre",
  "system-status",
  "data-sources",
  "changelog",
  "company",
  "about",
  "contact",
  "accessibility",
  "privacy",
  "cookies",
  "terms",
];

export const dashboardSections: Record<string, string> = {
  Overview: "overview",
  "Lookup explorer": "lookup-explorer",
  Projects: "projects",
  "API keys": "api-keys",
  "Usage & logs": "usage-logs",
  "Bulk jobs": "bulk-jobs",
  "Saved lists": "saved-lists",
  Billing: "billing",
  Team: "team",
  Support: "support",
  "API Docs": "api-docs",
  Settings: "settings",
};

export const adminSections: Record<string, string> = {
  Operations: "operations",
  Customers: "customers",
  "API operations": "api-operations",
  "Providers & datasets": "providers-datasets",
  Billing: "billing",
  Pricing: "pricing",
  "Abuse controls": "abuse-controls",
  Support: "support",
  Content: "content",
  "Audit log": "audit-log",
  "Staff settings": "staff-settings",
};

const dashboardSlugToLabel = Object.fromEntries(
  Object.entries(dashboardSections).map(([label, slug]) => [slug, label]),
) as Record<string, string>;

const adminSlugToLabel = Object.fromEntries(
  Object.entries(adminSections).map(([label, slug]) => [slug, label]),
) as Record<string, string>;

const pagePaths: Record<string, string> = {
  home: "/",
  postcode: "/postcode",
  address: "/address",
  pricing: "/pricing",
  developers: "/developers",
  "api-docs": "/api-docs",
  signin: "/signin",
  login: "/signin",
  register: "/register",
  "create-account": "/register",
  dashboard: "/dashboard/overview",
  admin: "/admin/operations",
  "admin-login": "/admin/login",
  content: "/resources",
};

for (const key of contentPageKeys) {
  pagePaths[key] = `/${key}`;
}

export function pathFor(page: Page | string): string {
  return pagePaths[page] || "/";
}

export function dashboardPath(label: string): string {
  const slug = dashboardSections[label] || "overview";
  return `/dashboard/${slug}`;
}

export function adminPath(label: string): string {
  const slug = adminSections[label] || "operations";
  return `/admin/${slug}`;
}

export function dashboardLabelFromPath(pathname: string): string {
  const slug = pathname.replace(/^\/dashboard\/?/, "").split("/")[0] || "overview";
  return dashboardSlugToLabel[slug] || "Overview";
}

export function adminLabelFromPath(pathname: string): string {
  const slug = pathname.replace(/^\/admin\/?/, "").split("/")[0] || "operations";
  if (slug === "login") return "Operations";
  return adminSlugToLabel[slug] || "Operations";
}

export function useAppNavigate() {
  const navigate = useNavigate();
  return (page: Page) => {
    navigate(pathFor(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
}
