import { createContext, useContext, useMemo, type ReactNode } from "react";

export type Locale = "en" | "id";

export const BASE_TO_USD_RATE = 1 / 16000;
/** Multiply a USD amount by this to get the raw base-currency value stored in the database. */
export const USD_TO_BASE_RATE = 16000;

export const dict = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.spacesDropdown": "Workspaces",
    "nav.spacesDesc": "Event Space, Johor Bahru",
    "nav.locations": "Locations",
    "nav.locationsDesc": "Johor Bahru",
    "nav.workspaces": "Workspaces",
    "nav.amenities": "Amenities",
    "nav.amenitiesDesc": "1 Gbps Wi-Fi, 4K screen & smart door",
    "nav.plansDropdown": "Pricing",
    "nav.pricing": "Pricing",
    "nav.pricingDesc": "Transparent hourly, daily & monthly rates",
    "nav.membership": "Membership",
    "nav.membershipDesc": "Hot desks, dedicated desks & credits",
    "nav.enterprise": "Enterprise",
    "nav.enterpriseDesc": "Custom agreements for teams & companies",
    "nav.how": "How It Works",
    "nav.help": "Help Center",
    "nav.menu": "Menu",

    // CTA
    "cta.signup": "Sign Up",
    "cta.book": "Book a Space",
    "cta.bookNow": "Book Now",
    "cta.loginToBook": "Log in to Book",
    "cta.dashboard": "My Account",
    "cta.logout": "Log out",
    "cta.login": "Log in",
    "cta.viewAll": "View All",
    "cta.details": "Details",
    "cta.explore": "Explore Workspaces",
    "cta.checkAvailability": "Check Availability",
    "cta.continue": "Continue to Review",
    "cta.tryDemo": "Simulate At Venue (Demo)",

    // Auth
    "auth.loginTitle": "Welcome back",
    "auth.loginSubtitle": "Sign in to book a space and manage your access.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full name",
    "auth.phone": "Phone",
    "auth.company": "Company (optional)",
    "auth.noAccount": "New to TerraSpace?",
    "auth.createAccount": "Create an account",
    "auth.haveAccount": "Already have an account?",
    "auth.signingIn": "Signing in…",
    "auth.creating": "Creating account…",
    "auth.loginRequired": "Please log in to continue with your booking.",
    "auth.loginToBookNotice":
      "Please sign in to your account first to choose time and book this space.",
    "auth.loginToSelectSlots": "Log in to select time and book",

    // Dashboard & Door Access
    "dash.title": "My Account",
    "dash.bookings": "My Bookings & Smart Access",
    "dash.empty": "You have no bookings yet.",
    "dash.upcoming": "Active & Upcoming Bookings",
    "dash.past": "Past & Completed Bookings",
    "dash.cancel": "Cancel Booking",
    "dash.cancelled": "Cancelled",
    "dash.confirmed": "Confirmed",
    "dash.viewPass": "View QR Pass",
    "dash.closePass": "Hide QR Pass",
    "dash.doorAccess": "Smart Door Access",
    "dash.openDoor": "Unlock Door",
    "dash.unlocking": "Verifying Proximity & Unlocking…",
    "dash.doorUnlocked": "Door Unlocked! Access granted for 10 seconds.",
    "dash.doorLocked": "Door Locked",
    "dash.outOfRadius": "Outside the configured venue access radius ({dist} away). Move closer.",
    "dash.locationNotConfigured": "This location does not have access coordinates configured yet.",
    "dash.inRadius": "Within venue radius ({dist})",
    "dash.viewDetails": "Booking Summary & Access Info",
    "dash.amenitiesIncluded": "Amenities Included",
    "dash.accessWindow": "Valid Access Window",
    "dash.wifiAccess": "High-Speed Wi-Fi",
    "dash.wifiPass": "Password",
    "dash.reference": "Reference Code",
    "dash.method": "Payment Method",
    "dash.totalPaid": "Total Amount Paid",

    // Workspace & Calendar Detail
    "detail.availability": "Hourly Availability Schedule",
    "detail.availabilityHint":
      "Visual Google Calendar day timeline from 8:00 AM to 5:00 PM. Booked blocks are locked.",
    "detail.booked": "Booked",
    "detail.free": "Available",
    "detail.selected": "Selected",
    "detail.yourSelection": "Your Booking Selection",
    "detail.reservedSlot": "Reserved / Booked",
    "detail.currentTime": "Current Time",
    "detail.overlapError":
      "Selected time overlaps with an existing booking. Please pick another available time slot on the calendar.",
    "detail.overlapBadge": "Time Conflict",
    "detail.date": "Booking Date",
    "detail.startTime": "Start Time",
    "detail.endTime": "End Time",
    "detail.customTimeHint": "Enter your preferred start and end time (hours and minutes).",
    "detail.invalidTime": "End time must be at least 30 minutes after start time.",
    "detail.duration": "Duration",
    "detail.estTotal": "Estimated Total",
    "detail.selectSlot": "Enter booking time",
    "detail.amenities": "Included Amenities",
    "detail.cancellation": "Cancellation Policy",
    "detail.accessInfo": "Access Information",
    "detail.accessDesc":
      "Your smart credential opens the venue entrance and this room from 30 minutes before your start time until 30 minutes after end time.",

    // Review & Confirmation
    "book.review": "Review your booking",
    "book.total": "Total",
    "book.subtotal": "Subtotal",
    "book.tax": "Tax (11%)",
    "book.discount": "Promo Discount",
    "book.pay": "Confirm & Pay",
    "book.processing": "Processing payment…",
    "book.confirmed": "Booking Confirmed",
    "book.confirmedSub": "Payment successful. Your smart credential and access pass are ready.",
    "book.qrTitle": "Your QR Access Pass",
    "book.qrHint":
      "Scan this QR pass at the smart turnstile or entrance scanner. A copy is also saved to your account and email.",
    "book.addGuest": "Invite a Guest",
    "book.addGuestHint":
      "Guests receive an instant digital access pass valid for your booking duration.",
    "book.paymentMethod": "Select Payment Method",

    // Common
    "common.hours": "hours",
    "common.hour": "hour",
    "common.mins": "mins",
    "common.loading": "Loading…",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.all": "All",
    "common.price": "Price",
    "common.floor": "Floor",
    "common.location": "Location",
    "common.perHour": "per hour",
    "common.perDay": "per day",
    "common.perMonth": "per month",

    // Home Page Specific
    "home.heroTitle": "Find your premium workspace",
    "home.heroSubtitle":
      "Live inventory across premier locations. Reserve by exact hour and minute, and walk in with your digital access prepared.",
    "home.stats": "Live inventory updated in real-time · Fast 2-minute instant booking",
    "home.typesTitle": "Workspace Catalog",
    "home.typesSubtitle":
      "Choose the perfect room designed for high-focus meetings and collaborative team workshops.",
    "home.featuresTitle": "Why TerraSpace",
    "home.featuresSubtitle": "Frictionless digital access with enterprise-grade comfort.",
  },
} satisfies Record<"en", Record<string, string>>;

