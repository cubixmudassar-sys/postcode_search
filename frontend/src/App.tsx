import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, type AddressRecord, type PostcodeRecord, type PricingPackagePayload, type PricingPackageRecord, type ProjectRecord, type SupportTicketRecord, type UsageLogRecord, type UsageSummary } from "./api";
import { ApiError } from "./api/client";
import {
  clearSession,
  formatMoney,
  getLastAddressFilter,
  getLastAddressPostcode,
  getLastAddressQuery,
  getLastPostcodeQuery,
  getOrganisation,
  getToken,
  getUser,
  getWorkspaceEnvironment,
  initials,
  isAuthenticated,
  setLastAddressSearch,
  setLastPostcodeQuery,
  setSession,
  setWorkspaceEnvironment,
  subscribeSession,
  updateOrganisation,
  updateUser,
  type AdminCustomerUser,
  type AuthOrganisation,
  type AuthUser,
} from "./api/session";
import {
  adminLabelFromPath,
  adminPath,
  adminSections,
  contentPageKeys,
  dashboardLabelFromPath,
  dashboardPath,
  dashboardSections,
  pathFor,
  useAppNavigate,
  type ContentPageKey,
  type Page,
} from "./navigation";

function orgInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || "PP").toUpperCase();
}

function formatLogTime(createdAt: string | null) {
  if (!createdAt) return "—, —";
  const d = new Date(createdAt);
  const today = new Date();
  const dayLabel = d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString();
  return `${dayLabel}, ${d.toLocaleTimeString()}`;
}

function mapUsageLogRecord(record: UsageLogRecord): UsageLog {
  return {
    postcode: record.postcode,
    location: record.location,
    project: record.project || "—",
    endpoint: record.endpoint,
    status: record.status as UsageLog["status"],
    outcome: record.outcome,
    cost: Number(record.cost),
    time: formatLogTime(record.created_at),
    latency: `${record.latency_ms} ms`,
    requestId: record.request_id,
    environment: record.environment,
  };
}

function coordString(record: PostcodeRecord) {
  const lat = record.coordinates?.latitude ?? record.latitude;
  const lng = record.coordinates?.longitude ?? record.longitude;
  if (lat == null || lng == null) return "Not available";
  return `${lat}, ${lng}`;
}

type IconName =
  | "arrow"
  | "building"
  | "check"
  | "chevron"
  | "code"
  | "copy"
  | "database"
  | "download"
  | "external"
  | "eye"
  | "file"
  | "help"
  | "key"
  | "layers"
  | "location"
  | "lock"
  | "menu"
  | "more"
  | "people"
  | "plus"
  | "search"
  | "settings"
  | "shield"
  | "spark"
  | "trend"
  | "upload"
  | "wallet"
  | "x";

const iconPaths: Record<IconName, ReactNode> = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  building: <><path d="M4 21h16M6 21V5l6-2v18M12 8h6v13M8.5 8h1M8.5 12h1M8.5 16h1M15 11h1M15 15h1" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  code: <><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" /></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 1 1 3.1 2.4c-.8.3-.8.9-.8 1.6M12 17h.01" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M15 8l2 2M17 6l2 2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></>,
  spark: <path d="m12 2 1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9z" />,
  trend: <><path d="m3 17 6-6 4 4 7-8" /><path d="M15 7h5v5" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" /><path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", className = "", disabled = false }: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark"; icon?: IconName; onClick?: () => void; type?: "button" | "submit"; className?: string; disabled?: boolean;
}) {
  return <button className={`button button-${variant} ${className}`} onClick={onClick} type={type} disabled={disabled}>{children}{icon && <Icon name={icon} />}</button>;
}

function Logo({ onClick }: { onClick: () => void }) {
  return <button className="logo" onClick={onClick} aria-label="PostcodePulse home"><span className="logo-mark"><span /></span><strong>Postcode</strong>Pulse</button>;
}

function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "neutral" | "red" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const TRUSTSCORING_BLUE = "#245bff";
const TRUSTSCORING_COMPANY_ID = "postcode-pulse";
const TRUSTSCORING_PROFILE_URL = `https://trustscoring.com/company/${TRUSTSCORING_COMPANY_ID}`;
const TRUSTSCORING_JQUERY_SRC = "https://code.jquery.com/jquery-3.7.1.min.js";
const TRUSTSCORING_WIDGET_SRC = "https://trustscoring.com/js/trustscoring-widget.js";

function resolveTrustScoringApiBase() {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api/v1";
  if (/^https?:\/\//i.test(apiUrl)) {
    return `${new URL(apiUrl).origin}/trustscoring-api`;
  }
  return "/trustscoring-api";
}

const TRUSTSCORING_API_BASE = resolveTrustScoringApiBase();

type TrustReviewsInitOptions = {
  companyId: string;
  widgetType: string;
  theme: "light" | "dark";
  primaryColor: string;
  minRating: string;
  limit: number;
  autoUpdate: boolean;
  starColor: string;
  tagline: string;
  containerId: string;
  apiBaseUrl?: string;
};

declare global {
  interface Window {
    TrustReviews?: { init: (opts: TrustReviewsInitOptions) => void };
    jQuery?: unknown;
  }
}

let trustScoringScriptsPromise: Promise<void> | null = null;

function loadExternalScript(src: string, attrs?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true" || (src.includes("jquery") && window.jQuery) || (src.includes("trustscoring-widget") && window.TrustReviews)) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    }
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(script);
  });
}

function ensureTrustScoringScripts() {
  if (!trustScoringScriptsPromise) {
    trustScoringScriptsPromise = loadExternalScript(TRUSTSCORING_JQUERY_SRC, {
      integrity: "sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=",
      crossorigin: "anonymous",
    }).then(() => loadExternalScript(TRUSTSCORING_WIDGET_SRC, {
      "data-api-base": TRUSTSCORING_API_BASE,
    }));
  }
  return trustScoringScriptsPromise;
}

function TrustScoringWidget({ variant = "compact" }: { variant?: "compact" | "feature" | "footer" }) {
  const containerId = variant === "footer" ? "trustreviews-widget-footer" : "trustreviews-widget-header";

  useEffect(() => {
    if (variant === "feature") return;
    let cancelled = false;
    ensureTrustScoringScripts()
      .then(() => {
        if (cancelled || !window.TrustReviews?.init) return;
        window.TrustReviews.init({
          companyId: TRUSTSCORING_COMPANY_ID,
          widgetType: "trust-score-card",
          theme: variant === "footer" ? "dark" : "light",
          primaryColor: TRUSTSCORING_BLUE,
          minRating: "all",
          limit: 12,
          autoUpdate: true,
          starColor: TRUSTSCORING_BLUE,
          tagline: "",
          containerId,
          apiBaseUrl: TRUSTSCORING_API_BASE,
        });
      })
      .catch((error) => {
        if (!cancelled) console.error("[TrustScoring] failed to load widget:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [variant, containerId]);

  if (variant === "feature") {
    return <button className={`trustscoring-widget trustscoring-${variant}`} onClick={() => window.open(TRUSTSCORING_PROFILE_URL, "_blank", "noopener,noreferrer")} aria-label="Open TrustScoring profile in a new tab">
      <span className="trustscoring-mark"><Icon name="shield" size={24} /></span>
      <span className="trustscoring-copy"><strong>Trust<span>Scoring</span></strong><small>Widget preview · Live reviews ready to connect</small></span>
      <span className="trustscoring-state"><i /><span><strong>Not yet connected</strong><small>Add a verified company slug to display a live score</small></span></span>
      <Icon name="external" size={18} />
    </button>;
  }

  return <div className={`trustscoring-live trustscoring-live-${variant}`} id={containerId} aria-live="polite" />;
}

function Header({ navigate }: { navigate: (view: Page) => void }) {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  useEffect(() => subscribeSession(() => setAuthenticated(isAuthenticated())), []);
  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* clear local session anyway */
    } finally {
      clearSession();
      navigate("home");
    }
  };
  return <header className="site-header">
    <div className="header-inner">
      <Logo onClick={() => navigate("home")} />
      <button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(!open)}><Icon name={open ? "x" : "menu"} /></button>
      <nav className={open ? "nav-open" : ""} aria-label="Main navigation">
        <button onClick={() => navigate("product")}>Products <Icon name="chevron" size={14} /></button>
        <button onClick={() => navigate("developers")}>Developers</button>
        <button onClick={() => navigate("pricing")}>Pricing</button>
        <button onClick={() => navigate("resources")}>Resources <Icon name="chevron" size={14} /></button>
      </nav>
      <div className="header-actions">
        <TrustScoringWidget />
        {authenticated ? (
          <>
            <Button variant="ghost" onClick={() => navigate("dashboard")}>Dashboard</Button>
            <Button variant="secondary" onClick={() => void logout()}>Logout</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate("signin")}>Sign in</Button>
            <Button onClick={() => navigate("create-account")} icon="arrow">Get API access</Button>
          </>
        )}
      </div>
    </div>
  </header>;
}

function homeSuggestionSubtitle(item: PostcodeRecord) {
  const place = item.district || item.admin_district || item.local_authority || item.post_town;
  const region = item.county || item.ceremonial_county || item.region || item.post_town;
  return [place, region].filter(Boolean).join(" · ");
}

function SearchBox({ onPostcode, onAddress, compact = false }: { onPostcode: () => void; onAddress: () => void; compact?: boolean }) {
  const [mode, setMode] = useState<"postcode" | "address">("postcode");
  const [value, setValue] = useState(compact ? "SW1A 2AA" : "");
  const [addressPostcode, setAddressPostcode] = useState(compact ? "SW1A 2AA" : "");
  const [addressQuery, setAddressQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownMode, setDropdownMode] = useState<"suggest" | "addresses">("suggest");
  const [activeField, setActiveField] = useState<"postcode" | "address-postcode" | "address-query" | null>(null);
  const [suggestionList, setSuggestionList] = useState<PostcodeRecord[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressRecord[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPostcode, setSelectedPostcode] = useState("");
  const [addressInputEl, setAddressInputEl] = useState<HTMLInputElement | null>(null);

  const closeSuggestions = () => {
    setDropdownOpen(false);
    setDropdownMode("suggest");
    setSuggestionList([]);
    setAddressSuggestions([]);
    setSelectedPostcode("");
  };

  const resetToSuggestMode = () => {
    setDropdownMode("suggest");
    setAddressSuggestions([]);
    setSelectedPostcode("");
  };

  useEffect(() => {
    if (dropdownMode === "addresses") return;
    if (mode !== "postcode" || activeField !== "postcode") return;
    const compactValue = value.replace(/\s+/g, "");
    if (compactValue.length < 2) {
      setSuggestionList([]);
      return;
    }
    const controller = new AbortController();
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      api.suggestPostcodes(value, { public: true, signal: controller.signal })
        .then((res) => setSuggestionList(res.data))
        .catch((err) => {
          if (isAbortError(err)) return;
          setSuggestionList([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionsLoading(false);
        });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, mode, activeField, dropdownMode]);

  useEffect(() => {
    if (dropdownMode === "addresses") return;
    if (mode !== "address" || activeField !== "address-postcode") return;
    const compactValue = addressPostcode.replace(/\s+/g, "");
    if (compactValue.length < 2) {
      setSuggestionList([]);
      return;
    }
    const controller = new AbortController();
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      api.suggestPostcodes(addressPostcode, { public: true, signal: controller.signal })
        .then((res) => setSuggestionList(res.data))
        .catch((err) => {
          if (isAbortError(err)) return;
          setSuggestionList([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionsLoading(false);
        });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressPostcode, mode, activeField, dropdownMode]);

  useEffect(() => {
    if (mode !== "address" || activeField !== "address-query") return;
    if (dropdownMode === "addresses") return;
    const query = addressQuery.trim();
    const postcode = addressPostcode.trim();
    if (!postcode) {
      setAddressSuggestions([]);
      return;
    }
    if (query.length < 2) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      api.searchAddresses({ postcode, q: query, page: 1 }, { public: true, signal: controller.signal })
        .then((res) => setAddressSuggestions(res.data))
        .catch((err) => {
          if (isAbortError(err)) return;
          setAddressSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionsLoading(false);
        });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressQuery, addressPostcode, mode, activeField, dropdownMode]);

  const loadAddressesForPostcode = async (postcode: string, source: "postcode-tab" | "address-tab") => {
    const query = postcode.trim();
    if (!query) return;
    setSuggestionList([]);
    setAddressSuggestions([]);
    setSuggestionsLoading(true);
    setSelectedPostcode(query);
    setDropdownMode("addresses");
    setDropdownOpen(true);

    if (source === "postcode-tab") {
      setValue(query);
      setActiveField("postcode");
    } else {
      setAddressPostcode(query);
      setActiveField("address-query");
      window.setTimeout(() => addressInputEl?.focus(), 0);
    }

    try {
      const res = source === "address-tab"
        ? await api.searchAddresses({ postcode: query, page: 1 }, { public: true })
        : await api.listPostcodeAddresses(query, 1, undefined, { public: true });
      setAddressSuggestions(res.data);
    } catch {
      setAddressSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fillAddressSelection = (address: AddressRecord) => {
    const label = address.building || address.line1 || address.full_address || address.description || "";
    const postcode = (address.postcode || selectedPostcode || addressPostcode || value).trim();
    if (postcode) setAddressPostcode(postcode);
    setAddressQuery(label);
    setDropdownOpen(false);
    setDropdownMode("suggest");
    setSuggestionList([]);
    setAddressSuggestions([]);
  };

  const showPostcodeLookupDropdown = dropdownOpen
    && mode === "postcode"
    && activeField === "postcode"
    && (dropdownMode === "addresses" || value.replace(/\s+/g, "").length >= 2);

  const showAddressTabPostcodeSuggestions = dropdownOpen
    && mode === "address"
    && activeField === "address-postcode"
    && dropdownMode !== "addresses"
    && addressPostcode.replace(/\s+/g, "").length >= 2;

  const showAddressTabAddressDropdown = dropdownOpen
    && mode === "address"
    && activeField === "address-query"
    && (
      dropdownMode === "addresses"
      || addressQuery.trim().length >= 2
      || !addressPostcode.trim()
    );

  const suggestionsOpen = showPostcodeLookupDropdown || showAddressTabPostcodeSuggestions || showAddressTabAddressDropdown;

  const runPostcodeSearch = async (postcode: string) => {
    const query = postcode.trim();
    if (!query) return;
    setLoading(true);
    closeSuggestions();
    try {
      setValue(query);
      setLastPostcodeQuery(query);
      setLastAddressSearch(query, "");
      await api.lookupPostcode(query, { public: true });
      onPostcode();
    } catch {
      /* keep on page when lookup fails */
    } finally {
      setLoading(false);
    }
  };

  const runAddressSearch = (postcode: string, query: string) => {
    const nextPostcode = postcode.trim();
    if (!nextPostcode) return;
    closeSuggestions();
    setAddressPostcode(nextPostcode);
    setAddressQuery(query.trim());
    setValue(nextPostcode);
    setLastPostcodeQuery(nextPostcode);
    setLastAddressSearch(nextPostcode, query.trim());
    onAddress();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "postcode") {
      await runPostcodeSearch(value);
      return;
    }
    setLoading(true);
    try {
      runAddressSearch(addressPostcode, addressQuery);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "postcode" | "address") => {
    setMode(next);
    closeSuggestions();
    setActiveField(null);
  };

  const addressListMarkup = (listId: string, title: string) => (
    <div className="postcode-suggestions" id={listId} role="listbox">
      <div className="postcode-suggestion-label">
        <span>{title}</span>
        <small>{suggestionsLoading ? "Loading…" : `${addressSuggestions.length} matches`}</small>
      </div>
      {addressSuggestions.map((address, index) => (
        <button
          type="button"
          role="option"
          aria-selected={false}
          key={address.id ?? `${address.line1}-${index}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (mode === "address") {
              fillAddressSelection(address);
              return;
            }
            const label = address.building || address.line1 || address.full_address || address.description || "";
            runAddressSearch(address.postcode || selectedPostcode || value, label);
          }}
        >
          <span className="suggestion-location">
            <i><Icon name="building" size={16} /></i>
            <span>
              <strong>{address.building || address.line1}</strong>
              <small>{address.description || address.full_address || address.postcode}</small>
            </span>
          </span>
          {index === 0 && <Badge tone="blue">Best match</Badge>}
          <Icon name="chevron" size={18} />
        </button>
      ))}
      {!suggestionsLoading && addressSuggestions.length === 0 && (
        <div className="empty-table">
          <Icon name="search" />
          <strong>{addressPostcode.trim() || selectedPostcode || value ? "No addresses found" : "Enter a postcode to see matching addresses"}</strong>
          <span>{addressPostcode.trim() || selectedPostcode || value ? "Try another postcode or address filter." : "Add a UK postcode first, then type or pick an address."}</span>
        </div>
      )}
      <div className="postcode-suggestion-footer">
        <span className="suggestion-brand"><span className="logo-mark"><span /></span><strong>Postcode</strong>Pulse</span>
        <span>Address intelligence by PostcodePulse</span>
      </div>
    </div>
  );

  const postcodeSuggestionList = (
    <div className="postcode-suggestions" id="home-postcode-suggestions" role="listbox">
      <div className="postcode-suggestion-label">
        <span>Suggested postcodes</span>
        <small>{suggestionsLoading ? "Searching…" : `${suggestionList.length} matches`}</small>
      </div>
      {suggestionList.map((item, index) => (
        <button
          type="button"
          role="option"
          aria-selected={false}
          key={item.postcode}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void loadAddressesForPostcode(item.postcode, mode === "postcode" ? "postcode-tab" : "address-tab")}
        >
          <span className="suggestion-location">
            <i><Icon name="location" size={16} /></i>
            <span>
              <strong>{item.postcode}</strong>
              <small>{homeSuggestionSubtitle(item)}{item.address_count != null ? ` · ${item.address_count} addresses` : ""}</small>
            </span>
          </span>
          {index === 0 && <Badge tone="blue">Best match</Badge>}
          <Icon name="chevron" size={18} />
        </button>
      ))}
      {!suggestionsLoading && suggestionList.length === 0 && (
        <div className="empty-table"><Icon name="search" /><strong>No matching postcodes</strong><span>Keep typing a UK postcode prefix.</span></div>
      )}
      <div className="postcode-suggestion-footer">
        <span className="suggestion-brand"><span className="logo-mark"><span /></span><strong>Postcode</strong>Pulse</span>
        <span>Address intelligence by PostcodePulse</span>
      </div>
    </div>
  );

  const postcodeLookupDropdown = dropdownMode === "addresses"
    ? addressListMarkup("home-postcode-suggestions", `Addresses for ${selectedPostcode || value}`)
    : postcodeSuggestionList;

  const addressTabAddressDropdown = (() => {
    if (!addressPostcode.trim() && addressQuery.trim().length >= 2) {
      return addressListMarkup("home-address-suggestions", "Suggested addresses");
    }
    if (dropdownMode === "addresses") {
      return addressListMarkup("home-address-suggestions", `Addresses for ${selectedPostcode || addressPostcode}`);
    }
    if (addressQuery.trim().length >= 2 && addressPostcode.trim()) {
      return addressListMarkup("home-address-suggestions", "Suggested addresses");
    }
    if (!addressPostcode.trim()) {
      return addressListMarkup("home-address-suggestions", "Suggested addresses");
    }
    return null;
  })();

  return <div className={`search-card ${compact ? "search-compact" : ""} ${suggestionsOpen ? "suggestions-open" : ""}`}>
    <div className="search-tabs" role="tablist" aria-label="Search type">
      <button role="tab" aria-selected={mode === "postcode"} onClick={() => switchMode("postcode")}><Icon name="location" />Postcode lookup</button>
      <button role="tab" aria-selected={mode === "address"} onClick={() => switchMode("address")}><Icon name="building" />Find an address</button>
    </div>
    <form className={`search-form ${mode === "address" ? "search-form-address" : ""} ${suggestionsOpen ? "suggestions-visible" : ""}`} onSubmit={(event) => void submit(event)}>
      {mode === "postcode" ? (
        <label>
          <span>UK postcode</span>
          <div className="input-wrap">
            <Icon name="search" />
            <input
              value={value}
              onFocus={() => { setActiveField("postcode"); setDropdownOpen(true); }}
              onChange={(e) => {
                setValue(e.target.value.toUpperCase());
                setActiveField("postcode");
                setDropdownOpen(true);
                resetToSuggestMode();
              }}
              onKeyDown={(event) => { if (event.key === "Escape") closeSuggestions(); }}
              placeholder="Enter a UK postcode"
              aria-describedby="search-hint"
              autoComplete="off"
              aria-expanded={showPostcodeLookupDropdown}
              aria-controls="home-postcode-suggestions"
            />
            {value && <button type="button" className="clear-input" aria-label="Clear search" onClick={() => { setValue(""); closeSuggestions(); }}><Icon name="x" size={16} /></button>}
          </div>
          {showPostcodeLookupDropdown && postcodeLookupDropdown}
        </label>
      ) : (
        <>
          <label>
            <span>UK postcode</span>
            <div className="input-wrap">
              <Icon name="location" />
              <input
                value={addressPostcode}
                onFocus={() => {
                  setActiveField("address-postcode");
                  setDropdownOpen(true);
                  if (dropdownMode === "addresses") resetToSuggestMode();
                }}
                onChange={(e) => {
                  setAddressPostcode(e.target.value.toUpperCase());
                  setActiveField("address-postcode");
                  setDropdownOpen(true);
                  resetToSuggestMode();
                }}
                onKeyDown={(event) => { if (event.key === "Escape") closeSuggestions(); }}
                placeholder="e.g. AL10 9WP"
                required
                autoComplete="off"
                aria-expanded={showAddressTabPostcodeSuggestions}
                aria-controls="home-postcode-suggestions"
              />
              {addressPostcode && <button type="button" className="clear-input" aria-label="Clear postcode" onClick={() => { setAddressPostcode(""); closeSuggestions(); }}><Icon name="x" size={16} /></button>}
            </div>
            {showAddressTabPostcodeSuggestions && postcodeSuggestionList}
          </label>
          <label>
            <span>Address</span>
            <div className="input-wrap">
              <Icon name="building" />
              <input
                ref={setAddressInputEl}
                value={addressQuery}
                onFocus={() => {
                  setActiveField("address-query");
                  setDropdownOpen(true);
                }}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  setActiveField("address-query");
                  setDropdownOpen(true);
                  if (dropdownMode === "addresses") {
                    setDropdownMode("suggest");
                    setSelectedPostcode(addressPostcode.trim());
                  }
                }}
                onKeyDown={(event) => { if (event.key === "Escape") closeSuggestions(); }}
                placeholder="Start typing an address (optional)"
                aria-describedby="search-hint"
                autoComplete="off"
                aria-expanded={showAddressTabAddressDropdown}
                aria-controls="home-address-suggestions"
              />
              {addressQuery && <button type="button" className="clear-input" aria-label="Clear address" onClick={() => { setAddressQuery(""); if (dropdownMode !== "addresses") closeSuggestions(); else setAddressSuggestions([]); }}><Icon name="x" size={16} /></button>}
            </div>
            {showAddressTabAddressDropdown && addressTabAddressDropdown}
          </label>
        </>
      )}
      <Button type="submit" icon={loading ? undefined : "arrow"} className={loading ? "loading" : ""}>{loading ? "Searching…" : "Search"}</Button>
    </form>
    {!compact && <div className="search-meta" id="search-hint">
      <span>Try an example: <button type="button" onClick={() => { setValue("SW1A 2AA"); setAddressPostcode("SW1A 2AA"); setAddressQuery(""); closeSuggestions(); }}>{mode === "postcode" ? "SW1A 2AA" : "SW1A 2AA"}</button></span>
      <button type="button"><Icon name="location" size={16} /> Use my location</button>
    </div>}
  </div>;
}

function HeroArt() {
  return <div className="hero-art premium-hero-art" aria-label="Animated three-dimensional postcode intelligence scene">
    <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
    <div className="scene-platform">
      <div className="scene-grid" />
      <div className="scene-route route-primary" /><div className="scene-route route-secondary" />
      <div className="scene-building building-a"><i /><span /></div>
      <div className="scene-building building-b"><i /><span /></div>
      <div className="scene-building building-c"><i /><span /></div>
      <div className="scene-building building-d"><i /><span /></div>
      <div className="scene-pin"><span><Icon name="location" size={20} /></span><i /></div>
      <div className="scene-pulse pulse-a" /><div className="scene-pulse pulse-b" />
    </div>
    <div className="float-card postcode-float"><span>VALID POSTCODE</span><strong>SW1A 2AA</strong><small><i /> Westminster · London</small></div>
    <div className="float-card address-float"><span>ADDRESS MATCH</span><strong>10 Downing Street</strong><small>31 provider records nearby</small></div>
    <div className="float-card coordinate-float"><span>COORDINATES</span><strong>51.50354, −0.12768</strong><small>Postcode centroid</small></div>
    <span className="art-caption"><i /> Interactive 3D data preview</span>
  </div>;
}

const products = [
  { icon: "location" as IconName, title: "Postcode Lookup", text: "Validate, normalise and explore postcode-level geography.", detail: "Public search included" },
  { icon: "building" as IconName, title: "Address Finder", text: "Help customers select a complete address with less typing.", detail: "Provider-dependent fields" },
  { icon: "code" as IconName, title: "Developer API", text: "Clear REST endpoints, restricted keys and useful errors.", detail: "Test environment available" },
  { icon: "file" as IconName, title: "Bulk Processing", text: "Validate and enrich permitted records from a CSV file.", detail: "Cost preview before processing" },
];

function Home({ navigate }: { navigate: (view: Page) => void }) {
  return <>
    <Header navigate={navigate} />
    <main className="homepage">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <Badge><Icon name="spark" size={14} /> The UK address intelligence workspace</Badge>
            <h1>Every postcode, turned into <span>business-ready intelligence.</span></h1>
            <p>Search, validate and integrate UK location data with clear provenance, predictable workflows and developer-friendly tools.</p>
            <SearchBox onPostcode={() => navigate("postcode")} onAddress={() => navigate("address")} />
            <div className="trust-row"><span><Icon name="check" /> Public search included</span><span><Icon name="shield" /> Provenance shown clearly</span><span><Icon name="code" /> Test API workspace</span></div>
          </div>
          <HeroArt />
        </div>
        <div className="hero-proof section"><span>Built for</span>{[["Ecommerce", "building"], ["Logistics", "location"], ["CRM enrichment", "database"], ["Property technology", "layers"], ["Developer teams", "code"]].map(([label, icon]) => <div key={label}><Icon name={icon as IconName} size={16} />{label}</div>)}</div>
      </section>

      <section className="how-section section">
        <div className="eyebrow">One connected workflow</div>
        <div className="section-heading row-heading"><div><h2>From a postcode to a confident decision</h2><p>Move from raw input to usable location intelligence in three clear steps.</p></div><Button variant="secondary" onClick={() => navigate("postcode")} icon="arrow">Try a lookup</Button></div>
        <div className="steps">
          {[
            ["01", "Find", "Enter a postcode or partial address and move directly to the strongest matching records.", "search"],
            ["02", "Understand", "Review geography, administrative areas, coordinates and field-level provenance.", "layers"],
            ["03", "Activate", "Use the same structured workflow in checkout, CRM, operations or your own product.", "code"],
          ].map(([n, title, text, icon]) => <div className="step" key={n}><span>{n}</span><i><Icon name={icon as IconName} /></i><div><h3>{title}</h3><p>{text}</p></div></div>)}
        </div>
      </section>

      <section className="demo-band">
        <div className="section demo-grid">
          <div className="demo-copy">
            <Badge tone="green">Address autocomplete</Badge>
            <h2>Complete addresses, without the friction</h2>
            <p>Guide customers towards a provider-supplied address record while preserving a clear route to manual entry.</p>
            <ul className="check-list"><li><Icon name="check" />Accessible keyboard selection</li><li><Icon name="check" />Field-level provenance</li><li><Icon name="check" />Manual entry always available</li></ul>
            <Button variant="dark" onClick={() => navigate("address")} icon="arrow">Explore address finder</Button>
          </div>
          <div className="autocomplete-card">
            <label><span>Delivery address</span><div className="input-wrap active"><Icon name="search" /><input value="10 Downing" readOnly /></div></label>
            <div className="suggestions">
              <div className="suggestion selected"><Icon name="building" /><div><strong>10 Downing Street</strong><span>London, SW1A 2AA</span></div><Icon name="chevron" /></div>
              <div className="suggestion"><Icon name="building" /><div><strong>10 Downing Avenue</strong><span>Guildford, GU2 7PB</span></div><Icon name="chevron" /></div>
              <button>Address not listed? Enter it manually</button>
            </div>
            <div className="provider-note"><Icon name="database" />Demo suggestions · Royal Mail PAF-style record structure</div>
          </div>
        </div>
      </section>

      <section className="section product-section">
        <div className="eyebrow">One precise platform</div>
        <div className="section-heading"><h2>Built for every lookup workflow</h2><p>Start with a public search. Scale into an operational address layer.</p></div>
        <div className="product-grid">{products.map((product) => <button className="product-card" key={product.title} onClick={() => navigate(product.title === "Postcode Lookup" ? "postcode-lookup" : product.title === "Address Finder" ? "address-finder" : product.title === "Developer API" ? "api-access" : "bulk-processing")}><span className="product-icon"><Icon name={product.icon} /></span><h3>{product.title}</h3><p>{product.text}</p><div><span>{product.detail}</span><Icon name="arrow" /></div></button>)}</div>
      </section>

      <section className="section operations-showcase">
        <div className="operations-image">
          <img src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?crop=entropy&amp;cs=tinysrgb&amp;fit=crop&amp;fm=jpg&amp;q=82&amp;w=1400" alt="Aerial view across the London skyline and River Thames" />
          <div className="image-grid-overlay" />
          <div className="operations-location-card"><span><Icon name="location" /></span><div><small>Example coverage view</small><strong>London · United Kingdom</strong></div><Badge tone="green">Mapped</Badge></div>
          <small className="photo-credit">Photo by Benjamin Davies on Unsplash</small>
        </div>
        <div className="operations-content">
          <div className="eyebrow">Designed for real operations</div>
          <h2>One intelligence layer, across every customer journey.</h2>
          <p>Use consistent postcode and address logic from the first customer interaction through to downstream operations.</p>
          <div className="operations-list">{[
            ["Ecommerce checkout", "Reduce address entry friction while preserving manual control.", "building", "address-finder"],
            ["CRM enrichment", "Normalise permitted customer records and organise location data.", "database", "bulk-processing"],
            ["Logistics workflows", "Validate postcode inputs before routing or fulfilment decisions.", "location", "postcode-lookup"],
          ].map(([title, text, icon, destination], i) => <button className={i === 0 ? "active" : ""} key={title} onClick={() => navigate(destination as Page)}><i><Icon name={icon as IconName} /></i><div><strong>{title}</strong><span>{text}</span></div><Icon name="arrow" /></button>)}</div>
        </div>
      </section>

      <section className="code-section">
        <div className="section code-grid">
          <div><Badge tone="neutral">Developer-first</Badge><h2>From first request to production, quickly</h2><p>Predictable endpoints, transparent billing signals and mock responses that are safe to explore.</p><Button variant="secondary" onClick={() => navigate("developers")} icon="arrow">Read the documentation</Button></div>
          <div className="code-window">
            <div className="code-head"><div><span /><span /><span /></div><div className="code-tabs"><b>cURL</b><span>JavaScript</span><span>Python</span></div><button aria-label="Copy code"><Icon name="copy" /></button></div>
            <pre><code><span className="code-blue">curl</span> <span className="code-green">"http://localhost:8003/api/v1/postcodes/SW1A%202AA"</span> \<br />  -H <span className="code-green">"Authorization: Bearer pp_test_••••"</span> \<br />  -H <span className="code-green">"Accept: application/json"</span><br /><br /><span className="code-muted">{"// Sample response"}</span><br />{"{"}<br />  <span className="code-blue">"data"</span>: {"{"}<br />    <span className="code-blue">"postcode"</span>: <span className="code-green">"SW1A 2AA"</span>,<br />    <span className="code-blue">"country"</span>: <span className="code-green">"England"</span>,<br />    <span className="code-blue">"latitude"</span>: <span className="code-number">51.50354</span>,<br />    <span className="code-blue">"longitude"</span>: <span className="code-number">-0.12770</span><br />  {"}"}<br />{"}"}</code></pre>
          </div>
        </div>
      </section>

      <section className="section data-section">
        <div className="data-card"><span className="data-orbit"><Icon name="database" size={32} /></span><div><div className="eyebrow">Data, explained</div><h2>Know what you are looking at</h2><p>Postcode geography and full property-level addresses are distinct datasets. Enhanced fields such as UPRN or rooftop coordinates appear only when the selected provider supplies them.</p></div><Button variant="secondary" icon="arrow">Explore data sources</Button></div>
      </section>

      <HomePricingPreview navigate={navigate} />

      <section className="section trustscoring-section">
        <div><div className="eyebrow">Independent review visibility</div><h2>Designed to show verified customer trust, transparently.</h2><p>This preview reserves space for a live TrustScoring score without inventing reviews or ratings. Connect a verified PostcodePulse company slug when it becomes available.</p><button onClick={() => window.open(TRUSTSCORING_PROFILE_URL, "_blank", "noopener,noreferrer")}>Visit TrustScoring <Icon name="external" size={15} /></button></div>
        <TrustScoringWidget variant="feature" />
      </section>

      <section className="section faq-section"><div><div className="eyebrow">Common questions</div><h2>Helpful answers, upfront</h2><p>Can’t find what you need? Visit our help centre.</p></div><div className="faq-list">{["What is the difference between postcode and address data?", "What counts as a billable retrieval?", "Can I restrict a browser token?", "How fresh is the underlying data?"].map((q, i) => <details key={q} open={i === 0}><summary>{q}<Icon name="plus" /></summary><p>{i === 0 ? "Postcode records describe a geographic delivery area. Address records identify individual premises and depend on a property-level provider." : "Our documentation explains the applicable rules and provider dependencies before you integrate."}</p></details>)}</div></section>

      <section className="section final-cta premium-final-cta"><div className="cta-visual"><span><Icon name="location" size={26} /></span><i /><i /><i /></div><div><Badge tone="neutral">Ready when you are</Badge><h2>Turn UK location data into better customer experiences.</h2><p>Create a test workspace, issue a restricted key and explore your first structured response.</p></div><Button variant="dark" onClick={() => navigate("create-account")} icon="arrow">Get API access</Button></section>
    </main>
    <Footer navigate={navigate} />
  </>;
}

function Footer({ navigate }: { navigate: (view: Page) => void }) {
  return <footer><div className="footer-main section"><div className="footer-brand"><Logo onClick={() => navigate("home")} /><p>Precise UK postcode lookup and address intelligence for people and products.</p><TrustScoringWidget variant="footer" /></div>{[
    ["Product", "Postcode lookup", "Address finder", "API access", "Bulk processing", "Pricing"],
    ["Resources", "API Docs", "Developer centre", "Help centre", "System status", "Data sources", "Changelog"],
    ["Company", "About", "Contact", "Accessibility", "Privacy", "Cookies", "Terms"],
  ].map(([title, ...links]) => <div className="footer-col" key={title}><strong>{title}</strong>{links.map((link) => {
    const destinations: Record<string, Page> = {
      "Postcode lookup": "postcode-lookup", "Address finder": "address-finder", "API access": "api-access", "Bulk processing": "bulk-processing", Pricing: "pricing",
      "API Docs": "api-docs", "Developer centre": "developers", "Help centre": "help-centre", "System status": "system-status", "Data sources": "data-sources", Changelog: "changelog",
      About: "about", Contact: "contact", Accessibility: "accessibility", Privacy: "privacy", Cookies: "cookies", Terms: "terms",
    };
    return <button key={link} onClick={() => navigate(destinations[link])}>{link}</button>;
  })}</div>)}</div><div className="footer-bottom section"><span>© 2025 PostcodePulse. Prototype content.</span></div></footer>;
}

function MapVisual({ postcode = "SW1A 2AA" }: { postcode?: string }) {
  return <div className="result-map" aria-label="Approximate postcode location map">
    <div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" />
    <span className="map-water">St James’s Park</span><span className="map-street st-one">Birdcage Walk</span><span className="map-street st-two">Whitehall</span>
    <div className="map-marker"><span><Icon name="location" /></span><div><strong>{postcode}</strong><small>Approximate postcode location</small></div></div>
    <div className="map-controls"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div>
    <Badge tone="neutral">Map data · Demo</Badge>
  </div>;
}

function ResultPage({ navigate }: { navigate: (view: Page) => void }) {
  const [copied, setCopied] = useState("");
  const [record, setRecord] = useState<PostcodeRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [addressMetaTotal, setAddressMetaTotal] = useState(0);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressRecord | null>(null);
  const [addressPage, setAddressPage] = useState(1);
  const [hasNextAddresses, setHasNextAddresses] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const query = getLastPostcodeQuery();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setSelectedAddress(null);
    setAddresses([]);
    api.lookupPostcode(query, { public: true })
      .then((res) => { if (!cancelled) setRecord(res.data); })
      .catch((err) => {
        if (!cancelled) {
          setRecord(null);
          setNotFound(err instanceof ApiError && err.status === 404);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);
  useEffect(() => {
    if (!record?.postcode) return;
    let cancelled = false;
    setAddressesLoading(true);
    api.listPostcodeAddresses(record.postcode, addressPage, undefined, { public: true })
      .then((res) => {
        if (cancelled) return;
        setAddresses((prev) => addressPage > 1 ? [...prev, ...res.data] : res.data);
        setAddressMetaTotal(res.meta?.total ?? res.data.length);
        setHasNextAddresses(Boolean(res.meta?.has_next));
        setPaginationEnabled(res.meta?.pagination_enabled !== false);
      })
      .catch(() => {
        if (!cancelled) {
          if (addressPage === 1) setAddresses([]);
          setHasNextAddresses(false);
        }
      })
      .finally(() => { if (!cancelled) setAddressesLoading(false); });
    return () => { cancelled = true; };
  }, [record?.postcode, addressPage]);
  useEffect(() => {
    setAddressPage(1);
  }, [record?.postcode]);
  const copy = (value: string) => { navigator.clipboard?.writeText(value); setCopied(value); window.setTimeout(() => setCopied(""), 1400); };
  const postcode = record?.postcode || query;
  const lat = record?.latitude ?? record?.coordinates?.latitude;
  const lng = record?.longitude ?? record?.coordinates?.longitude;
  const precision = record?.coordinates?.precision?.replace(/_/g, " ") || "Postcode centroid";
  const statusLabel = record?.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : "—";
  const openAddresses = () => {
    setLastAddressSearch(postcode, "");
    navigate("address");
  };
  return <><Header navigate={navigate} /><main className="result-page">
    <div className="section result-search"><button className="back-link" onClick={() => navigate("home")}><Icon name="arrow" />Back to search</button><SearchBox compact onPostcode={() => navigate("postcode")} onAddress={() => navigate("address")} /></div>
    {loading && <div className="section"><p>Loading postcode details…</p></div>}
    {!loading && notFound && <div className="section result-heading"><div><Badge tone="red">No match</Badge><h1>{query}</h1><p>We could not find a matching postcode record.</p></div></div>}
    {!loading && !notFound && record && <>
    <div className="section result-heading"><div><Badge tone="green"><Icon name="check" size={14} /> Current postcode</Badge><h1>{postcode}</h1><p>{record.local_authority || record.admin_district} · {record.country}</p></div><div className="result-actions"><Button variant="secondary" onClick={() => copy(postcode)} icon={copied === postcode ? "check" : "copy"}>{copied === postcode ? "Copied" : "Copy postcode"}</Button><Button variant="secondary" icon="external">Share</Button><Button icon="plus" onClick={() => navigate(isAuthenticated() ? "dashboard" : "signin")}>Save to list</Button></div></div>
    <div className="section result-grid">
      <div className="result-panel">
        <div className="panel-title"><div><h2>Postcode details</h2><p>Structured postcode-level information</p></div><Badge>{record.source ? "Provider record" : "Demo record"}</Badge></div>
        <div className="summary-strip"><div><span>STATUS</span><strong><i /> {statusLabel}</strong></div><div><span>COUNTRY</span><strong>{record.country}</strong></div><div><span>POST TOWN</span><strong>{record.post_town}</strong></div></div>
        <DetailGroup title="Administrative geography" rows={[["Local authority", record.local_authority || record.admin_district], ["Westminster constituency", record.constituency], ["Region", record.region], ["Ceremonial county", record.ceremonial_county]]} />
        <DetailGroup title="Coordinates" rows={[["Latitude", String(lat ?? "Not available")], ["Longitude", String(lng ?? "Not available")], ["Coordinate precision", precision]]} mono />
        <div className="coordinates-action"><Button variant="secondary" icon={copied === coordString(record) ? "check" : "copy"} onClick={() => copy(coordString(record))}>Copy coordinates</Button><span>Approximate postcode location, not a rooftop coordinate.</span></div>
        <DetailGroup title="Data provenance" rows={[["Source", record.source || "Illustrative postcode dataset"], ["Record updated", record.record_updated || "Not available"], ["Address-level data", "Available from a separate provider"]]} />
        <div className="address-dropdown-card">
          <div className="list-caption">{addressesLoading && addresses.length === 0 ? "LOADING ADDRESSES" : `${addressMetaTotal || addresses.length} ADDRESSES`}</div>
          {addresses.map((address) => (
            <button
              type="button"
              className={`address-option ${selectedAddress?.id === address.id ? "selected" : ""}`}
              key={address.id ?? `${address.postcode}-${address.line1}`}
              onClick={() => setSelectedAddress(address)}
            >
              <span><Icon name="building" /></span>
              <div>
                <strong>{address.full_address || address.building || address.line1}</strong>
                <small>{address.description || [address.post_town, address.postcode].filter(Boolean).join(", ")}</small>
              </div>
              <Icon name="chevron" size={16} />
            </button>
          ))}
          {!addressesLoading && addresses.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No addresses found</strong><span>Try another postcode.</span></div>}
          {paginationEnabled && hasNextAddresses && (
            <Button variant="secondary" onClick={() => setAddressPage((page) => page + 1)} className={addressesLoading ? "loading" : ""}>
              {addressesLoading ? "Loading…" : "Load more addresses"}
            </Button>
          )}
        </div>
        {selectedAddress && (
          <DetailGroup
            title="Selected address"
            rows={[
              ["Address", selectedAddress.full_address || selectedAddress.building || selectedAddress.line1],
              ["Description", selectedAddress.description || "—"],
              ["Postcode", selectedAddress.postcode],
              ["Online ID", selectedAddress.online_id || "—"],
              ["Type", selectedAddress.type || "—"],
            ]}
          />
        )}
        <button className="address-availability" onClick={openAddresses}><span className="product-icon"><Icon name="building" /></span><div><strong>Addresses available for this postcode</strong><span>Browse provider-supplied property records</span></div><Icon name="arrow" /></button>
      </div>
      <div className="map-column"><MapVisual postcode={postcode} /><div className="map-note"><Icon name="help" /><p><strong>About this marker</strong><span>It represents an approximate postcode location. It does not identify a specific property or confirm delivery availability.</span></p></div></div>
    </div>
    </>}
  </main></>;
}

function DetailGroup({ title, rows, mono = false }: { title: string; rows: string[][]; mono?: boolean }) {
  return <div className="detail-group"><h3>{title}</h3>{rows.map(([label, value]) => <div className="detail-row" key={label}><span>{label}</span><strong className={mono ? "mono" : ""}>{value || "Not available"}</strong><button aria-label={`Copy ${label}`}><Icon name="copy" size={15} /></button></div>)}</div>;
}

function AddressPage({ navigate }: { navigate: (view: Page) => void }) {
  const postcode = getLastAddressPostcode();
  const filter = getLastAddressFilter();
  const searchQuery = getLastAddressQuery();
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [total, setTotal] = useState(0);
  const [postcodeRecord, setPostcodeRecord] = useState<PostcodeRecord | null>(null);
  const [detail, setDetail] = useState<AddressRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    api.searchAddresses({ postcode, q: filter || undefined, page: 1 }, { public: true })
      .then((res) => {
        if (cancelled) return;
        setAddresses(res.data);
        setSelected(0);
        setDetail(res.data[0] || null);
        setTotal(res.meta?.total ?? res.data.length);
        setHasNext(Boolean(res.meta?.has_next));
        setPaginationEnabled(res.meta?.pagination_enabled !== false);
      })
      .catch(() => {
        if (!cancelled) {
          setAddresses([]);
          setDetail(null);
          setTotal(0);
          setHasNext(false);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postcode, filter]);

  useEffect(() => {
    if (!postcode.trim()) return;
    let cancelled = false;
    api.lookupPostcode(postcode, { public: true })
      .then((res) => { if (!cancelled) setPostcodeRecord(res.data); })
      .catch(() => { if (!cancelled) setPostcodeRecord(null); });
    return () => { cancelled = true; };
  }, [postcode]);

  const selectAddress = async (index: number) => {
    setSelected(index);
    const address = addresses[index];
    if (!address) return;
    setDetail(address);
    if (address.id == null) return;
    try {
      const res = await api.getAddress(address.id, { public: true });
      setDetail(res.data);
    } catch {
      /* keep list item details */
    }
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await api.searchAddresses({ postcode, q: filter || undefined, page: nextPage }, { public: true });
      setAddresses((prev) => [...prev, ...res.data]);
      setPage(nextPage);
      setHasNext(Boolean(res.meta?.has_next));
      setPaginationEnabled(res.meta?.pagination_enabled !== false);
      setTotal(res.meta?.total ?? total);
    } catch {
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  };

  const current = detail || addresses[selected];
  const addressLine = current
    ? (current.full_address || `${current.line1 || current.building}, ${current.post_town}, ${current.postcode}`)
    : "";
  const lat = postcodeRecord?.latitude ?? postcodeRecord?.coordinates?.latitude ?? current?.latitude;
  const lng = postcodeRecord?.longitude ?? postcodeRecord?.coordinates?.longitude ?? current?.longitude;
  const coords = lat != null && lng != null ? `${lat}, ${lng}` : "Not available";

  return <><Header navigate={navigate} /><main className="address-page section">
    <button className="back-link" onClick={() => navigate("home")}><Icon name="arrow" />Back to search</button>
    <div className="address-head"><div><Badge tone="blue">Address finder</Badge><h1>Choose the right address</h1><p>{loading && addresses.length === 0 ? "Searching…" : `${total || addresses.length} matching provider records for “${filter || searchQuery || postcode}” in ${postcode}.`}</p></div><Button variant="secondary">Enter address manually</Button></div>
    <div className="address-layout">
      <div className="address-list-card"><div className="list-search"><Icon name="search" /><input value={filter || postcode} readOnly /><button type="button" aria-label="Clear"><Icon name="x" /></button></div><div className="list-caption">{total || addresses.length} MATCHES · {loading ? "LOADING" : "LIVE DATA"}</div>
        {addresses.map((address, i) => <button className={`address-option ${selected === i ? "selected" : ""}`} onClick={() => void selectAddress(i)} key={address.id ?? `${address.postcode}-${address.building}-${i}`}><span><Icon name="building" /></span><div><strong>{address.building || address.line1}</strong><small>{address.description || [address.locality, address.post_town, address.postcode].filter(Boolean).join(", ")}</small></div><span className="radio"><i /></span></button>)}
        {!loading && addresses.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No matching addresses</strong><span>Try a different search from the home page.</span></div>}
        {paginationEnabled && hasNext && <Button variant="secondary" onClick={() => void loadMore()} className={loading ? "loading" : ""}>{loading ? "Loading…" : "Load more"}</Button>}
        <button className="help-route"><Icon name="help" />Address not listed?</button>
      </div>
      {current && <div className="address-detail-card">
        <div className="panel-title"><div><Badge tone="green"><Icon name="check" size={14} /> Provider record</Badge><h2>{current.building || current.line1}</h2><p>{current.description || `${current.post_town}, ${current.postcode}`}</p></div><Button variant="secondary" icon="copy" onClick={() => navigator.clipboard?.writeText(addressLine)}>Copy address</Button></div>
        <DetailGroup title="Address fields" rows={[["Full address", current.full_address || addressLine], ["Building", current.building], ["Address line 1", current.line1], ["Locality", current.locality || "Not available"], ["Post town", current.post_town || "Not available"], ["Postcode", current.postcode]]} />
        <DetailGroup title="Enhanced fields" rows={[["Online ID", current.online_id || current.uprn || "Not available"], ["Type", current.type || "Not available"], ["Coordinates", coords], ["Coordinate precision", current.precision || postcodeRecord?.coordinates?.precision || "Postcode centroid"]]} mono />
        {postcodeRecord && <DetailGroup title="Postcode geography" rows={[["Administrative district", postcodeRecord.admin_district || postcodeRecord.local_authority], ["Region", postcodeRecord.region], ["Country", postcodeRecord.country], ["Constituency", postcodeRecord.constituency]]} />}
        <div className="map-column" style={{ marginTop: 16 }}><MapVisual postcode={current.postcode} /><div className="map-note"><Icon name="help" /><p><strong>About this marker</strong><span>Approximate postcode location for the selected address.</span></p></div></div>
        <div className="provenance-box"><Icon name="database" /><div><strong>Field provenance</strong><p>Address fields come from the lookup provider. Map coordinates use the postcode centroid when rooftop precision is unavailable.</p></div></div>
        <Button icon="check">Use this address</Button>
      </div>}
    </div>
  </main></>;
}

const dashNav: [string, IconName][] = [
  ["Overview", "layers"], ["Lookup explorer", "search"], ["Projects", "file"], ["API keys", "key"], ["Usage & logs", "trend"], ["Bulk jobs", "upload"], ["Saved lists", "database"], ["Billing", "wallet"], ["Team", "people"], ["Support", "help"], ["API Docs", "code"], ["Settings", "settings"],
];

function AppShell({ admin = false, navigate, children }: { admin?: boolean; navigate: (v: Page) => void; children: ReactNode }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const active = admin ? adminLabelFromPath(location.pathname) : dashboardLabelFromPath(location.pathname);
  const nav = admin ? [["Operations", "trend"], ["Customers", "people"], ["API operations", "code"], ["Providers & datasets", "database"], ["Billing", "wallet"], ["Pricing", "layers"], ["Abuse controls", "shield"], ["Support", "help"], ["Content", "file"], ["Audit log", "layers"], ["Staff settings", "settings"]] as [string, IconName][] : dashNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const [org, setOrg] = useState<AuthOrganisation | null>(getOrganisation());
  const [environment, setEnvironment] = useState(admin ? "Live operations" : getWorkspaceEnvironment());
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  useEffect(() => {
    const unsubscribe = subscribeSession(() => {
      setUser(getUser());
      setOrg(getOrganisation());
      if (!admin) setEnvironment(getWorkspaceEnvironment());
    });
    return () => {
      unsubscribe();
    };
  }, [admin]);
  const selectSection = (label: string) => {
    routerNavigate(admin ? adminPath(label) : dashboardPath(label));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileOpen(false);
    setSearchOpen(false);
  };
  const toggleEnvironment = () => {
    if (admin) return;
    const next = getWorkspaceEnvironment() === "Test" ? "Live" : "Test";
    setWorkspaceEnvironment(next);
    setEnvironment(next);
  };
  const orgName = admin ? "PostcodePulse Ops" : org?.name || "Workspace";
  const orgBadge = admin ? "PP" : orgInitials(orgName);
  const creditBalance = org ? formatMoney(org.credit_balance) : formatMoney(0);
  return <div className={`app-shell ${admin ? "admin-shell" : "customer-shell"} ${mobileOpen ? "nav-visible" : ""}`}>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside><div className="aside-logo"><Logo onClick={() => navigate("home")} />{admin ? <Badge tone="neutral">INTERNAL</Badge> : <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><Icon name="x" /></button>}</div>
      <div className="org-card"><span>{orgBadge}</span><div><strong>{orgName}</strong><small>{admin ? "Internal workspace" : "Business workspace"}</small></div><Icon name="chevron" /></div>
      <nav>{nav.map(([label, icon]) => <button className={active === label ? "active" : ""} onClick={() => selectSection(label)} key={label}><Icon name={icon} /><span>{label}</span>{label === "Billing" && !admin && <i />}</button>)}</nav>
      <div className="aside-bottom">{!admin && <div className="credit-mini"><div><span>Credit balance</span><strong>{creditBalance}</strong></div><div><i /></div><button onClick={() => selectSection("Billing")}>Manage billing</button></div>}{(!admin && user?.is_staff) || admin ? <button onClick={() => navigate(admin ? "dashboard" : "admin")}><Icon name={admin ? "layers" : "shield"} />{admin ? "Customer workspace" : "Admin demo"}</button> : null}<button onClick={() => navigate("home")}><Icon name="external" />Public website</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
        <div className="env-switch"><span>Environment</span><button onClick={toggleEnvironment} aria-label={`Switch environment. Current environment: ${environment}`}><i className={environment === "Live" || environment === "Live operations" ? "live" : ""} /> {environment} {!admin && <Icon name="chevron" size={14} />}</button></div>
        <div className={`workspace-search ${searchOpen ? "open" : ""}`}>
          <div className="workspace-search-input"><Icon name="search" /><input autoFocus={searchOpen} value={workspaceQuery} onChange={(event) => setWorkspaceQuery(event.target.value)} placeholder="Search workspace or postcode…" onKeyDown={(event) => { if (event.key === "Enter") selectSection("Lookup explorer"); if (event.key === "Escape") setSearchOpen(false); }} />{workspaceQuery && <button aria-label="Clear search" onClick={() => setWorkspaceQuery("")}><Icon name="x" size={15} /></button>}<kbd>⌘ K</kbd></div>
          <div className="workspace-search-dropdown">
            <div className="search-dropdown-brand"><Logo onClick={() => navigate("home")} /><span>Quick search</span></div>
            {workspaceQuery && <button className="search-postcode-action" onClick={() => selectSection("Lookup explorer")}><span><Icon name="location" /></span><div><strong>Look up “{workspaceQuery.toUpperCase()}”</strong><small>Search UK postcode intelligence</small></div><kbd>↵</kbd></button>}
            <div className="search-dropdown-group"><span>{workspaceQuery ? "Matching destinations" : "Quick actions"}</span>
              {[
                ["Lookup explorer", "Search a UK postcode", "location"],
                ["Usage & logs", "Review searches and costs", "trend"],
                ["API keys", "Manage integration credentials", "key"],
                ["Billing", "Credits, invoices and payments", "wallet"],
              ].filter(([label, description]) => `${label} ${description}`.toLowerCase().includes(workspaceQuery.toLowerCase())).map(([label, description, icon]) => <button key={label} onClick={() => selectSection(label)}><i><Icon name={icon as IconName} size={16} /></i><div><strong>{label}</strong><small>{description}</small></div><Icon name="chevron" size={14} /></button>)}
            </div>
            {!workspaceQuery && <div className="search-dropdown-recent"><span>Recent postcodes</span><div>{["SW1A 2AA", "EC1A 1BB", "M1 1AE"].map((postcode) => <button key={postcode} onClick={() => { setWorkspaceQuery(postcode); selectSection("Lookup explorer"); }}><Icon name="location" size={14} />{postcode}</button>)}</div></div>}
            <div className="search-dropdown-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></div>
          </div>
        </div>
        <div className="top-actions"><button aria-label="Search workspace" onClick={() => setSearchOpen(!searchOpen)}><Icon name={searchOpen ? "x" : "search"} /></button><button className="notification" aria-label="Open support" onClick={() => selectSection("Support")}><Icon name="help" /><i /></button><button className="avatar" aria-label="Open account settings" onClick={() => selectSection(admin ? "Staff settings" : "Settings")}>{initials(user)}</button></div>
      </header>
      <main>{children}</main>
    </div>
  </div>;
}

function MetricCard({ label, value, change, icon }: { label: string; value: string; change: string; icon: IconName }) {
  return <div className="metric-card"><div><span>{label}</span><span className="metric-icon"><Icon name={icon} /></span></div><strong>{value}</strong><small><b>{change}</b> <span>vs previous period</span></small></div>;
}

function Chart() {
  return <div className="chart"><div className="chart-y"><span>12k</span><span>8k</span><span>4k</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 700 200" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#245BFF" stopOpacity=".22" /><stop offset="100%" stopColor="#245BFF" stopOpacity="0" /></linearGradient></defs><path className="area" d="M0,160 C60,148 80,130 130,140 S210,112 250,123 S330,80 380,99 S470,68 510,78 S610,36 700,48 L700,200 L0,200Z" /><path className="line" d="M0,160 C60,148 80,130 130,140 S210,112 250,123 S330,80 380,99 S470,68 510,78 S610,36 700,48" /></svg><div className="chart-x"><span>1 May</span><span>8 May</span><span>15 May</span><span>22 May</span><span>28 May</span></div></div></div>;
}

function DashboardLayout({ navigate }: { navigate: (v: Page) => void }) {
  return <AppShell navigate={navigate}><Outlet /></AppShell>;
}

function AdminLayout({ navigate }: { navigate: (v: Page) => void }) {
  return <AppShell admin navigate={navigate}><Outlet /></AppShell>;
}

function Overview() {
  const routerNavigate = useNavigate();
  const navigateSection = (label: string) => {
    routerNavigate(dashboardPath(label));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [showBalanceNotice, setShowBalanceNotice] = useState(true);
  const [period, setPeriod] = useState("28 days");
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.dashboardOverview>>["data"] | null>(null);
  const periodOptions = ["7 days", "28 days", "90 days"];
  const checklistRoutes = ["Projects", "Lookup explorer", "API keys", "Billing", "Team", "Settings"];
  useEffect(() => {
    api.dashboardOverview().then((res) => setOverview(res.data)).catch(() => setOverview(null));
  }, []);
  const greeting = overview?.greeting_name || getUser()?.first_name || getUser()?.name || "there";
  const balance = formatMoney(overview?.credit_balance ?? getOrganisation()?.credit_balance);
  const successRate = overview?.success_rate != null ? `${Number(overview.success_rate).toFixed(1)}%` : "—";
  const systemsLabel = overview?.systems_status === "operational" ? "All systems operational" : (overview?.systems_status || "All systems operational");
  return <div className="workspace-page">
    <div className="workspace-heading overview-heading"><div><div className="welcome-kicker"><span className="live-dot" /> Workspace overview <span>Updated 2 min ago</span></div><h1>Good morning, {greeting}</h1><p>Monitor usage, projects and account health from one place.</p></div><div><Button variant="secondary" onClick={() => navigateSection("Lookup explorer")} icon="search">Run a lookup</Button><Button onClick={() => navigateSection("API keys")} icon="plus">Create API key</Button></div></div>
    <section className="account-hero">
      <div className="account-hero-copy"><Badge tone="green">{systemsLabel}</Badge><h2>Your workspace is running smoothly</h2><p>{successRate} successful requests across {overview?.active_projects ?? 3} active projects this month.</p><button onClick={() => navigateSection("Usage & logs")}>View usage details <Icon name="arrow" /></button></div>
      <div className="account-hero-stat"><span>Current balance</span><strong>{balance}</strong><div><i /><span>28% remaining</span></div><small>Estimated to last 6 days</small></div>
      <div className="hero-pattern" aria-hidden="true"><i /><i /><i /></div>
    </section>
    {showBalanceNotice && <div className="alert low-balance"><span><Icon name="wallet" /></span><div><strong>Keep lookups running without interruption</strong><p>Your balance is below the recommended level for current usage.</p></div><button onClick={() => navigateSection("Billing")}>Review billing <Icon name="arrow" /></button><button aria-label="Dismiss balance notice" onClick={() => setShowBalanceNotice(false)}><Icon name="x" /></button></div>}
    <div className="metrics-grid"><MetricCard label="Credit balance" value={balance} change="£18.20 used" icon="wallet" /><MetricCard label="Requests this period" value="84,291" change="+12.4%" icon="trend" /><MetricCard label="Billable retrievals" value="61,842" change="+8.7%" icon="database" /><MetricCard label="Successful requests" value={successRate} change="+0.3%" icon="check" /></div>
    <div className="dashboard-grid">
      <div className="dash-card usage-card"><div className="card-head"><div><span className="card-eyebrow">API performance</span><h2>Usage trend</h2><p>All requests, including non-billable outcomes</p></div><div className="legend"><span><i /> Requests</span><button onClick={() => setPeriod(periodOptions[(periodOptions.indexOf(period) + 1) % periodOptions.length])}>Last {period} <Icon name="chevron" /></button></div></div><Chart /><div className="chart-summary"><span><i className="blue" />72,104 successful</span><span><i className="red" />1,087 errors</span><span><i className="grey" />11,100 non-billable</span></div></div>
      <div className="dash-card checklist-card"><div className="card-head"><div><span className="card-eyebrow">Setup guide</span><h2>Get production-ready</h2><p>4 of 6 steps complete</p></div><strong>67%</strong></div><div className="progress"><i /></div>{["Create your first project", "Make a test request", "Restrict your API key", "Add a payment method", "Invite a team member", "Review retention settings"].map((item, i) => <button key={item} className={i < 4 ? "done" : ""} onClick={() => navigateSection(checklistRoutes[i])}><span>{i < 4 ? <Icon name="check" size={14} /> : i + 1}</span><b>{item}</b><Icon name="chevron" /></button>)}</div>
      <div className="dash-card project-card"><div className="card-head"><div><span className="card-eyebrow">Your workspace</span><h2>Projects</h2><p>Requests by project · last {period}</p></div><button onClick={() => navigateSection("Projects")}>View all <Icon name="arrow" /></button></div>{[["Checkout", "52,184", 72], ["CRM enrichment", "21,080", 42], ["Operations tools", "11,027", 26]].map(([name, count, width]) => <button className="project-row" key={name} onClick={() => navigateSection("Projects")}><div><span className="project-dot" /><strong>{name}</strong><small>{count} requests</small></div><div><i style={{ width: `${width}%` }} /></div><Icon name="chevron" /></button>)}</div>
      <div className="dash-card activity-card"><div className="card-head"><div><span className="card-eyebrow">Audit trail</span><h2>Recent activity</h2><p>Security and project changes</p></div><button aria-label="View usage and logs" onClick={() => navigateSection("Usage & logs")}><Icon name="more" /></button></div>{[["key", "Production checkout key rotated", "Emma M. · 18 min ago"], ["people", "Alex Chen joined as Developer", "Invitation accepted · 2 hrs ago"], ["wallet", "Automatic top-up completed", "£50.00 · Yesterday"]].map(([icon, title, meta]) => <button className="activity-row" key={title} onClick={() => navigateSection("Usage & logs")}><span><Icon name={icon as IconName} /></span><div><strong>{title}</strong><small>{meta}</small></div><Icon name="chevron" size={15} /></button>)}</div>
    </div>
  </div>;
}

const pageContent: Record<string, { title: string; subtitle: string; action: string; icon: IconName }> = {
  "Lookup explorer": { title: "Lookup explorer", subtitle: "Inspect structured responses before you integrate.", action: "Run lookup", icon: "search" },
  Projects: { title: "Projects", subtitle: "Separate environments, usage controls and credentials.", action: "New project", icon: "file" },
  "API keys": { title: "API keys", subtitle: "Create and restrict credentials for each environment.", action: "Create key", icon: "key" },
  "Usage & logs": { title: "Usage & logs", subtitle: "Review requests, billable events, errors and latency.", action: "Export", icon: "download" },
  "Bulk jobs": { title: "Bulk jobs", subtitle: "Validate permitted CSV data with cost control.", action: "Upload CSV", icon: "upload" },
  "Saved lists": { title: "Saved lists", subtitle: "Organise postcode and address records for later.", action: "New folder", icon: "plus" },
  Billing: { title: "Billing", subtitle: "Manage credits, payment methods and VAT details.", action: "Top up credits", icon: "wallet" },
  Team: { title: "Team", subtitle: "Manage roles, invitations and access.", action: "Invite colleague", icon: "people" },
  Support: { title: "Support", subtitle: "Get help with an integration or request.", action: "Create ticket", icon: "help" },
  "API Docs": { title: "API Docs", subtitle: "Endpoints, authentication and integration guides.", action: "Open docs", icon: "code" },
  Settings: { title: "Settings", subtitle: "Organisation, security, sessions and retention.", action: "Save changes", icon: "settings" },
};

function isCompleteUkPostcode(value: string) {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact);
}

function isAbortError(error: unknown) {
  return (error instanceof DOMException || error instanceof Error) && error.name === "AbortError";
}

function PostcodeWorkspacePage() {
  const [postcode, setPostcode] = useState("");
  const [resultPostcode, setResultPostcode] = useState("");
  const [record, setRecord] = useState<PostcodeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownMode, setDropdownMode] = useState<"suggest" | "addresses">("suggest");
  const [suggestionList, setSuggestionList] = useState<PostcodeRecord[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressRecord | null>(null);
  const [addressPage, setAddressPage] = useState(1);
  const [addressTotal, setAddressTotal] = useState(0);
  const [hasNextAddresses, setHasNextAddresses] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [workspaceEnvironment, setWorkspaceEnv] = useState<"Test" | "Live">(getWorkspaceEnvironment());
  useEffect(() => subscribeSession(() => setWorkspaceEnv(getWorkspaceEnvironment())), []);

  useEffect(() => {
    const compact = postcode.replace(/\s+/g, "");
    if (compact.length < 2 || dropdownMode === "addresses") {
      if (compact.length < 2) setSuggestionList([]);
      return;
    }
    const controller = new AbortController();
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      api.suggestPostcodes(postcode, { signal: controller.signal })
        .then((res) => setSuggestionList(res.data))
        .catch((err) => {
          if (isAbortError(err)) return;
          setSuggestionList([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionsLoading(false);
        });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [postcode, dropdownMode]);

  const loadAddresses = async (lookupPostcode: string, page = 1, append = false) => {
    setAddressesLoading(true);
    setDropdownMode("addresses");
    setDropdownOpen(true);
    try {
      const res = await api.listPostcodeAddresses(lookupPostcode, page);
      setAddresses((prev) => (append ? [...prev, ...res.data] : res.data));
      setAddressTotal(res.meta?.total ?? res.data.length);
      setHasNextAddresses(Boolean(res.meta?.has_next));
      setPaginationEnabled(res.meta?.pagination_enabled !== false);
      setAddressPage(page);
      if (!append) setSelectedAddress(null);
    } catch {
      if (!append) {
        setAddresses([]);
        setAddressTotal(0);
        setSelectedAddress(null);
      }
      setHasNextAddresses(false);
    } finally {
      setAddressesLoading(false);
    }
  };

  const runLookup = async (event?: FormEvent, nextPostcode?: string) => {
    event?.preventDefault();
    const query = (nextPostcode ?? postcode).trim();
    if (!query) return;
    setLoading(true);
    setDropdownMode("addresses");
    setSuggestionList([]);
    setSaved(false);
    setSelectedAddress(null);

    const normalizedInput = query.toUpperCase();
    setPostcode(normalizedInput);
    setResultPostcode(normalizedInput);

    let geography: PostcodeRecord | null = null;
    try {
      const res = await api.lookupPostcode(query);
      geography = res.data;
      setRecord(res.data);
      setResultPostcode(res.data.postcode);
      setPostcode(res.data.postcode);
    } catch {
      setRecord(null);
    }

    await loadAddresses(geography?.postcode || query, 1, false);
    setLoading(false);
  };

  const copyResponse = () => {
    const response = JSON.stringify({
      postcode: record || { postcode: resultPostcode },
      selected_address: selectedAddress,
      addresses,
    }, null, 2);
    navigator.clipboard?.writeText(response);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const savePostcode = async () => {
    if (!isAuthenticated() || !resultPostcode) return;
    try {
      await api.savePostcode(resultPostcode, undefined, record || undefined);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  const selectAddress = async (address: AddressRecord) => {
    setSelectedAddress(address);
    setDropdownOpen(false);
    if (address.postcode) {
      setResultPostcode(address.postcode);
      setPostcode(address.postcode);
    }
    if (address.id == null) return;
    try {
      const res = await api.getAddress(address.id);
      setSelectedAddress(res.data);
    } catch {
      /* keep list item */
    }
  };

  const onPostcodeChange = (value: string) => {
    const next = value.toUpperCase();
    setPostcode(next);
    setDropdownOpen(true);
    setDropdownMode("suggest");
    setSelectedAddress(null);
    if (isCompleteUkPostcode(next)) {
      void runLookup(undefined, next);
    }
  };

  const lat = record?.latitude ?? record?.coordinates?.latitude;
  const lng = record?.longitude ?? record?.coordinates?.longitude;
  const showDropdown = dropdownOpen && postcode.replace(/\s+/g, "").length >= 2;
  const suggestionSubtitle = (item: PostcodeRecord) => {
    const place = item.district || item.admin_district || item.local_authority || item.post_town;
    const region = item.county || item.ceremonial_county || item.region || item.post_town;
    return [place, region].filter(Boolean).join(" · ");
  };

  return <div className="workspace-page postcode-workspace">
    <div className="workspace-heading postcode-page-heading">
      <div>{workspaceEnvironment === "Test" && <div className="welcome-kicker"><span className="live-dot" /> Test environment <span>Demo provider data</span></div>}<h1>Postcode lookup</h1><p>Validate a UK postcode and inspect its geographic and administrative data.</p></div>
      <Button variant="secondary" icon="file" onClick={() => { setPostcode(""); setResultPostcode(""); setAddresses([]); setSelectedAddress(null); setDropdownOpen(false); setDropdownMode("suggest"); setRecord(null); setSuggestionList([]); }}>New lookup</Button>
    </div>

    <form className={`postcode-command ${showDropdown ? "suggestions-visible" : ""}`} onSubmit={(event) => void runLookup(event)}>
      <div className="postcode-command-icon"><Icon name="location" size={22} /></div>
      <label><span>UK POSTCODE</span><input autoFocus value={postcode} onFocus={() => setDropdownOpen(true)} onChange={(event) => onPostcodeChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setDropdownOpen(false); }} placeholder="e.g. SW1A 2AA" autoComplete="off" aria-expanded={showDropdown} aria-controls="postcode-suggestions" /></label>
      {postcode && <button type="button" className="postcode-clear" aria-label="Clear postcode" onClick={() => { setPostcode(""); setDropdownOpen(false); setDropdownMode("suggest"); setSuggestionList([]); setAddresses([]); }}><Icon name="x" size={16} /></button>}
      <Button type="submit" icon={loading ? undefined : "search"} className={loading ? "loading" : ""}>{loading ? "Looking up…" : "Run lookup"}</Button>
      {showDropdown && <div className="postcode-suggestions" id="postcode-suggestions" role="listbox">
        {dropdownMode === "suggest" ? (
          <>
            <div className="postcode-suggestion-label"><span>Suggested postcodes</span><small>{suggestionsLoading ? "Searching…" : `${suggestionList.length} matches`}</small></div>
            {suggestionList.map((item, index) => (
              <button type="button" role="option" aria-selected={item.postcode === postcode} className={item.postcode === postcode ? "selected" : ""} key={item.postcode} onMouseDown={(event) => event.preventDefault()} onClick={() => void runLookup(undefined, item.postcode)}>
                <span className="suggestion-location"><i><Icon name="location" size={16} /></i><span><strong>{item.postcode}</strong><small>{suggestionSubtitle(item)}{item.address_count != null ? ` · ${item.address_count} addresses` : ""}</small></span></span>
                {index === 0 && <Badge tone="blue">Best match</Badge>}
                <Icon name="chevron" size={18} />
              </button>
            ))}
            {!suggestionsLoading && suggestionList.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No matching postcodes</strong><span>Keep typing a UK postcode prefix.</span></div>}
          </>
        ) : (
          <>
            <div className="postcode-suggestion-label"><span>Addresses for {resultPostcode || postcode}</span><small>{addressesLoading && addresses.length === 0 ? "Loading…" : `${addressTotal || addresses.length} matches`}</small></div>
            {addresses.map((address, index) => (
              <button type="button" role="option" aria-selected={selectedAddress?.id === address.id} className={selectedAddress?.id === address.id ? "selected" : ""} key={address.id ?? `${address.line1}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => void selectAddress(address)}>
                <span className="suggestion-location"><i><Icon name="building" size={16} /></i><span><strong>{address.building || address.line1}</strong><small>{address.description || address.full_address || address.postcode}</small></span></span>
                {index === 0 && <Badge tone="blue">Best match</Badge>}
                <Icon name="chevron" size={18} />
              </button>
            ))}
            {!addressesLoading && addresses.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No addresses found</strong><span>Try another postcode.</span></div>}
            {paginationEnabled && hasNextAddresses && (
              <div style={{ padding: "12px 16px" }}>
                <Button variant="secondary" onClick={() => void loadAddresses(resultPostcode || postcode, addressPage + 1, true)} className={addressesLoading ? "loading" : ""}>
                  {addressesLoading ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
        <div className="postcode-suggestion-footer"><span className="suggestion-brand"><span className="logo-mark"><span /></span><strong>Postcode</strong>Pulse</span><span>Address intelligence by PostcodePulse</span></div>
      </div>}
    </form>

    <div className="recent-lookups"><span>Recent</span>{["EC1A 1BB", "M1 1AE", "B1 1TB", "AL1 1AJ"].map((item) => <button key={item} type="button" onClick={() => void runLookup(undefined, item)}>{item}</button>)}</div>

    <div className="postcode-result-head">
      <div><span className="result-status"><Icon name="check" size={14} /> {record || selectedAddress ? "Valid UK postcode" : "Awaiting lookup"}</span><h2>{resultPostcode || "—"}</h2><p>{selectedAddress ? (selectedAddress.full_address || selectedAddress.building || selectedAddress.line1) : record ? `${record.local_authority || record.admin_district}, ${record.post_town} · ${record.country}` : "Enter a postcode to inspect details"}</p></div>
      <div><Button variant="secondary" icon={saved ? "check" : "plus"} onClick={() => void savePostcode()}>{saved ? "Saved" : "Save postcode"}</Button><Button variant="secondary" icon="copy" onClick={copyResponse}>{copied ? "Copied" : "Copy JSON"}</Button></div>
    </div>

    <div className="postcode-intelligence-grid">
      <section className="postcode-map-card">
        <div className="postcode-map-toolbar"><span><i /> Approximate postcode area</span><button type="button" aria-label="Open map view"><Icon name="external" size={16} /></button></div>
        <div className="postcode-map-visual">
          <span className="map-road road-a" /><span className="map-road road-b" /><span className="map-road road-c" />
          <span className="map-water" />
          <span className="map-zone zone-a" /><span className="map-zone zone-b" /><span className="map-zone zone-c" />
          <span className="result-pin"><i><Icon name="location" size={20} /></i><b>{resultPostcode || "—"}</b></span>
          <small>Illustrative map · not for navigation</small>
        </div>
        <div className="coordinate-strip"><div><span>Latitude</span><strong>{lat ?? "—"}</strong></div><div><span>Longitude</span><strong>{lng ?? "—"}</strong></div><button type="button" onClick={() => { if (lat != null && lng != null) navigator.clipboard?.writeText(`${lat}, ${lng}`); }}><Icon name="copy" size={15} /> Copy coordinates</button></div>
      </section>

      <section className="postcode-detail-panel">
        <div className="card-head"><div><span className="card-eyebrow">Location profile</span><h2>{selectedAddress ? "Address details" : "Postcode details"}</h2><p>{selectedAddress ? "Selected provider address" : "Normalised provider response"}</p></div><Badge tone="green">Complete</Badge></div>
        <div className="postcode-data-list">
          {(selectedAddress
            ? [
                ["Address", selectedAddress.full_address || selectedAddress.building || selectedAddress.line1 || "—"],
                ["Description", selectedAddress.description || "—"],
                ["Postcode", selectedAddress.postcode || "—"],
                ["Online ID", selectedAddress.online_id || "—"],
                ["Type", selectedAddress.type || "—"],
                ["Post town", selectedAddress.post_town || record?.post_town || "—"],
                ["Administrative district", record?.admin_district || record?.local_authority || "—"],
                ["Region", record?.region || "—"],
              ]
            : [
                ["Post town", record?.post_town || "—"],
                ["Country", record?.country || "—"],
                ["Region", record?.region || "—"],
                ["Administrative district", record?.admin_district || record?.local_authority || "—"],
                ["Parliamentary constituency", record?.constituency || "—"],
                ["NHS region", record?.nhs_region || "—"],
              ]
          ).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><button type="button" aria-label={`Copy ${label}`} onClick={() => navigator.clipboard?.writeText(String(value))}><Icon name="copy" size={14} /></button></div>)}
        </div>
        {selectedAddress && <button type="button" className="postcode-more" onClick={() => { setDropdownMode("addresses"); setDropdownOpen(true); }}>Choose another address <Icon name="arrow" size={15} /></button>}
        {!selectedAddress && <button type="button" className="postcode-more" onClick={() => document.querySelector(".postcode-technical")?.scrollIntoView({ behavior: "smooth" })}>View technical fields <Icon name="arrow" size={15} /></button>}
      </section>
    </div>

    <div className="postcode-technical">
      <div className="card-head"><div><span className="card-eyebrow">Developer response</span><h2>Technical data</h2><p>Useful fields for validation and routing logic</p></div><Button variant="ghost" icon="copy" onClick={copyResponse}>{copied ? "Copied" : "Copy response"}</Button></div>
      <div className="technical-grid">{[["Outward code", record?.outward || (resultPostcode.split(" ")[0] || "—")], ["Inward code", record?.inward || resultPostcode.split(" ")[1] || "—"], ["Postcode area", record?.area || (resultPostcode.slice(0, 2).replace(/[0-9]/g, "") || "—")], ["Quality", record?.quality || "—"], ["Eastings", record?.eastings ?? "—"], ["Northings", record?.northings ?? "—"]].map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code></div>)}</div>
    </div>
  </div>;
}

type UsageLog = {
  postcode: string;
  location: string;
  project: string;
  endpoint: string;
  status: "200" | "404" | "429";
  outcome: string;
  cost: number;
  time: string;
  latency: string;
  requestId: string;
  environment: "Live" | "Test";
};

function UsageLogsWorkspacePage() {
  const [query, setQuery] = useState("");
  const [environment, setEnvironment] = useState<"All" | "Live" | "Test">("All");
  const [billing, setBilling] = useState<"All" | "Billable" | "Not billed">("All");
  const [selected, setSelected] = useState<UsageLog | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  useEffect(() => {
    api.usageSummary().then((res) => setUsageSummary(res.data)).catch(() => setUsageSummary(null));
  }, []);
  useEffect(() => {
    api.usageLogs({
      query: query || undefined,
      environment: environment === "All" ? undefined : environment,
      billing: billing === "All" ? undefined : billing,
    })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setLogs(rows.map(mapUsageLogRecord));
      })
      .catch(() => setLogs([]));
  }, [query, environment, billing]);
  const visibleLogs = logs.filter((log) =>
    [log.postcode, log.location, log.project, log.endpoint, log.requestId].some((value) => value.toLowerCase().includes(query.toLowerCase()))
  );
  const totalCost = visibleLogs.reduce((sum, log) => sum + log.cost, 0);
  const successful = visibleLogs.filter((log) => log.status === "200").length;
  const billable = visibleLogs.filter((log) => log.cost > 0).length;
  const exportLogs = () => {
    const csv = ["Postcode,Location,Project,Endpoint,Status,Outcome,Cost,Time,Request ID", ...visibleLogs.map((log) => [log.postcode, log.location, log.project, log.endpoint, log.status, log.outcome, log.cost.toFixed(3), log.time, log.requestId].join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "postcode-usage-demo.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <div className="workspace-page usage-logs-page">
    <div className="workspace-heading usage-heading">
      <div><div className="welcome-kicker"><span className="live-dot" /> Request ledger <span>Illustrative billing</span></div><h1>Usage &amp; logs</h1><p>Review postcode searches, request outcomes and the cost of each billable lookup.</p></div>
      <Button variant="secondary" icon="download" onClick={exportLogs}>Export CSV</Button>
    </div>

    <div className="usage-summary-grid">
      <div className="usage-summary-card primary"><span>Total lookup cost</span><strong>£{totalCost.toFixed(3)}</strong><small>Across {visibleLogs.length} visible requests</small><i><Icon name="wallet" /></i></div>
      <div className="usage-summary-card"><span>Test calls</span><strong>{usageSummary?.used_test ?? "—"}</strong><small>This month · Test environment</small><i><Icon name="layers" /></i></div>
      <div className="usage-summary-card"><span>Live calls</span><strong>{usageSummary?.used_live ?? "—"}</strong><small>This month · Live environment</small><i><Icon name="trend" /></i></div>
      <div className="usage-summary-card"><span>Successful searches</span><strong>{successful}</strong><small>{visibleLogs.length ? ((successful / visibleLogs.length) * 100).toFixed(1) : "0.0"}% success rate</small><i><Icon name="check" /></i></div>
      <div className="usage-summary-card"><span>Billable requests</span><strong>{billable}</strong><small>{visibleLogs.length - billable} requests not billed</small><i><Icon name="database" /></i></div>
      <div className="usage-summary-card"><span>Average cost</span><strong>£{billable ? (totalCost / billable).toFixed(3) : "0.000"}</strong><small>Per billable request</small><i><Icon name="trend" /></i></div>
    </div>

    <div className="usage-cost-note"><Icon name="help" /><div><strong>How demo costs are calculated</strong><span>Successful postcode lookups are shown at £0.002 and address lookups at £0.003. Errors and rate-limited requests are not billed.</span></div><button onClick={() => setBilling(billing === "Billable" ? "All" : "Billable")}>{billing === "Billable" ? "Show all requests" : "Show billable only"} <Icon name="arrow" size={15} /></button></div>

    <div className="usage-filter-bar">
      <div className="filter-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search postcode, project or request ID" />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><Icon name="x" size={15} /></button>}</div>
      <button onClick={() => setEnvironment(environment === "All" ? "Live" : environment === "Live" ? "Test" : "All")}><span>Environment</span>{environment}<Icon name="chevron" size={14} /></button>
      <button onClick={() => setBilling(billing === "All" ? "Billable" : billing === "Billable" ? "Not billed" : "All")}><span>Billing</span>{billing}<Icon name="chevron" size={14} /></button>
      <button><Icon name="file" size={15} /> Today</button>
    </div>

    <div className="usage-ledger">
      <div className="usage-ledger-head"><span>Postcode searched</span><span>Project &amp; endpoint</span><span>Response</span><span>Billing outcome</span><span>Time</span><span /></div>
      {visibleLogs.map((log) => <button className={`usage-log-row ${selected?.requestId === log.requestId ? "selected" : ""}`} key={log.requestId} onClick={() => setSelected(log)}>
        <span className="postcode-cell"><i><Icon name="location" size={16} /></i><span><strong>{log.postcode}</strong><small>{log.location}</small></span></span>
        <span className="project-cell"><strong>{log.project}</strong><small>{log.endpoint} · {log.environment}</small></span>
        <span className="response-cell"><Badge tone={log.status === "200" ? "green" : log.status === "429" ? "amber" : "red"}>{log.status}</Badge><small>{log.latency}</small></span>
        <span className="cost-cell"><strong>{log.cost ? `£${log.cost.toFixed(3)}` : "£0.000"}</strong><small className={log.cost ? "billable" : ""}>{log.outcome}</small></span>
        <span className="time-cell"><strong>{log.time.split(", ")[1]}</strong><small>{log.time.split(", ")[0]}</small></span>
        <span className="row-arrow"><Icon name="chevron" size={16} /></span>
      </button>)}
      {visibleLogs.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No matching postcode searches</strong><span>Try changing the search or filters.</span></div>}
      <div className="usage-ledger-footer"><span>Showing {visibleLogs.length} of {logs.length} requests</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
    </div>

    {selected && <div className="log-detail-backdrop" onClick={() => setSelected(null)}>
      <aside className="log-detail-panel" onClick={(event) => event.stopPropagation()}>
        <div className="log-detail-head"><div><span className="result-status"><Icon name="check" size={14} /> Request details</span><h2>{selected.postcode}</h2><p>{selected.requestId}</p></div><button aria-label="Close request details" onClick={() => setSelected(null)}><Icon name="x" /></button></div>
        <div className="log-cost-highlight"><div><span>Charged for this request</span><strong>£{selected.cost.toFixed(3)}</strong></div><Badge tone={selected.cost ? "blue" : "neutral"}>{selected.outcome}</Badge></div>
        <div className="log-detail-section"><h3>Search information</h3>{[["Postcode", selected.postcode], ["Resolved location", selected.location], ["Project", selected.project], ["Environment", selected.environment], ["Endpoint", selected.endpoint]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="log-detail-section"><h3>Request performance</h3>{[["HTTP status", selected.status], ["Latency", selected.latency], ["Requested at", selected.time], ["Request ID", selected.requestId]].map(([label, value]) => <div key={label}><span>{label}</span><strong className={label === "Request ID" ? "mono" : ""}>{value}</strong></div>)}</div>
        <div className="log-billing-rule"><Icon name="wallet" /><div><strong>{selected.cost ? "Billable response" : "No charge applied"}</strong><p>{selected.cost ? "A successful provider record was returned and counted as a billable retrieval." : "Unsuccessful and rate-limited requests are excluded from the illustrative charge."}</p></div></div>
        <Button variant="secondary" icon="copy" onClick={() => navigator.clipboard?.writeText(selected.requestId)}>Copy request ID</Button>
      </aside>
    </div>}
  </div>;
}

function WorkspacePage({ page }: { page: string }) {
  const routerNavigate = useNavigate();
  const info = pageContent[page] || { title: page, subtitle: "Manage this workspace area.", action: "New", icon: "plus" as IconName };
  const [query, setQuery] = useState("");
  const [environment, setEnvironment] = useState("All");
  const [range, setRange] = useState("28 days");
  const [notice, setNotice] = useState("");
  if (page === "Lookup explorer") return <PostcodeWorkspacePage />;
  if (page === "Usage & logs") return <UsageLogsWorkspacePage />;
  if (page === "Billing") return <BillingPage />;
  if (page === "Bulk jobs") return <BulkPage />;
  if (page === "Projects") return <ProjectsPage />;
  if (page === "API keys") return <ApiKeysPage />;
  if (page === "Team") return <TeamPage />;
  if (page === "Support") return <SupportPage />;
  if (page === "API Docs") return <ApiDocsContent embedded onOpenApiKeys={() => routerNavigate(dashboardPath("API keys"))} />;
  if (page === "Settings") return <SettingsPage />;
  return <div className="workspace-page"><div className="workspace-heading"><div><p className="demo-label">WORKSPACE</p><h1>{info.title}</h1><p>{info.subtitle}</p></div><Button icon={info.icon} onClick={() => setNotice(`${info.action} opened`)}>{info.action}</Button></div>{notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}<div className="filter-bar"><div className="filter-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${page.toLowerCase()}`} /></div><Button variant="secondary" onClick={() => setEnvironment(environment === "All" ? "Test" : environment === "Test" ? "Live" : "All")}>Environment: {environment} <Icon name="chevron" /></Button><Button variant="secondary" onClick={() => setRange(range === "28 days" ? "7 days" : range === "7 days" ? "90 days" : "28 days")}>Last {range} <Icon name="chevron" /></Button></div><DemoTable page={page} query={query} refreshKey={notice} /></div>;
}

const adminListPaths: Record<string, string> = {
  Customers: "customers",
  "API operations": "api-operations",
  "Providers & datasets": "providers-datasets",
  Billing: "billing-records",
  "Abuse controls": "abuse-controls",
  Support: "support-queues",
  Content: "content",
  "Audit log": "audit-log",
  "Staff settings": "staff-settings",
};

function DemoTable({ page, query = "", refreshKey = "" }: { page: string; query?: string; refreshKey?: string }) {
  const [headers, setHeaders] = useState(["Name / project", "Type / endpoint", "Status", "Last used / latency", "Identifier"]);
  const [rows, setRows] = useState<string[][]>([]);
  const [totalLabel, setTotalLabel] = useState("demo records");
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (page === "Projects") {
          const res = await api.projects();
          if (cancelled) return;
          setHeaders(["Project", "Environment", "Requests", "Status", "Identifier"]);
          setRows(res.data.map((p) => [p.name, p.environment, String(p.request_count), "Active", `#${p.id}`]));
          setTotalLabel("projects");
          return;
        }
        if (page === "API keys") {
          const res = await api.apiKeys();
          if (cancelled) return;
          setHeaders(["Name", "Project", "Type", "Environment", "Key prefix"]);
          setRows(res.data.map((k) => [k.name, k.project || "—", k.type, k.environment, k.key_prefix]));
          setTotalLabel("API keys");
          return;
        }
        if (page === "Team") {
          const res = await api.team();
          if (cancelled) return;
          setHeaders(["Name", "Role", "Status", "Last active", "Email"]);
          setRows(res.data.map((m) => [m.name, m.role, m.status || "Active", "—", m.email]));
          setTotalLabel("team members");
          return;
        }
        if (page === "Saved lists") {
          await api.savedLists();
          if (cancelled) return;
          setHeaders(["List", "Items", "Updated", "Environment", "Identifier"]);
          setRows([]);
          setTotalLabel("saved lists");
          return;
        }
        if (adminListPaths[page]) {
          const res = page === "Customers"
            ? await api.adminCustomers()
            : await api.adminList(adminListPaths[page]);
          if (cancelled) return;
          if (page === "Customers") {
            setHeaders(["Organisation", "Plan", "Balance", "Monthly spend", "Identifier"]);
            setRows((res.data as AuthOrganisation[]).map((org) => [org.name, org.plan, formatMoney(org.credit_balance), formatMoney(org.monthly_spend), `#${org.id}`]));
          } else {
            const records = res.data as Record<string, unknown>[];
            const keys = records[0] ? Object.keys(records[0]).slice(0, 5) : ["Name", "Status", "Updated", "Owner", "Identifier"];
            setHeaders(keys.map((k) => k.replace(/_/g, " ")));
            setRows(records.map((row) => keys.map((k) => String(row[k] ?? "—"))));
          }
          setTotalLabel(`${page.toLowerCase()} records`);
          return;
        }
        if (cancelled) return;
        setHeaders(["Name / project", "Type / endpoint", "Status", "Last used / latency", "Identifier"]);
        setRows([]);
        setTotalLabel("records");
      } catch {
        if (!cancelled) setRows([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [page, refreshKey]);
  const visibleRows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(query.toLowerCase())));
  return <div className="table-card"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}<th /></tr></thead><tbody>{visibleRows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === 2 && (cell === "429" || cell === "404" || cell === "Invited" || cell === "Active" || cell === "Operational" || cell === "Degraded") ? <Badge tone={cell === "429" || cell === "Invited" ? "amber" : cell === "404" ? "red" : "green"}>{cell}</Badge> : cell}</td>)}<td><button aria-label={`Open actions for ${row[0]}`}><Icon name="more" /></button></td></tr>)}</tbody></table>{visibleRows.length === 0 && <div className="empty-table"><Icon name="search" /><strong>No matching records</strong><span>Try a different search term.</span></div>}<div className="table-footer"><span>Showing {visibleRows.length} {totalLabel}</span><div><button disabled>Previous</button><button disabled={visibleRows.length < 4}>Next</button></div></div></div>;
}

function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"Test" | "Live">(getWorkspaceEnvironment());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createProject(name.trim(), environment);
      setNotice("Project created successfully");
      setName("");
      setShowForm(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">YOUR WORKSPACE</p>
          <h1>Projects</h1>
          <p>Separate environments, usage controls and credentials.</p>
        </div>
        <Button icon="plus" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "New project"}</Button>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {showForm && (
        <form className="dash-card workspace-form" onSubmit={(event) => void create(event)}>
          <div className="card-head"><div><h2>Create project</h2><p>Projects organise API keys and usage</p></div></div>
          <div className="form-row">
            <label><span>Project name</span><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Checkout" /></label>
            <label><span>Environment</span>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as "Test" | "Live")}>
                <option value="Test">Test</option>
                <option value="Live">Live</option>
              </select>
            </label>
          </div>
          <Button type="submit" icon="check">{saving ? "Creating…" : "Create project"}</Button>
        </form>
      )}
      <div className="filter-bar">
        <div className="filter-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" /></div>
      </div>
      <DemoTable page="Projects" query={query} refreshKey={String(refreshKey)} />
    </div>
  );
}

function ApiKeysPage() {
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"Restricted" | "Secret">("Restricted");
  const [environment, setEnvironment] = useState<"Test" | "Live">(getWorkspaceEnvironment());
  const [projectId, setProjectId] = useState<number | "">("");
  const [plainKey, setPlainKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.projects()
      .then((res) => {
        setProjects(res.data);
        setProjectId((current) => current === "" && res.data[0] ? res.data[0].id : current);
      })
      .catch(() => setProjects([]));
  }, [refreshKey]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (projectId === "") {
      setError("Select a project for this key");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.createApiKey({
        name: name.trim(),
        type,
        environment,
        project_id: Number(projectId),
      });
      setPlainKey(res.data.plain_key || "");
      setNotice("API key created successfully");
      setName("");
      setShowForm(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create API key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">CREDENTIALS</p>
          <h1>API keys</h1>
          <p>Create and restrict credentials for each project and environment.</p>
        </div>
        <Button icon="key" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Create key"}</Button>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {plainKey && (
        <div className="inline-notice">
          <Icon name="key" />
          <span>Copy this key now — it will not be shown again: <code>{plainKey}</code></span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(plainKey)}>Copy</button>
          <button aria-label="Dismiss" onClick={() => setPlainKey("")}><Icon name="x" size={15} /></button>
        </div>
      )}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {showForm && (
        <form className="dash-card workspace-form" onSubmit={(event) => void create(event)}>
          <div className="card-head"><div><h2>Create API key</h2><p>Keys must belong to a project in your organisation</p></div></div>
          <div className="form-row">
            <label><span>Key name</span><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Checkout live" /></label>
            <label><span>Project</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")} required>
                <option value="">Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.environment}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label><span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as "Restricted" | "Secret")}>
                <option value="Restricted">Restricted</option>
                <option value="Secret">Secret</option>
              </select>
            </label>
            <label><span>Environment</span>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as "Test" | "Live")}>
                <option value="Test">Test</option>
                <option value="Live">Live</option>
              </select>
            </label>
          </div>
          <Button type="submit" icon="check" disabled={!projects.length}>{saving ? "Creating…" : "Create key"}</Button>
        </form>
      )}
      <div className="filter-bar">
        <div className="filter-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search API keys" /></div>
      </div>
      <DemoTable page="API keys" query={query} refreshKey={String(refreshKey)} />
    </div>
  );
}