export type TranslationKey = keyof (typeof dict)["en"];

type Ctx = {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  money: (amount: number) => string;
  moneyText: (text: string) => string;
  formatDuration: (minutes: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

/** Single fixed currency (USD). */
export function formatMoney(amount: number) {
  const usd = amount * BASE_TO_USD_RATE;
  return (
    "$" +
    usd.toLocaleString("en-US", {
      minimumFractionDigits: usd < 100 ? 2 : 0,
      maximumFractionDigits: usd < 100 ? 2 : 0,
    })
  );
}

/** Converts inline "amount / month" style copy into the fixed display currency. */
export function convertPriceText(text: string) {
  return text.replace(/Rp\s?([\d.,]+)/g, (_match, digits: string) => {
    const value = Number(digits.replace(/[.,]/g, ""));
    if (!Number.isFinite(value)) return _match;
    return formatMoney(value);
  });
}

export function formatDurationText(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs > 0 && mins > 0)
    return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins > 1 ? "s" : ""}`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  return `${mins} mins`;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale: Locale = "en";

  const value = useMemo<Ctx>(
    () => ({
      locale,
      t: (key, vars) => {
        let text = dict.en?.[key] ?? key;
        if (vars) {
          Object.entries(vars).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          });
        }
        return text;
      },
      money: (amount) => formatMoney(amount),
      moneyText: (text) => convertPriceText(text),
      formatDuration: (minutes) => formatDurationText(minutes),
    }),
    [],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