function TeamPage() {
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.inviteTeamMember({ name: name.trim(), email: email.trim(), role, password });
      setNotice("Team member added");
      setName("");
      setEmail("");
      setPassword("");
      setRole("Developer");
      setShowForm(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add team member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">ACCESS</p>
          <h1>Team</h1>
          <p>Manage roles, invitations and access for your organisation.</p>
        </div>
        <Button icon="people" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Invite colleague"}</Button>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {showForm && (
        <form className="dash-card workspace-form" onSubmit={(event) => void invite(event)}>
          <div className="card-head"><div><h2>Add team member</h2><p>Creates access for a new or existing user in your organisation</p></div></div>
          <div className="form-row">
            <label><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          </div>
          <div className="form-row">
            <label><span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Developer">Developer</option>
              </select>
            </label>
            <label><span>Temporary password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
          </div>
          <Button type="submit" icon="check">{saving ? "Adding…" : "Add member"}</Button>
        </form>
      )}
      <div className="filter-bar">
        <div className="filter-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team" /></div>
      </div>
      <DemoTable page="Team" query={query} refreshKey={String(refreshKey)} />
    </div>
  );
}

function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.supportTickets();
      setTickets(res.data);
    } catch {
      setTickets([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createSupportTicket({ subject: subject.trim(), body: body.trim() });
      setNotice("Support ticket created");
      setSubject("");
      setBody("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">HELP</p>
          <h1>Support</h1>
          <p>Get help with an integration or request.</p>
        </div>
        <Button icon="help" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Create ticket"}</Button>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {showForm && (
        <form className="dash-card workspace-form" onSubmit={(event) => void create(event)}>
          <div className="card-head"><div><h2>New support ticket</h2><p>Visible to your organisation</p></div></div>
          <label><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} required /></label>
          <label><span>Message</span><textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required /></label>
          <Button type="submit" icon="check">{saving ? "Sending…" : "Submit ticket"}</Button>
        </form>
      )}
      <div className="table-card">
        <table>
          <thead><tr><th>Subject</th><th>Status</th><th>Raised by</th><th>Created</th><th /></tr></thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td><strong>{ticket.subject}</strong><div><small>{ticket.body.slice(0, 80)}{ticket.body.length > 80 ? "…" : ""}</small></div></td>
                <td><Badge tone={ticket.status === "open" ? "amber" : "green"}>{ticket.status}</Badge></td>
                <td>{ticket.user?.name || "—"}</td>
                <td>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <div className="empty-table"><Icon name="help" /><strong>No support tickets yet</strong><span>Create a ticket to contact the team.</span></div>}
      </div>
    </div>
  );
}

function SettingsPage() {
  const currentUser = getUser();
  const currentOrg = getOrganisation();
  const [firstName, setFirstName] = useState(currentUser?.first_name || "");
  const [lastName, setLastName] = useState(currentUser?.last_name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [organisationName, setOrganisationName] = useState(currentOrg?.name || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.me().then((res) => {
      updateUser(res.data.user);
      updateOrganisation(res.data.organisation);
      setFirstName(res.data.user.first_name || "");
      setLastName(res.data.user.last_name || "");
      setEmail(res.data.user.email);
      setOrganisationName(res.data.organisation?.name || "");
    }).catch(() => undefined);
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        organisation_name: organisationName.trim() || undefined,
        password: password || undefined,
      });
      updateUser(res.data.user);
      updateOrganisation(res.data.organisation);
      setPassword("");
      setNotice("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">ACCOUNT</p>
          <h1>Settings</h1>
          <p>Update your profile and organisation details.</p>
        </div>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      <form className="dash-card workspace-form" onSubmit={(event) => void save(event)}>
        <div className="card-head"><div><h2>Profile</h2><p>These details appear across your workspace</p></div></div>
        <div className="form-row">
          <label><span>First name</span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label>
          <label><span>Last name</span><input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></label>
        </div>
        <div className="form-row">
          <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label><span>Organisation name</span><input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} /></label>
        </div>
        <label><span>New password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Leave blank to keep current password" /></label>
        <Button type="submit" icon="check">{saving ? "Saving…" : "Save changes"}</Button>
      </form>
    </div>
  );
}

function packageRequiresPayment(pkg: PricingPackageRecord | undefined) {
  if (!pkg || pkg.amount == null) return false;
  return Number(pkg.amount) > 0;
}

function BillingPage() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof api.billing>>["data"] | null>(null);
  const [packages, setPackages] = useState<PricingPackageRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [plan, setPlan] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false);
  const [autoTopupAmount, setAutoTopupAmount] = useState("");
  const [autoTopupCap, setAutoTopupCap] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const applyBilling = (data: Awaited<ReturnType<typeof api.billing>>["data"]) => {
    setBilling(data);
    updateOrganisation(data.organisation);
    setPlan(data.summary.plan || data.organisation.plan || "");
    setBillingName(data.organisation.billing_name || "");
    setBillingPhone(data.organisation.billing_phone || "");
    setVatNumber(data.organisation.vat_number || "");
    setAutoTopupEnabled(Boolean(data.summary.auto_topup_enabled));
    setAutoTopupAmount(data.summary.auto_topup_amount == null ? "" : String(data.summary.auto_topup_amount));
    setAutoTopupCap(data.summary.auto_topup_cap == null ? "" : String(data.summary.auto_topup_cap));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = (params.get("status") || "").toLowerCase();
    const paymentFailed = status === "failure" || status === "failed" || status === "error";
    if (status === "success") {
      setNotice("Payment successful. Your plan has been updated.");
    } else if (paymentFailed) {
      setError(params.get("message") || "Payment failed or was cancelled.");
    }

    api.billing().then((res) => applyBilling(res.data)).catch(() => setBilling(null));
    api.pricingPackages()
      .then((res) => setPackages(res.data))
      .catch((err) => {
        setPackages([]);
        if (!paymentFailed) {
          setError(err instanceof ApiError ? err.message : "Could not load pricing plans");
        }
      });
    api.usageSummary().then((res) => setUsageSummary(res.data)).catch(() => setUsageSummary(null));
  }, [location.search]);

  const currentPlanSlug = billing?.summary.plan || billing?.organisation.plan || "";
  const purchasablePackages = packages.filter((pkg) => Number(pkg.amount) > 0);
  const selectedPackage = packages.find((pkg) => pkg.slug === plan);
  const currentPackage = packages.find((pkg) => pkg.slug === currentPlanSlug);
  const currentIsPurchasable = packageRequiresPayment(currentPackage);
  const selectedIsPaid = packageRequiresPayment(selectedPackage);
  const saveStartsCheckout = selectedIsPaid;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (saveStartsCheckout && !billingPhone.trim()) {
        setError("Please add a valid billing phone number before purchasing a plan.");
        return;
      }

      const payload: Parameters<typeof api.updateBilling>[0] = {
        billing_name: billingName.trim() || null,
        billing_phone: billingPhone.trim() || null,
        vat_number: vatNumber.trim() || null,
        auto_topup_enabled: autoTopupEnabled,
        auto_topup_amount: autoTopupAmount === "" ? null : Number(autoTopupAmount),
        auto_topup_cap: autoTopupCap === "" ? null : Number(autoTopupCap),
      };

      const res = await api.updateBilling(payload);
      applyBilling(res.data);

      if (saveStartsCheckout && selectedPackage) {
        routerNavigate(`/dashboard/billing/checkout?package_id=${selectedPackage.id}`);
        return;
      }

      setNotice("Billing settings saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not update billing");
    } finally {
      setSaving(false);
    }
  };

  const org = billing?.organisation;
  const summary = billing?.summary;
  const balance = formatMoney(summary?.available_balance ?? org?.credit_balance);
  const monthly = formatMoney(summary?.monthly_spend ?? org?.monthly_spend);
  const renewal = summary?.next_renewal || "—";
  const hasCard = Boolean(org?.card_brand && org?.card_last4);
  const cardLabel = hasCard ? `${org?.card_brand} ending ${org?.card_last4}` : "No payment method on file";
  const cardExpiry = org?.card_expires || null;
  const displayPackage = selectedPackage || currentPackage;
  const autoAmount = formatMoney(summary?.auto_topup_amount ?? org?.auto_topup_amount, 0);
  const autoCap = formatMoney(summary?.auto_topup_cap ?? org?.auto_topup_cap, 0);
  const saveLabel = saving
    ? (saveStartsCheckout ? "Opening checkout…" : "Saving…")
    : "Billing And Checkout";

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">COMMERCIAL TERMS</p>
          <h1>Billing</h1>
          <p>Credits, subscription, payment methods and invoices.</p>
        </div>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      <div className="billing-hero">
        <div><span>AVAILABLE BALANCE</span><strong>{balance}</strong><p>{autoTopupEnabled ? `Auto top-up is on at ${autoAmount} · ${autoCap} monthly cap` : "Auto top-up is off"}</p></div>
        <div><span>THIS MONTH</span><strong>{monthly}</strong><p>Billable retrievals this period</p></div>
        <div><span>API CALLS</span><strong>{usageSummary ? `${usageSummary.used}${usageSummary.limit == null ? "" : ` / ${usageSummary.limit}`}` : "—"}</strong><p>{usageSummary ? `Test ${usageSummary.used_test} · Live ${usageSummary.used_live}${usageSummary.limit == null ? " · Unlimited" : ` · ${usageSummary.remaining ?? 0} remaining`}` : "Loading usage…"}</p></div>
        <div><span>NEXT RENEWAL</span><strong>{renewal}</strong><p>{displayPackage?.name || plan || "Plan"} · {displayPackage?.price_display || "Custom"}{displayPackage?.monthly_api_calls != null ? ` · ${displayPackage.monthly_api_calls.toLocaleString()}/mo` : ""}</p></div>
      </div>
      <div className="dashboard-grid">
        <form className="dash-card workspace-form" onSubmit={(event) => void save(event)}>
          <div className="card-head"><div><h2>Plan & billing details</h2><p>Choose a plan and keep VAT details current</p></div></div>
          <label><span>Plan</span>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} required={purchasablePackages.length > 0}>
              {purchasablePackages.length === 0 && !currentPackage ? (
                <option value={plan || ""}>{plan || "No paid packages"}</option>
              ) : (
                <option value="">Select a plan</option>
              )}
              {currentPackage && !currentIsPurchasable && (
                <option value={currentPlanSlug} disabled>
                  {currentPackage.name} · {currentPackage.price_display} (current)
                </option>
              )}
              {purchasablePackages.map((pkg) => (
                <option key={pkg.id} value={pkg.slug}>
                  {pkg.name} · {pkg.price_display}{pkg.slug === currentPlanSlug ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
          {saveStartsCheckout && (
            <p className="form-hint">Paid plans require checkout. Saving opens the checkout page so you can accept terms before payment.</p>
          )}
          <div className="form-row">
            <label><span>Billing name</span><input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Company billing name" /></label>
            <label><span>VAT number</span><input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="Optional" /></label>
          </div>
          <label><span>Billing phone</span><input value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} placeholder="Required for paid checkout" required={saveStartsCheckout} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={autoTopupEnabled} onChange={(e) => setAutoTopupEnabled(e.target.checked)} /> Enable auto top-up</label>
          <div className="form-row">
            <label><span>Auto top-up amount</span><input type="number" min="0" step="0.01" value={autoTopupAmount} onChange={(e) => setAutoTopupAmount(e.target.value)} disabled={!autoTopupEnabled} /></label>
            <label><span>Monthly cap</span><input type="number" min="0" step="0.01" value={autoTopupCap} onChange={(e) => setAutoTopupCap(e.target.value)} disabled={!autoTopupEnabled} /></label>
          </div>
          <div className="form-actions-row">
            <Button type="submit" icon={saveStartsCheckout ? "arrow" : "check"}>{saveLabel}</Button>
          </div>
        </form>
        <div className="dash-card payment-card">
          <div className="card-head"><div><h2>Payment method</h2><p>Used for plan and automatic top-ups</p></div></div>
          {hasCard ? (
            <div><span className="card-chip" /><strong>{cardLabel}</strong>{cardExpiry && <small>Expires {cardExpiry}</small>}<Badge tone="green">Default</Badge></div>
          ) : (
            <div><strong>{cardLabel}</strong><small>Checkout opens LotPayment hosted payment pages</small></div>
          )}
          <hr />
          <h3>Billing details</h3>
          <p>{billingName || org?.name || "Organisation"}{billingPhone ? <><br />{billingPhone}</> : null}{vatNumber ? <><br />{vatNumber}</> : <><br />No VAT number set</>}</p>
        </div>
      </div>
    </div>
  );
}

function BillingCheckoutPage() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [packages, setPackages] = useState<PricingPackageRecord[]>([]);
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof api.billing>>["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCharge, setAcceptCharge] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const packageIdParam = new URLSearchParams(location.search).get("package_id");
  const selectedPackageId = Number(packageIdParam);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.pricingPackages(), api.billing()])
      .then(([packagesRes, billingRes]) => {
        if (cancelled) return;

        const list = packagesRes.data;
        setPackages(list);
        setBilling(billingRes.data);
        updateOrganisation(billingRes.data.organisation);

        const preferredId = Number.isFinite(selectedPackageId) && selectedPackageId > 0
          ? selectedPackageId
          : null;
        const selected = preferredId == null ? null : list.find((pkg) => pkg.id === preferredId);

        if (!selected || !packageRequiresPayment(selected)) {
          routerNavigate(dashboardPath("Billing"), { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          routerNavigate(dashboardPath("Billing"), { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routerNavigate, selectedPackageId]);

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const currentPlanSlug = billing?.summary.plan || billing?.organisation.plan || "";
  const isCurrentPlan = selectedPackage != null && selectedPackage.slug === currentPlanSlug;
  const termsAccepted = acceptTerms && acceptCharge;
  const org = billing?.organisation;
  const periodLabel = selectedPackage?.billing_period === "year" || selectedPackage?.billing_period === "yearly"
    ? "yearly"
    : selectedPackage?.billing_period === "month" || selectedPackage?.billing_period === "monthly"
      ? "monthly"
      : "one-time";

  const startPurchase = async () => {
    if (!selectedPackage || !termsAccepted || paying) return;

    setPaying(true);
    setError("");
    try {
      const purchaseRes = await api.purchaseBillingPlan(selectedPackage.id);
      const data = purchaseRes.data;

      if (data.redirect_method === "redirect" && data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }

      if (data.redirect_method === "form_post" && data.payment_action_url && data.payment_fields) {
        const { submitPaymentForm } = await import("./lib/lotPayment");
        await submitPaymentForm(
          data.payment_action_url,
          data.payment_fields,
          data.payment_checkout_url,
        );
        return;
      }

      setError("Checkout could not be started. Please try again.");
      setPaying(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not complete purchase");
      setPaying(false);
    }
  };

  if (loading || !selectedPackage) {
    return (
      <div className="workspace-page billing-checkout-page">
        <div className="workspace-heading">
          <div>
            <p className="demo-label">CHECKOUT</p>
            <h1>Checkout</h1>
            <p>Loading your order…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page billing-checkout-page">
      <div className="workspace-heading">
        <div>
          <button type="button" className="back-link" onClick={() => routerNavigate(dashboardPath("Billing"))}>
            <Icon name="arrow" /> Back to billing
          </button>
          <p className="demo-label">CHECKOUT</p>
          <h1>Checkout</h1>
          <p>Review your order and accept the terms before paying.</p>
        </div>
      </div>

      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="card-head"><div><h2>Order summary</h2><p>Selected plan for this organisation</p></div></div>
          <div className="checkout-order-summary">
            <div>
              <span className="demo-label">PLAN</span>
              <strong>{selectedPackage.name}</strong>
              {selectedPackage.tagline ? <p>{selectedPackage.tagline}</p> : null}
            </div>
            <div className="checkout-order-price">
              <strong>{selectedPackage.price_display}</strong>
              <small>{periodLabel} billing</small>
            </div>
          </div>
          {selectedPackage.features.length > 0 && (
            <ul className="checkout-feature-list">
              {selectedPackage.features.slice(0, 5).map((feature) => (
                <li key={feature}><Icon name="check" size={15} /><span>{feature}</span></li>
              ))}
            </ul>
          )}
          {isCurrentPlan && (
            <p className="form-hint">You are already on this plan. Paying again renews your subscription through LotPayment.</p>
          )}
        </div>

        <div className="dash-card payment-card">
          <div className="card-head"><div><h2>Billing details</h2><p>Charged using your saved billing contact</p></div></div>
          <p>
            {org?.billing_name || org?.name || "Organisation"}
            {org?.billing_phone ? <><br />{org.billing_phone}</> : null}
            {org?.vat_number ? <><br />{org.vat_number}</> : <><br />No VAT number set</>}
          </p>
        </div>
      </div>

      <div className="dash-card workspace-form checkout-terms-card">
        <div className="card-head"><div><h2>Terms &amp; Conditions</h2><p>Accept both items to enable Online Payment</p></div></div>
        <label className="checkbox-row checkout-terms-row">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>
            I&apos;ve read and accept LookupPostcode&apos;s{" "}
            <button type="button" className="inline-text-link" onClick={() => window.open(pathFor("terms"), "_blank", "noopener,noreferrer")}>Terms of Service</button>
            {" "}and the{" "}
            <button type="button" className="inline-text-link" onClick={() => window.open(pathFor("privacy"), "_blank", "noopener,noreferrer")}>Privacy Policy</button>.
          </span>
        </label>
        <label className="checkbox-row checkout-terms-row">
          <input type="checkbox" checked={acceptCharge} onChange={(e) => setAcceptCharge(e.target.checked)} />
          <span>
            I acknowledge and agree that my payment method will be charged{" "}
            <strong>{selectedPackage.price_display}</strong> for the{" "}
            <strong>{selectedPackage.name}</strong> {periodLabel} subscription, unless I cancel through
            my account settings before renewal.
          </span>
        </label>
      </div>

      <div className="dash-card checkout-pay-card">
        <div className="card-head"><div><h2>Payment method</h2><p>Accept both terms above to enable payment.</p></div></div>
        <div className="form-actions-row">
          <Button
            icon="wallet"
            disabled={!termsAccepted || paying || !packageRequiresPayment(selectedPackage)}
            onClick={() => void startPurchase()}
          >
            {paying ? "Redirecting…" : `${isCurrentPlan ? "Renew Online" : "Online Payment"} · ${selectedPackage.price_display}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkPage() {
  const [step, setStep] = useState(1);
  const [jobId, setJobId] = useState<number | null>(null);
  const continueStep = async () => {
    if (step === 1) {
      const res = await api.createBulkJob({ filename: "demo.csv" });
      setJobId(res.data.id);
      setStep(2);
      return;
    }
    if (jobId != null) {
      await api.updateBulkJob(jobId, { step: step + 1, mapped_column: step === 2 ? "delivery_postcode" : undefined });
    }
    setStep(Math.min(3, step + 1));
  };
  return <div className="workspace-page"><div className="workspace-heading"><div><p className="demo-label">DATASET PERMISSIONS APPLY</p><h1>New bulk job</h1><p>Validate input, estimate cost, then process.</p></div></div><div className="bulk-steps">{["Upload", "Map fields", "Validate", "Estimate", "Process", "Results"].map((s, i) => <div className={step >= i + 1 ? "active" : ""} key={s}><span>{step > i + 1 ? <Icon name="check" size={14} /> : i + 1}</span><small>{s}</small></div>)}</div><div className="bulk-card"><div className="upload-illustration"><span className="sheet sheet-a" /><span className="sheet sheet-b" /><span className="upload-orb"><Icon name="upload" size={28} /></span></div><h2>{step === 1 ? "Upload your CSV file" : step === 2 ? "Map your postcode column" : "Ready to validate"}</h2><p>{step === 1 ? "Use UTF-8 CSV. Maximum demo file size 25 MB." : "We found a likely match: delivery_postcode."}</p>{step === 1 && <button className="dropzone"><Icon name="upload" /><strong>Choose a file</strong><span>or drag and drop it here</span></button>}{step === 2 && <div className="mapping-row"><span>delivery_postcode</span><Icon name="arrow" /><strong>Postcode</strong><Badge tone="green">Matched</Badge></div>}<div className="bulk-actions"><Button variant="secondary" onClick={() => setStep(Math.max(1, step - 1))}>Back</Button><Button onClick={() => void continueStep()} icon="arrow">{step === 1 ? "Continue with demo file" : "Continue"}</Button></div></div></div>;
}

const adminNavContent: Record<string, string> = {
  Customers: "Search organisations, balances, account status and support history.",
  "API operations": "Inspect endpoint health, rate limits and sanitised diagnostics.",
  "Providers & datasets": "Manage provider compatibility, entitlements, quotas and licence rules.",
  Billing: "Review orders, payments, refunds and append-only credit adjustments.",
  Pricing: "Create and update public pricing packages, currency, amounts and feature lists.",
  "Abuse controls": "Investigate unusual usage and apply time-limited restrictions.",
  Support: "Assign queues, add internal notes and manage customer replies.",
  Content: "Draft, preview and publish help and incident content.",
  "Audit log": "Review append-only staff and customer-impacting actions.",
  "Staff settings": "Manage internal roles, MFA status and active sessions.",
};

function emptyPricingForm(): PricingPackagePayload & { featuresText: string; amountInput: string; monthlyApiCallsInput: string } {
  return {
    name: "",
    slug: "",
    tagline: "",
    currency: "GBP",
    amount: null,
    amountInput: "",
    amount_prefix: "",
    billing_period: "",
    custom_price_label: "",
    featuresText: "",
    cta_label: "Choose option",
    cta_target: "create-account",
    is_featured: false,
    sort_order: 0,
    is_active: true,
    monthly_api_calls: null,
    monthlyApiCallsInput: "",
  };
}

function slugifyPackageName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminPricing() {
  const [packages, setPackages] = useState<PricingPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPricingForm());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminPricingPackages();
      setPackages(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load pricing packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyPricingForm());
    setNotice("");
    setError("");
  };

  const startEdit = (pkg: PricingPackageRecord) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      tagline: pkg.tagline || "",
      currency: pkg.currency,
      amount: pkg.amount === null || pkg.amount === undefined ? null : Number(pkg.amount),
      amountInput: pkg.amount === null || pkg.amount === undefined ? "" : String(pkg.amount),
      amount_prefix: pkg.amount_prefix || "",
      billing_period: pkg.billing_period || "",
      custom_price_label: pkg.custom_price_label || "",
      featuresText: (pkg.features || []).join("\n"),
      cta_label: pkg.cta_label,
      cta_target: pkg.cta_target,
      is_featured: pkg.is_featured,
      sort_order: pkg.sort_order,
      is_active: pkg.is_active,
      monthly_api_calls: pkg.monthly_api_calls,
      monthlyApiCallsInput: pkg.monthly_api_calls == null ? "" : String(pkg.monthly_api_calls),
    });
    setNotice("");
    setError("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload: PricingPackagePayload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugifyPackageName(form.name),
      tagline: form.tagline?.trim() || null,
      currency: form.currency.trim().toUpperCase(),
      amount: form.amountInput.trim() === "" ? null : Number(form.amountInput),
      amount_prefix: form.amount_prefix?.trim() || null,
      billing_period: form.billing_period || null,
      custom_price_label: form.custom_price_label?.trim() || null,
      features: form.featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      cta_label: form.cta_label.trim(),
      cta_target: form.cta_target,
      is_featured: Boolean(form.is_featured),
      sort_order: Number(form.sort_order) || 0,
      is_active: Boolean(form.is_active),
      monthly_api_calls: form.monthlyApiCallsInput.trim() === "" ? null : Number(form.monthlyApiCallsInput),
    };

    try {
      if (editingId) {
        await api.updatePricingPackage(editingId, payload);
        setNotice("Package updated.");
      } else {
        await api.createPricingPackage(payload);
        setNotice("Package created.");
      }
      await load();
      if (!editingId) startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (pkg: PricingPackageRecord) => {
    if (!window.confirm(`Delete pricing package “${pkg.name}”?`)) return;
    setError("");
    try {
      await api.deletePricingPackage(pkg.id);
      if (editingId === pkg.id) startCreate();
      setNotice("Package deleted.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">INTERNAL · PRICING CATALOGUE</p>
          <h1>Pricing</h1>
          <p>{adminNavContent.Pricing}</p>
        </div>
        <Button icon="plus" onClick={startCreate}>New package</Button>
      </div>
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span></div>}
      <div className="admin-pricing-layout">
        <div className="dash-card admin-pricing-list">
          <div className="card-head"><div><h2>Packages</h2><p>Ordered for the public pricing page</p></div></div>
          {loading && <p className="pricing-load-status">Loading…</p>}
          {!loading && packages.map((pkg) => (
            <div className={`admin-pricing-row ${editingId === pkg.id ? "active" : ""}`} key={pkg.id}>
              <div>
                <strong>{pkg.name}</strong>
                <small>{pkg.price_display} · {pkg.currency} · {pkg.monthly_api_calls == null ? "Unlimited calls" : `${pkg.monthly_api_calls.toLocaleString()}/mo`}{pkg.is_featured ? " · Popular" : ""}{pkg.is_active ? "" : " · Inactive"}</small>
              </div>
              <div>
                <Button variant="secondary" onClick={() => startEdit(pkg)}>Edit</Button>
                <Button variant="ghost" onClick={() => void remove(pkg)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
        <form className="dash-card admin-pricing-form" onSubmit={save}>
          <div className="card-head"><div><h2>{editingId ? "Edit package" : "Create package"}</h2><p>Currency, amount and display fields</p></div></div>
          <div className="form-row">
            <label><span>Name</span><input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value, slug: prev.slug || slugifyPackageName(e.target.value) }))} required /></label>
            <label><span>Slug</span><input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} required /></label>
          </div>
          <label><span>Tagline</span><input value={form.tagline || ""} onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))} /></label>
          <div className="form-row">
            <label><span>Currency</span><input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} maxLength={3} required /></label>
            <label><span>Amount</span><input type="number" min="0" step="0.01" value={form.amountInput} onChange={(e) => setForm((prev) => ({ ...prev, amountInput: e.target.value }))} placeholder="Leave blank for custom label" /></label>
          </div>
          <div className="form-row">
            <label><span>Amount prefix</span><input value={form.amount_prefix || ""} onChange={(e) => setForm((prev) => ({ ...prev, amount_prefix: e.target.value }))} placeholder="From" /></label>
            <label><span>Billing period</span>
              <select value={form.billing_period || ""} onChange={(e) => setForm((prev) => ({ ...prev, billing_period: e.target.value }))}>
                <option value="">None</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="one_time">One time</option>
              </select>
            </label>
          </div>
          <label><span>Custom price label</span><input value={form.custom_price_label || ""} onChange={(e) => setForm((prev) => ({ ...prev, custom_price_label: e.target.value }))} placeholder="Let's talk" /></label>
          <label><span>Features (one per line)</span><textarea rows={5} value={form.featuresText} onChange={(e) => setForm((prev) => ({ ...prev, featuresText: e.target.value }))} /></label>
          <div className="form-row">
            <label><span>CTA label</span><input value={form.cta_label} onChange={(e) => setForm((prev) => ({ ...prev, cta_label: e.target.value }))} required /></label>
            <label><span>CTA target</span>
              <select value={form.cta_target} onChange={(e) => setForm((prev) => ({ ...prev, cta_target: e.target.value as "create-account" | "contact" }))}>
                <option value="create-account">Create account</option>
                <option value="contact">Contact</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label><span>Sort order</span><input type="number" min="0" value={form.sort_order ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} /></label>
            <label><span>Monthly API calls</span><input type="number" min="0" value={form.monthlyApiCallsInput} onChange={(e) => setForm((prev) => ({ ...prev, monthlyApiCallsInput: e.target.value }))} placeholder="Blank = unlimited" /></label>
          </div>
          <div className="admin-pricing-flags">
            <label><input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))} /> Popular / featured</label>
            <label><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active on public page</label>
          </div>
          <Button type="submit" icon="check">{saving ? "Saving…" : editingId ? "Save changes" : "Create package"}</Button>
        </form>
      </div>
    </div>
  );
}

function AdminCustomers() {
  const [customers, setCustomers] = useState<AuthOrganisation[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "active" | "disabled">("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<AuthOrganisation | null>(null);
  const [credentialsOrg, setCredentialsOrg] = useState<AuthOrganisation | null>(null);
  const [members, setMembers] = useState<AdminCustomerUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminCustomerUser | null>(null);
  const [orgForm, setOrgForm] = useState({
    name: "",
    plan: "",
    billing_name: "",
    vat_number: "",
    credit_balance: "",
    monthly_spend: "",
    is_active: true,
  });
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "Developer",
    is_active: true,
    password: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminCustomers({
        query: query || undefined,
        status: statusFilter === "All" ? undefined : statusFilter,
      });
      setCustomers(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, statusFilter]);

  const openEdit = (customer: AuthOrganisation) => {
    setCredentialsOrg(null);
    setSelectedUser(null);
    setEditing(customer);
    setOrgForm({
      name: customer.name || "",
      plan: customer.plan || "",
      billing_name: customer.billing_name || "",
      vat_number: customer.vat_number || "",
      credit_balance: String(customer.credit_balance ?? ""),
      monthly_spend: String(customer.monthly_spend ?? ""),
      is_active: customer.is_active !== false,
    });
    setNotice("");
    setError("");
  };

  const saveCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.updateAdminCustomer(editing.id, {
        name: orgForm.name.trim(),
        plan: orgForm.plan.trim(),
        billing_name: orgForm.billing_name.trim() || null,
        vat_number: orgForm.vat_number.trim() || null,
        credit_balance: orgForm.credit_balance === "" ? undefined : Number(orgForm.credit_balance),
        monthly_spend: orgForm.monthly_spend === "" ? undefined : Number(orgForm.monthly_spend),
        is_active: orgForm.is_active,
      });
      setEditing(res.data);
      setNotice("Customer updated");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update customer");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (customer: AuthOrganisation) => {
    const next = customer.is_active === false;
    const label = next ? "activate" : "disable";
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${customer.name}?`)) return;
    setError("");
    try {
      await api.updateAdminCustomerStatus(customer.id, next);
      setNotice(`Customer ${next ? "activated" : "disabled"}`);
      if (editing?.id === customer.id) {
        setEditing((prev) => (prev ? { ...prev, is_active: next } : prev));
        setOrgForm((prev) => ({ ...prev, is_active: next }));
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status");
    }
  };

  const openCredentials = async (customer: AuthOrganisation) => {
    setEditing(null);
    setCredentialsOrg(customer);
    setSelectedUser(null);
    setNotice("");
    setError("");
    try {
      const res = await api.adminCustomerUsers(customer.id);
      setMembers(res.data);
    } catch (err) {
      setMembers([]);
      setError(err instanceof ApiError ? err.message : "Could not load credentials");
    }
  };

  const openUser = (member: AdminCustomerUser) => {
    setSelectedUser(member);
    setUserForm({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email,
      role: member.role || "Developer",
      is_active: member.is_active !== false,
      password: "",
    });
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!credentialsOrg || !selectedUser) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.updateAdminCustomerUser(credentialsOrg.id, selectedUser.id, {
        first_name: userForm.first_name.trim(),
        last_name: userForm.last_name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        is_active: userForm.is_active,
        password: userForm.password || undefined,
      });
      setMembers((prev) => prev.map((m) => (m.id === res.data.id ? res.data : m)));
      setSelectedUser(res.data);
      setUserForm((prev) => ({ ...prev, password: "" }));
      setNotice("Credentials updated");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">INTERNAL · CUSTOMER ACCOUNTS</p>
          <h1>Customers</h1>
          <p>{adminNavContent.Customers}</p>
        </div>
        <Button variant="secondary" icon="trend" onClick={() => void load()}>Refresh</Button>
      </div>
      <div className="permission-note">
        <Icon name="shield" />
        <div>
          <strong>Scoped access is active</strong>
          <p>Customer updates and credential changes apply immediately. Passwords are write-only.</p>
        </div>
      </div>
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      <div className="filter-bar">
        <div className="filter-search"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search organisation or owner email" /></div>
        <Button variant="secondary" onClick={() => setStatusFilter(statusFilter === "All" ? "active" : statusFilter === "active" ? "disabled" : "All")}>
          Status: {statusFilter === "All" ? "All" : statusFilter === "active" ? "Active" : "Disabled"} <Icon name="chevron" />
        </Button>
      </div>
      <div className="admin-pricing-layout admin-customers-layout">
        <div className="dash-card admin-pricing-list">
          <div className="card-head"><div><h2>Organisations</h2><p>{customers.length} customers</p></div></div>
          {loading && <p className="pricing-load-status">Loading…</p>}
          {!loading && customers.map((customer) => (
            <div className={`admin-pricing-row ${editing?.id === customer.id || credentialsOrg?.id === customer.id ? "active" : ""}`} key={customer.id}>
              <div>
                <strong>{customer.name}</strong>
                <small>
                  {customer.owner_email || "No owner email"} · {customer.plan || "—"} · {formatMoney(customer.credit_balance)}
                  {" · "}
                  <Badge tone={customer.is_active === false ? "red" : "green"}>{customer.is_active === false ? "Disabled" : "Active"}</Badge>
                </small>
              </div>
              <div className="admin-customer-actions">
                <Button variant="secondary" onClick={() => openEdit(customer)}>Edit</Button>
                <Button variant="ghost" onClick={() => void toggleStatus(customer)}>{customer.is_active === false ? "Activate" : "Disable"}</Button>
                <Button variant="secondary" icon="key" onClick={() => void openCredentials(customer)}>Manage credentials</Button>
              </div>
            </div>
          ))}
          {!loading && customers.length === 0 && <div className="empty-table"><Icon name="people" /><strong>No customers found</strong><span>Try a different search or status filter.</span></div>}
        </div>

        {editing && (
          <form className="dash-card workspace-form admin-pricing-form" onSubmit={(event) => void saveCustomer(event)}>
            <div className="card-head">
              <div><h2>Edit customer</h2><p>Update organisation details and status</p></div>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)}><Icon name="x" /></button>
            </div>
            <label><span>Organisation name</span><input value={orgForm.name} onChange={(e) => setOrgForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
            <div className="form-row">
              <label><span>Plan</span><input value={orgForm.plan} onChange={(e) => setOrgForm((prev) => ({ ...prev, plan: e.target.value }))} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={orgForm.is_active} onChange={(e) => setOrgForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
            </div>
            <div className="form-row">
              <label><span>Billing name</span><input value={orgForm.billing_name} onChange={(e) => setOrgForm((prev) => ({ ...prev, billing_name: e.target.value }))} /></label>
              <label><span>VAT number</span><input value={orgForm.vat_number} onChange={(e) => setOrgForm((prev) => ({ ...prev, vat_number: e.target.value }))} /></label>
            </div>
            <div className="form-row">
              <label><span>Credit balance</span><input type="number" min="0" step="0.01" value={orgForm.credit_balance} onChange={(e) => setOrgForm((prev) => ({ ...prev, credit_balance: e.target.value }))} /></label>
              <label><span>Monthly spend</span><input type="number" min="0" step="0.01" value={orgForm.monthly_spend} onChange={(e) => setOrgForm((prev) => ({ ...prev, monthly_spend: e.target.value }))} /></label>
            </div>
            <Button type="submit" icon="check">{saving ? "Saving…" : "Save customer"}</Button>
          </form>
        )}

        {credentialsOrg && (
          <div className="dash-card admin-credentials-panel">
            <div className="card-head">
              <div><h2>Manage credentials</h2><p>{credentialsOrg.name} · login accounts</p></div>
              <button type="button" aria-label="Close" onClick={() => { setCredentialsOrg(null); setSelectedUser(null); }}><Icon name="x" /></button>
            </div>
            <div className="admin-credentials-list">
              {members.map((member) => (
                <button type="button" className={`admin-credentials-row ${selectedUser?.id === member.id ? "active" : ""}`} key={member.id} onClick={() => openUser(member)}>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.email} · {member.role}</small>
                  </span>
                  <Badge tone={member.is_active ? "green" : "red"}>{member.is_active ? "Active" : "Disabled"}</Badge>
                </button>
              ))}
              {members.length === 0 && <div className="empty-table"><Icon name="people" /><strong>No users</strong><span>This organisation has no linked logins.</span></div>}
            </div>
            {selectedUser && (
              <form className="workspace-form admin-pricing-form" onSubmit={(event) => void saveUser(event)}>
                <div className="card-head"><div><h2>Update login</h2><p>Email is the login identifier. Leave password blank to keep it.</p></div></div>
                <div className="form-row">
                  <label><span>First name</span><input value={userForm.first_name} onChange={(e) => setUserForm((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
                  <label><span>Last name</span><input value={userForm.last_name} onChange={(e) => setUserForm((prev) => ({ ...prev, last_name: e.target.value }))} required /></label>
                </div>
                <label><span>Email</span><input type="email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} required /></label>
                <div className="form-row">
                  <label><span>Role</span>
                    <select value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                      <option value="Owner">Owner</option>
                      <option value="Admin">Admin</option>
                      <option value="Developer">Developer</option>
                    </select>
                  </label>
                  <label className="checkbox-row"><input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active login</label>
                </div>
                <label><span>New password</span><input type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} minLength={8} placeholder="Leave blank to keep current password" /></label>
                <Button type="submit" icon="check">{saving ? "Saving…" : "Save credentials"}</Button>
              </form>
            )}
          </div>
        )}

        {!editing && !credentialsOrg && (
          <div className="dash-card">
            <div className="card-head"><div><h2>Customer details</h2><p>Select Edit or Manage credentials on a customer row.</p></div></div>
          </div>
        )}
      </div>
    </div>
  );
}

function StaffSettingsPage() {
  const [perPage, setPerPage] = useState(5);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getApiSettings()
      .then((res) => {
        if (cancelled) return;
        setPerPage(res.data.per_page);
        setPaginationEnabled(res.data.pagination_enabled);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load API settings");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await api.updateApiSettings({
        per_page: Number(perPage),
        pagination_enabled: paginationEnabled,
      });
      setPerPage(res.data.per_page);
      setPaginationEnabled(res.data.pagination_enabled);
      setNotice("API settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save API settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <p className="demo-label">INTERNAL · SETTINGS</p>
          <h1>Staff settings</h1>
          <p>Manage internal roles, MFA status and lookup API defaults.</p>
        </div>
      </div>
      {notice && <div className="inline-notice"><Icon name="check" /><span>{notice}</span><button type="button" aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}
      {error && <div className="inline-notice"><Icon name="shield" /><span>{error}</span></div>}
      <form className="dash-card workspace-form" onSubmit={(event) => void save(event)}>
        <div className="card-head">
          <div>
            <span className="card-eyebrow">Lookup provider</span>
            <h2>API settings</h2>
            <p>Control default pagination for proxied address lookups. Upstream URLs stay on the server.</p>
          </div>
        </div>
        {loading ? <p>Loading settings…</p> : (
          <>
            <div className="form-row">
              <label>
                <span>Default page size</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value) || 5)}
                  required
                />
              </label>
              <label className="checkbox-row" style={{ alignSelf: "end", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={paginationEnabled}
                  onChange={(e) => setPaginationEnabled(e.target.checked)}
                />
                Pagination enabled
              </label>
            </div>
            <p style={{ color: "var(--muted, #64748b)", fontSize: 14, marginTop: 0 }}>
              When pagination is disabled, Laravel fetches all upstream pages and returns the full address list to the client.
            </p>
            <Button type="submit" icon="check">{saving ? "Saving…" : "Save API settings"}</Button>
          </>
        )}
      </form>
      <div className="dash-card" style={{ marginTop: 16 }}>
        <div className="card-head"><div><h2>Staff access</h2><p>Internal roles and sessions</p></div></div>
        <DemoTable page="Staff settings" />
      </div>
    </div>
  );
}

function AdminSectionPage() {
  const location = useLocation();
  const page = adminLabelFromPath(location.pathname);
  if (page === "Operations") return <Operations />;
  if (page === "Pricing") return <AdminPricing />;
  if (page === "Customers") return <AdminCustomers />;
  if (page === "Staff settings") return <StaffSettingsPage />;
  return <AdminSection page={page} />;
}

function DashboardSectionPage() {
  const location = useLocation();
  const page = dashboardLabelFromPath(location.pathname);
  if (page === "Overview") return <Overview />;
  return <WorkspacePage page={page} />;
}


function Operations() {
  const [metrics, setMetrics] = useState<{ request_volume: number; error_rate: number; p95_latency_ms: number; credit_liability: number | string } | null>(null);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof api.adminProviders>>["data"]>([]);
  const [audits, setAudits] = useState<Awaited<ReturnType<typeof api.adminAudits>>["data"]>([]);
  useEffect(() => {
    api.adminOperationsOverview().then((res) => setMetrics(res.data.metrics)).catch(() => setMetrics(null));
    api.adminProviders().then((res) => setProviders(res.data)).catch(() => setProviders([]));
    api.adminAudits().then((res) => setAudits(res.data)).catch(() => setAudits([]));
  }, []);
  const formatVolume = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}m` : value.toLocaleString();
  return <div className="workspace-page admin-page">
    <div className="workspace-heading"><div><p className="demo-label">INTERNAL · DEMO DATA · REFRESHED 45 SEC AGO</p><h1>Operations centre</h1><p>Platform health, provider availability and commercial exposure.</p></div><div><Button variant="secondary">Last 24 hours <Icon name="chevron" /></Button><Button variant="secondary" icon="download">Export view</Button></div></div>
    <div className="alert incident-alert"><span><Icon name="help" /></span><div><strong>1 active provider incident</strong><p>Address Provider B is returning elevated timeouts in London regions.</p></div><Badge tone="amber">Investigating</Badge><button>Open incident <Icon name="arrow" /></button></div>
    <div className="metrics-grid admin-metrics"><MetricCard label="Request volume" value={metrics ? formatVolume(metrics.request_volume) : "—"} change="+7.2%" icon="trend" /><MetricCard label="Error rate" value={metrics ? `${metrics.error_rate.toFixed(2)}%` : "—"} change="+0.14pp" icon="help" /><MetricCard label="p95 latency" value={metrics ? `${metrics.p95_latency_ms} ms` : "—"} change="+38 ms" icon="trend" /><MetricCard label="Credit liability" value={metrics ? formatMoney(metrics.credit_liability, 1) : "—"} change="+2.1%" icon="wallet" /></div>
    <div className="ops-grid">
      <div className="dash-card provider-health"><div className="card-head"><div><h2>Provider availability</h2><p>Measured successful upstream responses</p></div><button>View providers <Icon name="arrow" /></button></div>{providers.map((provider) => <div className="provider-row" key={provider.name}><div><i className={provider.status === "Degraded" ? "warning" : ""} /><strong>{provider.name}</strong></div><span>{provider.uptime_pct}%</span><span>{provider.latency_ms} ms</span><Badge tone={provider.status === "Degraded" ? "amber" : "green"}>{provider.status}</Badge><Icon name="chevron" /></div>)}</div>
      <div className="dash-card queue-card"><div className="card-head"><div><h2>Queue health</h2><p>Current processing depth</p></div><Badge tone="green">Healthy</Badge></div><div className="queue-ring"><div><strong>142</strong><span>jobs queued</span></div></div><div className="queue-stats"><div><span>Bulk jobs</span><strong>118</strong></div><div><span>Exports</span><strong>24</strong></div><div><span>Oldest age</span><strong>42s</strong></div></div></div>
      <div className="dash-card traffic-card"><div className="card-head"><div><h2>Request volume & errors</h2><p>5-minute intervals · all endpoints</p></div><div className="legend"><span><i /> Volume</span><span><i className="red" /> Errors</span></div></div><Chart /></div>
      <div className="dash-card audit-card"><div className="card-head"><div><h2>Recent operational actions</h2><p>High-impact audited changes</p></div><button>Audit log <Icon name="arrow" /></button></div>{audits.map((audit) => <div className="audit-row" key={`${audit.action}-${audit.created_at}`}><span><Icon name="shield" /></span><div><strong>{audit.action}</strong><small>{audit.user?.name || audit.organisation?.name || "System"} · {audit.created_at ? new Date(audit.created_at).toLocaleString() : "—"}</small></div><Icon name="chevron" /></div>)}</div>
    </div>
  </div>;
}

function AdminSection({ page }: { page: string }) {
  return <div className="workspace-page admin-page"><div className="workspace-heading"><div><p className="demo-label">INTERNAL · AUDITED WORKSPACE</p><h1>{page}</h1><p>{adminNavContent[page]}</p></div><Button icon="plus">{page === "Customers" ? "Add note" : "Create rule"}</Button></div><div className="permission-note"><Icon name="shield" /><div><strong>Scoped access is active</strong><p>Customer-impacting actions require a reason, confirmation and audit entry. Silent impersonation is not available.</p></div></div><div className="filter-bar"><div className="filter-search"><Icon name="search" /><input placeholder={`Search ${page.toLowerCase()}`} /></div><Button variant="secondary">Status: All <Icon name="chevron" /></Button></div><DemoTable page={page} /></div>;
}

function HomePricingPreview({ navigate }: { navigate: (v: Page) => void }) {
  const [packages, setPackages] = useState<PricingPackageRecord[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.pricingPackages()
      .then((res) => {
        setPackages(res.data);
        setFailed(false);
      })
      .catch(() => {
        setPackages([]);
        setFailed(true);
      });
  }, []);

  const featured = packages.find((pkg) => pkg.is_featured) || packages[1] || packages[0];
  const others = packages.filter((pkg) => pkg.id !== featured?.id);
  const preview = [others[0], featured, others[1]].filter(Boolean) as PricingPackageRecord[];

  return (
    <section className="section pricing-preview">
      <div className="eyebrow">Clear commercial model</div>
      <h2>Start free. Pay for what you retrieve.</h2>
      <p>Illustrative pricing for prototype purposes — not a live offer.</p>
      {failed && <p className="pricing-load-error">Pricing is temporarily unavailable.</p>}
      {!failed && preview.length > 0 && (
        <div className="price-row">
          {preview.map((pkg) => (
            <div className={pkg.is_featured ? "featured" : ""} key={pkg.id}>
              {pkg.is_featured && <Badge>POPULAR</Badge>}
              <span>{pkg.name.toUpperCase()}</span>
              <strong>{pkg.price_display}</strong>
              <p>{pkg.tagline}</p>
            </div>
          ))}
        </div>
      )}
      <Button onClick={() => navigate("pricing")} icon="arrow">Compare all options</Button>
    </section>
  );
}

function Pricing({ navigate }: { navigate: (v: Page) => void }) {
  const [packages, setPackages] = useState<PricingPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.pricingPackages()
      .then((res) => {
        setPackages(res.data);
        setFailed(false);
      })
      .catch(() => {
        setPackages([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header navigate={navigate} />
      <main className="marketing-page section">
        <div className="marketing-hero">
          <Badge>Illustrative commercial terms</Badge>
          <h1>Clear pricing, without the guesswork</h1>
          <p>Choose public lookup, flexible credits or a business plan. All figures below are editable prototype placeholders, not live offers.</p>
        </div>
        {loading && <p className="pricing-load-status">Loading packages…</p>}
        {failed && <p className="pricing-load-error">Pricing packages could not be loaded.</p>}
        {!loading && !failed && (
          <div className="full-pricing">
            {packages.map((pkg) => (
              <div className={pkg.is_featured ? "featured" : ""} key={pkg.id}>
                {pkg.is_featured && <Badge>POPULAR</Badge>}
                <h2>{pkg.name}</h2>
                <strong>{pkg.price_display}</strong>
                <p>{pkg.tagline}</p>
                <ul>
                  {(pkg.features || []).map((feature) => (
                    <li key={feature}><Icon name="check" />{feature}</li>
                  ))}
                </ul>
                <Button
                  variant={pkg.is_featured ? "primary" : "secondary"}
                  onClick={() => navigate(pkg.cta_target === "contact" ? "contact" : "create-account")}
                  icon="arrow"
                >
                  {pkg.cta_label}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="terms-grid">
          <div>
            <h2>What counts as billable?</h2>
            <p>A billable event is a successful retrieval of a provider-supplied record. Format errors, authenticated rate-limit responses and unsuccessful no-match requests are shown separately in usage.</p>
          </div>
          <div>
            <h2>Important assumptions</h2>
            <p>Autocomplete suggestion treatment, overage, expiry, VAT and export rights depend on the selected plan and dataset. Review terms before purchase.</p>
          </div>
        </div>
      </main>
      <Footer navigate={navigate} />
    </>
  );
}

function ApiDocsContent({ embedded = false, navigate, onOpenApiKeys }: { embedded?: boolean; navigate?: (v: Page) => void; onOpenApiKeys?: () => void }) {
  const [section, setSection] = useState("introduction");
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8003/api/v1";
  const copyText = (value: string) => navigator.clipboard?.writeText(value);
  const openKeys = () => {
    if (onOpenApiKeys) onOpenApiKeys();
    else if (navigate) navigate(isAuthenticated() ? "dashboard" : "create-account");
  };

  const overviewNav = [
    { id: "introduction", label: "Introduction" },
    { id: "authentication", label: "Authentication" },
    { id: "pagination", label: "Pagination" },
    { id: "errors", label: "Errors" },
  ];
  const endpointNav = [
    { id: "suggest", label: "GET /postcodes/suggest", path: "/postcodes/suggest" },
    { id: "postcode", label: "GET /postcodes/{pc}", path: "/postcodes/{postcode}" },
    { id: "postcode-addresses", label: "GET /postcodes/{pc}/addresses", path: "/postcodes/{postcode}/addresses" },
    { id: "addresses", label: "GET /addresses", path: "/addresses" },
    { id: "address-id", label: "GET /addresses/{id}", path: "/addresses/{id}" },
  ];

  const scrollTo = (id: string) => {
    setSection(id);
    document.getElementById(`docs-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const content = (
    <div className={`api-docs ${embedded ? "api-docs-embedded" : ""}`}>
      <aside className="api-docs-nav" aria-label="API documentation">
        <div className="api-docs-brand">
          <strong>PostcodePulse API</strong>
          <code>{apiBase}</code>
        </div>
        <div className="api-docs-nav-group">
          <span>Overview</span>
          {overviewNav.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "active" : ""} onClick={() => scrollTo(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="api-docs-nav-group">
          <span>Endpoints</span>
          {endpointNav.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "active" : ""} onClick={() => scrollTo(item.id)}>
              <Badge tone="green">GET</Badge>
              <span>{item.path}</span>
            </button>
          ))}
        </div>
      </aside>

      <article className="api-docs-main">
        <header className="api-docs-hero">
          <h1>PostcodePulse API</h1>
          <p>Look up UK postcodes and list addresses registered against them. Metered endpoints are read-only <code>GET</code> requests returning JSON.</p>
        </header>

        <section id="docs-introduction" className="api-docs-card">
          <h2>Introduction</h2>
          <p><strong>Base URL:</strong></p>
          <div className="endpoint"><Badge tone="blue">BASE</Badge><code>{apiBase}</code><Button variant="ghost" icon="copy" onClick={() => copyText(apiBase)}>Copy</Button></div>
          <p>Postcodes are case-insensitive and the space is optional — <code>al11aj</code>, <code>AL11AJ</code> and <code>AL1 1AJ</code> are equivalent. Encode spaces as <code>%20</code> in URLs.</p>
          <p>Successful responses wrap the result in <code>data</code>. List endpoints may also include <code>meta</code> for pagination.</p>
          <div className="docs-callout"><Icon name="lock" /><div><strong>Two surfaces</strong><p>Homepage demo uses unauthenticated <code>/api/v1/public/*</code>. Production integrations must use metered <code>/api/v1/*</code> routes with an API key.</p></div></div>
          <ol className="docs-steps">
            <li>Create an account and open <strong>API keys</strong> in the dashboard.</li>
            <li>Generate a <code>pp_test_</code> or <code>pp_live_</code> key (shown once).</li>
            <li>Send <code>Authorization: Bearer pp_…</code> on every metered request.</li>
            <li>Usage counts against your package monthly API call limit (Test and Live both count toward the total).</li>
          </ol>
        </section>

        <section id="docs-authentication" className="api-docs-card">
          <h2>Authentication</h2>
          <p>External clients authenticate with an organisation API key. Lookup explorer uses your signed-in session and does not need a pasted Bearer token in the browser.</p>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">REQUIRED</Badge><Button variant="ghost" icon="copy" onClick={() => copyText("Authorization: Bearer pp_test_your_key_here\nAccept: application/json")}>Copy</Button></div>
            <pre><code>{"Authorization: Bearer pp_test_your_key_here\nAccept: application/json"}</code></pre>
          </div>
          <ul>
            <li>Use a <code>pp_test_</code> key for Test environment traffic.</li>
            <li>Use a <code>pp_live_</code> key for Live / billable traffic.</li>
            <li>Missing or invalid keys return <code>401</code>.</li>
          </ul>
          {(navigate || onOpenApiKeys) && (
            <Button variant="secondary" icon="key" onClick={openKeys}>
              {onOpenApiKeys ? "Open API keys" : isAuthenticated() ? "Open dashboard" : "Create account"}
            </Button>
          )}
        </section>

        <section id="docs-pagination" className="api-docs-card">
          <h2>Pagination</h2>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Query param</th><th>Default</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>page</code></td><td>1</td><td>Page number, starting at 1.</td></tr>
                <tr><td><code>per_page</code></td><td>10</td><td>Items per page (subject to API settings, typically max 100).</td></tr>
              </tbody>
            </table>
          </div>
          <p>Paginated responses include:</p>
          <div className="code-window"><pre><code>{`"meta": {\n  "page": 1,\n  "per_page": 10,\n  "total": 52,\n  "total_pages": 6,\n  "has_next": true,\n  "has_prev": false\n}`}</code></pre></div>
        </section>

        <section id="docs-errors" className="api-docs-card">
          <h2>Errors</h2>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Status</th><th>When</th></tr></thead>
              <tbody>
                <tr><td><code>401</code></td><td>Missing or invalid API key / session.</td></tr>
                <tr><td><code>404</code></td><td>Unknown postcode, address id or route.</td></tr>
                <tr><td><code>422</code></td><td>Missing or invalid input (e.g. postcode).</td></tr>
                <tr><td><code>429</code></td><td>Plan monthly API call limit reached.</td></tr>
                <tr><td><code>500</code></td><td>Server or upstream error.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="code-window"><pre><code>{`{\n  "message": "Plan monthly API call limit reached.",\n  "error": { "code": 429, "plan": "business", "limit": 10000, "used": 10000 }\n}`}</code></pre></div>
          <p>Authenticated clients can check allowance with <code>GET /v1/usage-summary</code> (includes <code>used_test</code> and <code>used_live</code>).</p>
        </section>

        <section id="docs-suggest" className="api-docs-card">
          <div className="endpoint"><Badge tone="green">GET</Badge><code>/v1/postcodes/suggest</code><Badge tone="neutral">paginated</Badge></div>
          <p>Lists postcodes starting with a prefix, for autocomplete.</p>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Query param</th><th>Required</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>q</code></td><td>No</td><td>Postcode prefix, e.g. <code>AL1</code>. Prefer 2+ characters.</td></tr>
                <tr><td><code>page</code>, <code>per_page</code></td><td>No</td><td>See Pagination.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">cURL</Badge><Button variant="ghost" icon="copy" onClick={() => copyText(`curl "${apiBase}/postcodes/suggest?q=AL1" -H "Authorization: Bearer pp_test_••••" -H "Accept: application/json"`)}>Copy</Button></div>
            <pre><code>{`curl "${apiBase}/postcodes/suggest?q=AL1" \\\n  -H "Authorization: Bearer pp_test_••••" \\\n  -H "Accept: application/json"`}</code></pre>
          </div>
        </section>

        <section id="docs-postcode" className="api-docs-card">
          <div className="endpoint"><Badge tone="green">GET</Badge><code>/v1/postcodes/{"{postcode}"}</code></div>
          <p>Returns geography for one UK postcode (coordinates, district, region, and related fields).</p>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Path param</th><th>Description</th></tr></thead>
              <tbody><tr><td><code>postcode</code></td><td>Full UK postcode, e.g. <code>AL1 1AJ</code>.</td></tr></tbody>
            </table>
          </div>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">cURL</Badge><Button variant="ghost" icon="copy" onClick={() => copyText(`curl "${apiBase}/postcodes/AL1%201AJ" -H "Authorization: Bearer pp_test_••••" -H "Accept: application/json"`)}>Copy</Button></div>
            <pre><code>{`curl "${apiBase}/postcodes/AL1%201AJ" \\\n  -H "Authorization: Bearer pp_test_••••" \\\n  -H "Accept: application/json"`}</code></pre>
          </div>
          <div className="code-window"><pre><code>{`{\n  "data": {\n    "postcode": "AL1 1AJ",\n    "country": "England",\n    "region": "East of England",\n    "admin_district": "St Albans",\n    "latitude": "51.744498",\n    "longitude": "-0.328599"\n  }\n}`}</code></pre></div>
        </section>

        <section id="docs-postcode-addresses" className="api-docs-card">
          <div className="endpoint"><Badge tone="green">GET</Badge><code>/v1/postcodes/{"{postcode}"}/addresses</code><Badge tone="neutral">paginated</Badge></div>
          <p>Returns addresses for a postcode.</p>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Param</th><th>In</th><th>Required</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>postcode</code></td><td>path</td><td>Yes</td><td>Full UK postcode.</td></tr>
                <tr><td><code>q</code></td><td>query</td><td>No</td><td>Filter by text in the address line.</td></tr>
                <tr><td><code>page</code>, <code>per_page</code></td><td>query</td><td>No</td><td>See Pagination.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">cURL</Badge><Button variant="ghost" icon="copy" onClick={() => copyText(`curl "${apiBase}/postcodes/AL1%201AJ/addresses" -H "Authorization: Bearer pp_test_••••" -H "Accept: application/json"`)}>Copy</Button></div>
            <pre><code>{`curl "${apiBase}/postcodes/AL1%201AJ/addresses" \\\n  -H "Authorization: Bearer pp_test_••••" \\\n  -H "Accept: application/json"`}</code></pre>
          </div>
        </section>

        <section id="docs-addresses" className="api-docs-card">
          <div className="endpoint"><Badge tone="green">GET</Badge><code>/v1/addresses</code><Badge tone="neutral">paginated</Badge></div>
          <p>Same as postcode addresses, with the postcode passed as a query parameter.</p>
          <div className="api-docs-table-wrap">
            <table className="api-docs-table">
              <thead><tr><th>Query param</th><th>Required</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>postcode</code></td><td>Yes</td><td>Full UK postcode.</td></tr>
                <tr><td><code>q</code></td><td>No</td><td>Filter by text in the address line.</td></tr>
                <tr><td><code>page</code>, <code>per_page</code></td><td>No</td><td>See Pagination.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">cURL</Badge><Button variant="ghost" icon="copy" onClick={() => copyText(`curl "${apiBase}/addresses?postcode=AL10%209WP&q=Block%20D" -H "Authorization: Bearer pp_test_••••" -H "Accept: application/json"`)}>Copy</Button></div>
            <pre><code>{`curl "${apiBase}/addresses?postcode=AL10%209WP&q=Block%20D" \\\n  -H "Authorization: Bearer pp_test_••••" \\\n  -H "Accept: application/json"`}</code></pre>
          </div>
        </section>

        <section id="docs-address-id" className="api-docs-card">
          <div className="endpoint"><Badge tone="green">GET</Badge><code>/v1/addresses/{"{id}"}</code></div>
          <p>Returns a single address by its numeric id.</p>
          <div className="code-window"><div className="code-head"><Badge tone="neutral">cURL</Badge><Button variant="ghost" icon="copy" onClick={() => copyText(`curl "${apiBase}/addresses/3" -H "Authorization: Bearer pp_test_••••" -H "Accept: application/json"`)}>Copy</Button></div>
            <pre><code>{`curl "${apiBase}/addresses/3" \\\n  -H "Authorization: Bearer pp_test_••••" \\\n  -H "Accept: application/json"`}</code></pre>
          </div>
        </section>
      </article>
    </div>
  );

  if (embedded) {
    return <div className="workspace-page api-docs-workspace">{content}</div>;
  }

  return content;
}

function ApiDocsPage({ navigate }: { navigate: (v: Page) => void }) {
  return <>
    <Header navigate={navigate} />
    <main className="api-docs-page section">
      <ApiDocsContent navigate={navigate} />
    </main>
    <Footer navigate={navigate} />
  </>;
}

function Developers({ navigate }: { navigate: (v: Page) => void }) {
  return <ApiDocsPage navigate={navigate} />;
}

function SignIn({ navigate, variant = "customer" }: { navigate: (v: Page) => void; variant?: "customer" | "admin" }) {
  const isAdmin = variant === "admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(email, password);
      setSession(res.data.token, res.data.user, res.data.organisation);
      if (isAdmin) {
        if (!res.data.user.is_staff) {
          setError("This account does not have staff access.");
          return;
        }
        navigate("admin");
        return;
      }
      navigate("dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };
  return <main className="auth-page"><div className="auth-brand"><Logo onClick={() => navigate("home")} /><div><Badge tone="neutral">{isAdmin ? "INTERNAL STAFF" : "BUSINESS WORKSPACE"}</Badge><h1>{isAdmin ? "Operations access, tightly controlled." : "Address intelligence, under control."}</h1><p>{isAdmin ? "Sign in with a staff account to open the PostcodePulse operations centre." : "Manage projects, credentials, usage and billing from one precise workspace."}</p><div className="auth-art"><span className="auth-cube cube-one" /><span className="auth-cube cube-two" /><span className="auth-ring"><Icon name={isAdmin ? "shield" : "key"} size={30} /></span></div></div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><h2>{isAdmin ? "Staff sign in" : "Welcome back"}</h2><p>{isAdmin ? "Sign in to the PostcodePulse admin panel." : "Sign in to your PostcodePulse account."}</p>{!isAdmin && <Button variant="secondary" className="sso-button" type="button"><span className="google-g">G</span>Continue with Google</Button>}{!isAdmin && <div className="or"><span />or continue with email<span /></div>}<label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><div className="auth-options"><label><input type="checkbox" defaultChecked /> Remember me</label>{!isAdmin && <button type="button">Forgot password?</button>}</div>{error && <p className="security-note"><Icon name="shield" /><span>{error}</span></p>}<Button className="auth-submit" type="submit" icon={loading ? undefined : "arrow"}>{loading ? "Signing in…" : isAdmin ? "Sign in to admin" : "Sign in"}</Button><p className="auth-bottom">{isAdmin ? <>Need a customer workspace? <button type="button" onClick={() => navigate("signin")}>Customer sign in</button></> : <>New to PostcodePulse? <button type="button" onClick={() => navigate("create-account")}>Create an account</button></>}</p>{!isAdmin && <p className="auth-bottom">Staff member? <button type="button" onClick={() => navigate("admin-login")}>Admin sign in</button></p>}<div className="security-note"><Icon name="shield" /><span>{isAdmin ? "Staff actions are audited. Silent impersonation is not available." : "MFA and session controls are available after sign-in."}</span></div></form></div></main>;
}

const contentPages: Record<Exclude<ContentPageKey, "create-account">, {
  category: string;
  title: string;
  intro: string;
  icon: IconName;
  primary?: string;
  sections: { title: string; body: string; icon: IconName }[];
}> = {
  product: {
    category: "Product",
    title: "One platform for every address workflow",
    intro: "Search postcode geography, retrieve complete address records and bring trusted lookup experiences into your products.",
    icon: "layers",
    sections: [
      { title: "Postcode lookup", body: "Normalise a full UK postcode and inspect clearly labelled geographic fields.", icon: "location" },
      { title: "Address finder", body: "Select a complete property-level record from an entitled address provider.", icon: "building" },
      { title: "API access", body: "Integrate secure REST endpoints with test environments and restricted credentials.", icon: "code" },
      { title: "Bulk processing", body: "Validate permitted CSV records with preview, cost estimate and partial-failure handling.", icon: "file" },
    ],
  },
  "postcode-lookup": {
    category: "Product · Postcode lookup",
    title: "Understand a UK postcode in seconds",
    intro: "Search, validate and explore postcode-level geography with precise labels, source information and no registration for public lookups.",
    icon: "location",
    primary: "Try postcode lookup",
    sections: [
      { title: "Normalised records", body: "Return a consistently formatted postcode and current or terminated status when supplied.", icon: "check" },
      { title: "Accurate field labels", body: "Keep post town, local authority, region and ceremonial county distinct.", icon: "layers" },
      { title: "Approximate coordinates", body: "Show postcode centroids as approximate locations rather than property coordinates.", icon: "location" },
      { title: "Transparent provenance", body: "Display the source and record update date whenever those fields are available.", icon: "database" },
    ],
  },
  "address-finder": {
    category: "Product · Address finder",
    title: "Help people choose the right address",
    intro: "Reduce typing with accessible address selection while keeping provider coverage, manual entry and delivery availability clear.",
    icon: "building",
    primary: "Explore address finder",
    sections: [
      { title: "Accessible autocomplete", body: "Keyboard-friendly suggestions with persistent labels and clear selection states.", icon: "search" },
      { title: "Property-level records", body: "Retrieve complete address fields only from a property-level address provider.", icon: "building" },
      { title: "Enhanced fields", body: "UPRN and rooftop coordinates appear only when supplied by the selected provider.", icon: "spark" },
      { title: "Manual entry", body: "Keep a clear fallback when an address is unavailable or the provider times out.", icon: "file" },
    ],
  },
  "api-access": {
    category: "Product · API access",
    title: "A precise address API for product teams",
    intro: "Move from a safe mock request to a controlled production integration with explicit billing signals and useful errors.",
    icon: "code",
    primary: "Open developer centre",
    sections: [
      { title: "Predictable endpoints", body: "Purpose-built postcode, address and autocomplete resources with structured responses.", icon: "code" },
      { title: "Restricted browser tokens", body: "Limit approved origins and scopes without exposing server-side secrets.", icon: "shield" },
      { title: "Request diagnostics", body: "Trace sanitised requests by identifier, status, endpoint and latency.", icon: "trend" },
      { title: "Test environment", body: "Build against mock data before enabling a live provider or billable retrievals.", icon: "layers" },
    ],
  },
  "bulk-processing": {
    category: "Product · Bulk processing",
    title: "Process address data with confidence",
    intro: "Upload, map and validate CSV records, then review estimated cost and dataset permissions before processing.",
    icon: "upload",
    primary: "Start a demo bulk job",
    sections: [
      { title: "Map columns", body: "Match source columns to postcode or address fields and preview representative rows.", icon: "arrow" },
      { title: "Validate first", body: "Identify duplicates, invalid formats and incomplete records before confirmation.", icon: "check" },
      { title: "Control cost", body: "Review explicit assumptions and estimated billable retrievals before processing.", icon: "wallet" },
      { title: "Manage outputs", body: "Download only the fields permitted by the selected dataset and retention policy.", icon: "download" },
    ],
  },
  resources: {
    category: "Resources",
    title: "Everything you need to use address data well",
    intro: "Practical documentation, support guidance, service information and transparent explanations of our demo data model.",
    icon: "file",
    sections: [
      { title: "Developer centre", body: "Quick starts, authentication, endpoint references, errors and integration guides.", icon: "code" },
      { title: "Help centre", body: "Straightforward answers for search, accounts, billing and data availability.", icon: "help" },
      { title: "System status", body: "Current demo service condition, incident history and component availability.", icon: "trend" },
      { title: "Data sources", body: "Understand coverage, field provenance, refresh dates and licence constraints.", icon: "database" },
    ],
  },
  "help-centre": {
    category: "Resources · Help centre",
    title: "How can we help?",
    intro: "Find concise guidance for postcode searches, integrations, billing, account security and provider availability.",
    icon: "help",
    sections: [
      { title: "Search and results", body: "Postcode formats, no-match results, terminated records and address selection.", icon: "search" },
      { title: "API integration", body: "Credentials, environments, common errors, rate limits and request identifiers.", icon: "code" },
      { title: "Billing and credits", body: "Billable events, credit packs, automatic top-up, VAT and invoices.", icon: "wallet" },
      { title: "Account and security", body: "Invitations, roles, MFA, sessions and organisation settings.", icon: "shield" },
    ],
  },
  "system-status": {
    category: "Resources · System status",
    title: "All demo systems operational",
    intro: "A transparent view of PostcodePulse components. This prototype status does not represent live service performance or an SLA.",
    icon: "trend",
    sections: [
      { title: "Public postcode search", body: "Operational · Demo component status", icon: "check" },
      { title: "Address retrieval", body: "Operational · Demo component status", icon: "check" },
      { title: "Developer API", body: "Operational · Demo component status", icon: "check" },
      { title: "Bulk processing", body: "Operational · Demo component status", icon: "check" },
    ],
  },
  "data-sources": {
    category: "Resources · Data sources",
    title: "Clear provenance for every field",
    intro: "Postcode geography and full property-level addresses are separate datasets with different fields, permissions and refresh schedules.",
    icon: "database",
    sections: [
      { title: "Postcode geography", body: "Normalised postcode, status, administrative fields and approximate centroid coordinates.", icon: "location" },
      { title: "Property addresses", body: "Building, organisation, address lines, locality, post town and postcode.", icon: "building" },
      { title: "Enhanced attributes", body: "UPRN and rooftop coordinates only appear where an entitled provider supplies them.", icon: "spark" },
      { title: "Licence controls", body: "Export and retention options reflect the permissions of the selected dataset.", icon: "lock" },
    ],
  },
  changelog: {
    category: "Resources · Changelog",
    title: "What’s new in PostcodePulse",
    intro: "Illustrative product updates for the prototype experience. Entries below do not describe a live production release.",
    icon: "spark",
    sections: [
      { title: "28 May 2025 · Bulk validation", body: "Added duplicate detection and clearer partial-failure summaries to demo bulk jobs.", icon: "upload" },
      { title: "14 May 2025 · Field provenance", body: "Added provider and precision labels to address and coordinate detail views.", icon: "database" },
      { title: "30 April 2025 · Key rotation", body: "Introduced an optional overlap period for server-side secret rotation.", icon: "key" },
      { title: "09 April 2025 · Usage definitions", body: "Separated total requests from successful billable retrievals throughout reporting.", icon: "trend" },
    ],
  },
  company: {
    category: "Company",
    title: "Building clearer address experiences",
    intro: "PostcodePulse is a fictional product concept focused on legibility, responsible data use and dependable interaction design.",
    icon: "building",
    sections: [
      { title: "Our approach", body: "Explain what data means, where it came from and what it cannot confirm.", icon: "eye" },
      { title: "Product principles", body: "Make common searches simple and operational controls explicit.", icon: "layers" },
      { title: "Accessibility", body: "Design keyboard-friendly, readable experiences targeting WCAG 2.2 AA.", icon: "people" },
      { title: "Responsible access", body: "Use scoped permissions, visible support access and append-only auditing.", icon: "shield" },
    ],
  },
  about: {
    category: "Company · About",
    title: "Precision people can understand",
    intro: "PostcodePulse is a demonstration of how public postcode search and business address intelligence can share one clear product language.",
    icon: "spark",
    sections: [
      { title: "Established by design", body: "A calm, systematic interface built for high-trust operational work.", icon: "layers" },
      { title: "Honest information", body: "No invented endorsements, guarantees, certifications or performance claims.", icon: "check" },
      { title: "Useful for everyone", body: "Public search stays open while advanced controls sit within business accounts.", icon: "people" },
      { title: "Built in the UK context", body: "British English and careful separation of UK geographic concepts throughout.", icon: "location" },
    ],
  },
  contact: {
    category: "Company · Contact",
    title: "Talk to the right team",
    intro: "Choose a route below and we’ll collect only the information needed to respond. Contact details shown are prototype content.",
    icon: "people",
    sections: [
      { title: "Product and sales", body: "Discuss business workflows, projected usage and dataset requirements.", icon: "building" },
      { title: "Technical support", body: "Share a sanitised request identifier without exposing address or credential data.", icon: "help" },
      { title: "Data query", body: "Ask about provenance, field availability, licensing or retention.", icon: "database" },
      { title: "Accessibility feedback", body: "Tell us about an access need or barrier in this prototype.", icon: "eye" },
    ],
  },
  accessibility: {
    category: "Company · Accessibility",
    title: "Access should never be an afterthought",
    intro: "Our target is WCAG 2.2 AA across public search, customer workspaces and internal tools.",
    icon: "eye",
    sections: [
      { title: "Keyboard access", body: "Logical focus order, visible focus treatment and operable search suggestions.", icon: "check" },
      { title: "Readable content", body: "Persistent labels, sufficient contrast and plain British English.", icon: "file" },
      { title: "Reduced motion", body: "Decorative motion is removed when reduced motion is requested.", icon: "settings" },
      { title: "Alternative information", body: "Structured result tables provide an alternative to map-only information.", icon: "layers" },
    ],
  },
  privacy: {
    category: "Legal · Privacy",
    title: "Privacy information",
    intro: "This prototype demonstrates how PostcodePulse could explain personal data use. It is not production legal advice.",
    icon: "shield",
    sections: [
      { title: "Information you provide", body: "Account details, organisation information, support messages and billing contact data.", icon: "people" },
      { title: "Service information", body: "Sanitised request metadata, security events, usage totals and configuration changes.", icon: "trend" },
      { title: "Retention and control", body: "Workspace controls should reflect dataset permissions and documented retention periods.", icon: "database" },
      { title: "Your choices", body: "Manage notifications, sessions, retention and account closure from settings.", icon: "settings" },
    ],
  },
  cookies: {
    category: "Legal · Cookies",
    title: "Cookie information",
    intro: "A clear explanation of essential storage and optional measurement. This prototype does not claim a live cookie configuration.",
    icon: "settings",
    sections: [
      { title: "Essential storage", body: "Used to maintain secure sessions, preferences and important service choices.", icon: "lock" },
      { title: "Experience preferences", body: "Remember interface options such as selected organisation or environment.", icon: "settings" },
      { title: "Optional measurement", body: "Would require a clear choice before non-essential analytics are enabled.", icon: "trend" },
      { title: "Manage choices", body: "Review or change non-essential preferences without affecting core service access.", icon: "check" },
    ],
  },
  terms: {
    category: "Legal · Terms",
    title: "Service terms",
    intro: "Illustrative terms structure for PostcodePulse. Commercial terms, provider rights and service commitments require formal review.",
    icon: "file",
    sections: [
      { title: "Using the service", body: "Accounts, credentials and access must be used only for authorised purposes.", icon: "key" },
      { title: "Data permissions", body: "Use, export and retention depend on the applicable provider licence and plan.", icon: "database" },
      { title: "Fees and credits", body: "Billable events, expiry, overage, auto top-up and VAT must be confirmed at purchase.", icon: "wallet" },
      { title: "Service changes", body: "Material product or commercial changes should be communicated through clear notices.", icon: "help" },
    ],
  },
};

function ContentPage({ page, navigate }: { page: Exclude<ContentPageKey, "create-account">; navigate: (v: Page) => void }) {
  const content = contentPages[page];
  const productPage = ["postcode-lookup", "address-finder", "api-access", "bulk-processing"].includes(page);
  const destinations: Partial<Record<ContentPageKey, Page>> = {
    "postcode-lookup": "postcode", "address-finder": "address", "api-access": "developers", "bulk-processing": "signin",
  };
  return <><Header navigate={navigate} /><main className="content-page">
    <section className="content-hero section">
      <div className="content-hero-copy"><Badge>{content.category}</Badge><h1>{content.title}</h1><p>{content.intro}</p><div className="content-actions"><Button onClick={() => navigate(destinations[page] || "create-account")} icon="arrow">{content.primary || (page === "contact" ? "Send an enquiry" : "Create an account")}</Button>{productPage && <Button variant="secondary" onClick={() => navigate("pricing")}>View pricing</Button>}</div></div>
      <div className={`content-visual visual-${page}`}><span className="visual-grid" /><span className="visual-tile tile-back"><Icon name={content.icon} size={34} /></span><span className="visual-tile tile-front"><Icon name={page === "system-status" ? "check" : page === "data-sources" ? "database" : "location"} size={28} /></span><div className="visual-caption"><i /><span>{page === "system-status" ? "Demo systems operational" : "PostcodePulse"}</span></div></div>
    </section>
    {page === "help-centre" && <section className="content-search section"><Icon name="search" /><input aria-label="Search help centre" placeholder="Search the help centre" /><kbd>Enter</kbd></section>}
    {page === "system-status" && <section className="status-summary section"><div><i /><strong>All demo systems operational</strong><span>Last checked moments ago</span></div><button>Subscribe to demo updates <Icon name="arrow" /></button></section>}
    <section className="content-sections section"><div className="eyebrow">{productPage ? "Built for dependable workflows" : content.category}</div><h2>{productPage ? "Everything you need, clearly explained" : page === "resources" ? "Browse resources" : "The important details"}</h2><div className="content-card-grid">{content.sections.map((section) => <article key={section.title}><span><Icon name={section.icon} /></span><h3>{section.title}</h3><p>{section.body}</p><button>Learn more <Icon name="arrow" /></button></article>)}</div></section>
    {productPage && <section className="product-demo-band"><div className="section"><div><Badge tone="neutral">WORKING-STYLE DEMO</Badge><h2>See the data before you integrate</h2><p>Example fields are clearly separated by dataset, availability and provenance.</p><ul><li><Icon name="check" />Source and update information</li><li><Icon name="check" />Explicit precision labels</li><li><Icon name="check" />Unsupported fields shown as unavailable</li></ul></div><div className="mini-response"><div><span>DEMO RESPONSE</span><button><Icon name="copy" /> Copy</button></div><code><b>"postcode"</b>: "SW1A 2AA"<br /><b>"status"</b>: "current"<br /><b>"precision"</b>: "postcode_centroid"<br /><b>"source"</b>: "illustrative_dataset"</code></div></div></section>}
    <section className="content-cta section"><div><Badge tone="neutral">PostcodePulse</Badge><h2>{productPage ? "Ready to try it?" : "Need a little more help?"}</h2><p>{productPage ? "Start with a free public lookup or create a test project." : "Explore the help centre or contact the appropriate team."}</p></div><Button variant="dark" onClick={() => navigate(productPage ? "create-account" : "contact")} icon="arrow">{productPage ? "Create an account" : "Contact us"}</Button></section>
  </main><Footer navigate={navigate} /></>;
}

function CreateAccount({ navigate }: { navigate: (v: Page) => void }) {
  const [step, setStep] = useState(1);
  const [useCase, setUseCase] = useState("Build address autocomplete");
  const [firstName, setFirstName] = useState("Emma");
  const [lastName, setLastName] = useState("Morgan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("Northstar Retail");
  const [projectName, setProjectName] = useState("Checkout integration");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const finish = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        use_case: useCase,
        organisation_name: organisationName,
        project_name: projectName,
      });
      setSession(res.data.token, res.data.user, res.data.organisation);
      navigate("dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  return <main className="register-page">
    <header><Logo onClick={() => navigate("home")} /><div><span>Already have an account?</span><Button variant="secondary" onClick={() => navigate("signin")}>Sign in</Button></div></header>
    <div className="register-layout">
      <aside><Badge tone="neutral">GET STARTED</Badge><h1>Create your PostcodePulse account</h1><p>Set up a secure test workspace. No payment details are needed for this demo.</p><div className="register-progress">{["Your details", "Your use case", "Organisation"].map((label, i) => <div className={step >= i + 1 ? "active" : ""} key={label}><span>{step > i + 1 ? <Icon name="check" size={14} /> : i + 1}</span><div><strong>{label}</strong><small>{i === 0 ? "Account and password" : i === 1 ? "Tailor your workspace" : "Create your first project"}</small></div></div>)}</div><div className="register-assurance"><Icon name="shield" /><span>Restricted test credentials by default. Server-side secrets are shown only once.</span></div></aside>
      <section className="register-form">
        <div className="step-count">STEP {step} OF 3</div>
        {step === 1 && <><h2>Tell us about you</h2><p>Use your work details to create the workspace owner.</p><div className="form-row"><label><span>First name</span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Emma" /></label><label><span>Last name</span><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Morgan" /></label></div><label><span>Work email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="emma@company.co.uk" /></label><label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters" /><small>Use 12 or more characters with a number and symbol.</small></label><label className="consent"><input type="checkbox" /><span>I agree to the illustrative <button type="button" onClick={() => navigate("terms")}>Terms</button> and acknowledge the <button type="button" onClick={() => navigate("privacy")}>Privacy information</button>.</span></label></>}
        {step === 2 && <><h2>What will you use PostcodePulse for?</h2><p>This helps us tailor your onboarding checklist.</p><div className="use-case-options">{["Build address autocomplete", "Validate UK postcodes", "Clean existing customer data", "Explore the API", "Something else"].map((item) => <button type="button" className={useCase === item ? "selected" : ""} onClick={() => setUseCase(item)} key={item}><span><Icon name={item.includes("autocomplete") ? "building" : item.includes("postcodes") ? "location" : item.includes("data") ? "database" : "code"} /></span><strong>{item}</strong><i><Icon name="check" size={14} /></i></button>)}</div></>}
        {step === 3 && <><h2>Create your organisation</h2><p>You can invite colleagues and change these details later.</p><label><span>Organisation name</span><input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} /></label><label><span>First project name</span><input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label><div className="environment-choice"><div><span><Icon name="layers" /></span><div><strong>Test environment</strong><small>Mock responses and no billable provider retrievals</small></div></div><Badge tone="green">Recommended</Badge></div><div className="register-note"><Icon name="key" /><span>Your first restricted test key will be generated during onboarding.</span></div></>}
        {error && <p className="register-note"><Icon name="shield" /><span>{error}</span></p>}
        <div className="register-actions">{step > 1 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button> : <span />}<Button onClick={() => step < 3 ? setStep(step + 1) : void finish()} icon="arrow">{step === 3 ? (loading ? "Creating…" : "Create workspace") : "Continue"}</Button></div>
      </section>
    </div>
  </main>;
}

function RequireAuth({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  if (!isAuthenticated()) {
    return <Navigate to={staff ? pathFor("admin-login") : pathFor("signin")} replace />;
  }
  if (staff && !getUser()?.is_staff) {
    return <Navigate to={pathFor("dashboard")} replace />;
  }
  return <>{children}</>;
}


function PaymentCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming payment…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = `/api/v1/payment/lotpayment/callback${location.search}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (typeof body.redirect_url === "string" && body.redirect_url) {
          window.location.href = body.redirect_url;
          return;
        }
        const status = body.status === "success" ? "success" : "failure";
        navigate(`/payment/result?status=${status}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not confirm payment");
        setMessage("Payment confirmation failed");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [location.search, navigate]);

  return (
    <div className="workspace-page" style={{ maxWidth: 520, margin: "4rem auto" }}>
      <div className="dash-card" style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{message}</h1>
        {error ? <p>{error}</p> : <p>Please wait while we finish updating your plan.</p>}
      </div>
    </div>
  );
}

function PaymentResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const status = (params.get("status") || "").toLowerCase();
  const success = status === "success";
  const planName = params.get("plan_name");
  const message = params.get("message");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate(success ? "/dashboard/billing?status=success" : "/dashboard/billing?status=failure", { replace: true });
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [navigate, success]);

  return (
    <div className="workspace-page" style={{ maxWidth: 520, margin: "4rem auto" }}>
      <div className="dash-card" style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{success ? "Payment successful" : "Payment failed"}</h1>
        <p>
          {success
            ? `Your ${planName || "plan"} is now active. Redirecting to billing…`
            : message || "Your current plan was left unchanged. Redirecting to billing…"}
        </p>
        <Button onClick={() => navigate(success ? "/dashboard/billing?status=success" : "/dashboard/billing?status=failure")}>
          Go to billing
        </Button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const navigate = useAppNavigate();
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.me()
      .then((res) => setSession(token, res.data.user, res.data.organisation))
      .catch(() => {});
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home navigate={navigate} />} />
      <Route path="/postcode" element={<ResultPage key={getLastPostcodeQuery()} navigate={navigate} />} />
      <Route path="/address" element={<AddressPage key={`${getLastAddressPostcode()}|${getLastAddressFilter()}`} navigate={navigate} />} />
      <Route path="/pricing" element={<Pricing navigate={navigate} />} />
      <Route path="/developers" element={<Developers navigate={navigate} />} />
      <Route path="/api-docs" element={<ApiDocsPage navigate={navigate} />} />
      <Route path="/signin" element={<SignIn navigate={navigate} />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/register" element={<CreateAccount navigate={navigate} />} />
      <Route path="/create-account" element={<Navigate to="/register" replace />} />
      <Route path="/admin/login" element={<SignIn navigate={navigate} variant="admin" />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout navigate={navigate} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="billing/checkout" element={<BillingCheckoutPage />} />
        {Object.values(dashboardSections).map((slug) => (
          <Route key={slug} path={slug} element={<DashboardSectionPage />} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireAuth staff>
            <AdminLayout navigate={navigate} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="operations" replace />} />
        {Object.values(adminSections).map((slug) => (
          <Route key={slug} path={slug} element={<AdminSectionPage />} />
        ))}
        <Route path="*" element={<Navigate to="/admin/operations" replace />} />
      </Route>
      {contentPageKeys.map((page) => (
        <Route key={page} path={`/${page}`} element={<ContentPage page={page} navigate={navigate} />} />
      ))}
      <Route path="/payment/lotpayment/callback" element={<PaymentCallbackPage />} />
      <Route path="/payment/result" element={<PaymentResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
