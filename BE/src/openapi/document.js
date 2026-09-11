import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  listLocationsQuerySchema,
  listAdminLocationsQuerySchema,
  createLocationSchema,
  updateLocationSchema,
} from "../features/locations/index.js";
import {
  listWorkspacesQuerySchema,
  availabilityQuerySchema,
  listAdminWorkspacesQuerySchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "../features/workspaces/index.js";
import {
  listAmenitiesQuerySchema,
  listAdminAmenitiesQuerySchema,
  createAmenitySchema,
  updateAmenitySchema,
} from "../features/amenities/index.js";
import {
  createBookingSchema,
  createAdminBookingSchema,
  updateAdminBookingSchema,
  listBookingsQuerySchema,
  listAdminBookingsQuerySchema,
  calendarQuerySchema,
} from "../features/bookings/index.js";
import {
  paymentMethodsQuerySchema,
  createChargeSchema,
  refundSchema,
  listAdminPaymentsQuerySchema,
} from "../features/payments/index.js";
import { updateSettingsSchema } from "../features/settings/index.js";
import {
  overviewQuerySchema,
  revenueQuerySchema,
  occupancyQuerySchema,
  paymentsReportQuerySchema,
  activityQuerySchema,
  exportQuerySchema,
} from "../features/reports/index.js";
import {
  updateMeSchema,
  listUsersQuerySchema,
  createUserSchema,
  adminUpdateUserSchema,
  banUserSchema,
} from "../features/users/index.js";

const OPENAPI_VERSION = "3.1.0";
const API_VERSION = "2.0.0";

/** A generic "some JSON object" placeholder — this API has no Zod schemas modeling response DTOs (those are plain mapper functions), so response bodies are documented as shape-free success payloads rather than hand-typed duplicates of the mapper output. */
const successBody = z.record(z.string(), z.unknown());

/** Mirrors `shared/middleware/error-handler.js`'s envelope exactly. */
const errorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).nullable(),
  }),
});

const idParam = z.object({ id: z.string().uuid() });
const slugParam = z.object({ slug: z.string() });
const referenceParam = z.object({ reference: z.string() });
// get/patch/delete all share one path — named once so it's not duplicated 3x.
const ADMIN_BOOKING_BY_ID_PATH = "/admin/bookings/{id}";
const ADMIN_USER_BY_ID_PATH = "/admin/users/{id}";
const JSON_CONTENT_TYPE = "application/json";

/**
 * @param {string} description
 * @returns {import("zod-openapi").ZodOpenApiResponseObject}
 */
function json(description) {
  return { description, content: { [JSON_CONTENT_TYPE]: { schema: successBody } } };
}

/**
 * @param {string} description
 * @returns {import("zod-openapi").ZodOpenApiResponseObject}
 */
function errorResponse(description) {
  return { description, content: { [JSON_CONTENT_TYPE]: { schema: errorBody } } };
}

const STANDARD_ERRORS = {
  401: errorResponse("Not signed in"),
  403: errorResponse("Signed in, but not permitted"),
  404: errorResponse("Not found"),
  422: errorResponse("Validation failed"),
};

const SESSION_COOKIE = [{ sessionCookie: [] }];

/**
 * One entry per real Express route (method + path), the level a
 * technical spec has to operate at — `users.md`'s own table folds
 * `ban`/`unban` into a single documented row, but they are two distinct
 * routes and get two distinct operations here.
 * @typedef {{
 *   method: "get"|"post"|"put"|"patch"|"delete", path: string, tag: string, summary: string,
 *   security?: Array<Record<string, string[]>>,
 *   query?: import("zod").ZodType, body?: import("zod").ZodType,
 *   params?: import("zod").ZodType,
 *   successStatus?: number, successDescription?: string,
 * }} RouteSpec
 */

/** @type {RouteSpec[]} */
const ROUTES = [
  // ── Locations ──────────────────────────────────────────────
  {
    method: "get",
    path: "/locations",
    tag: "Locations",
    summary: "List active locations",
    query: listLocationsQuerySchema,
  },
  {
    method: "get",
    path: "/locations/{slug}",
    tag: "Locations",
    summary: "Get a location by slug",
    params: slugParam,
  },
  {
    method: "get",
    path: "/admin/locations",
    tag: "Locations",
    summary: "Admin: list all locations",
    security: SESSION_COOKIE,
    query: listAdminLocationsQuerySchema,
  },
  {
    method: "post",
    path: "/admin/locations",
    tag: "Locations",
    summary: "Admin: create a location",
    security: SESSION_COOKIE,
    body: createLocationSchema,
    successStatus: 201,
  },
  {
    method: "patch",
    path: "/admin/locations/{id}",
    tag: "Locations",
    summary: "Admin: update a location",
    security: SESSION_COOKIE,
    params: idParam,
    body: updateLocationSchema,
  },
  {
    method: "delete",
    path: "/admin/locations/{id}",
    tag: "Locations",
    summary: "Admin: delete a location",
    security: SESSION_COOKIE,
    params: idParam,
    successStatus: 204,
  },

  // ── Workspaces ─────────────────────────────────────────────
  {
    method: "get",
    path: "/workspaces",
    tag: "Workspaces",
    summary: "List bookable workspaces",
    query: listWorkspacesQuerySchema,
  },
  {
    method: "get",
    path: "/workspaces/{id}/availability",
    tag: "Workspaces",
    summary: "Get a workspace's open slots for a day",
    params: idParam,
    query: availabilityQuerySchema,
  },
  {
    method: "get",
    path: "/workspaces/{id}",
    tag: "Workspaces",
    summary: "Get a workspace by id",
    params: idParam,
  },
  {
    method: "get",
    path: "/admin/workspaces",
    tag: "Workspaces",
    summary: "Admin: list all workspaces",
    security: SESSION_COOKIE,
    query: listAdminWorkspacesQuerySchema,
  },
  {
    method: "post",
    path: "/admin/workspaces",
    tag: "Workspaces",
    summary: "Admin: create a workspace",
    security: SESSION_COOKIE,
    body: createWorkspaceSchema,
    successStatus: 201,
  },
  {
    method: "patch",
    path: "/admin/workspaces/{id}",
    tag: "Workspaces",
    summary: "Admin: update a workspace",
    security: SESSION_COOKIE,
    params: idParam,
    body: updateWorkspaceSchema,
  },
  {
    method: "delete",
    path: "/admin/workspaces/{id}",
    tag: "Workspaces",
    summary: "Admin: delete a workspace",
    security: SESSION_COOKIE,
    params: idParam,
    successStatus: 204,
  },

  // ── Amenities ──────────────────────────────────────────────
  {
    method: "get",
    path: "/amenities",
    tag: "Amenities",
    summary: "List amenities",
    query: listAmenitiesQuerySchema,
  },
  {
    method: "get",
    path: "/admin/amenities",
    tag: "Amenities",
    summary: "Admin: list amenities with usage counts",
    security: SESSION_COOKIE,
    query: listAdminAmenitiesQuerySchema,
  },
  {
    method: "post",
    path: "/admin/amenities",
    tag: "Amenities",
    summary: "Admin: create an amenity",
    security: SESSION_COOKIE,
    body: createAmenitySchema,
    successStatus: 201,
  },
  {
    method: "patch",
    path: "/admin/amenities/{id}",
    tag: "Amenities",
    summary: "Admin: rename an amenity",
    security: SESSION_COOKIE,
    params: idParam,
    body: updateAmenitySchema,
  },
  {
    method: "delete",
    path: "/admin/amenities/{id}",
    tag: "Amenities",
    summary: "Admin: delete an amenity",
    security: SESSION_COOKIE,
    params: idParam,
    successStatus: 204,
  },

  // ── Bookings ───────────────────────────────────────────────
  {
    method: "post",
    path: "/bookings",
    tag: "Bookings",
    summary: "Create a booking",
    security: SESSION_COOKIE,
    body: createBookingSchema,
    successStatus: 201,
  },
  {
    method: "get",
    path: "/bookings",
    tag: "Bookings",
    summary: "List the caller's own bookings",
    security: SESSION_COOKIE,
    query: listBookingsQuerySchema,
  },
  {
    method: "get",
    path: "/bookings/{reference}",
    tag: "Bookings",
    summary: "Get one of the caller's bookings by reference",
    security: SESSION_COOKIE,
    params: referenceParam,
  },
  {
    method: "patch",
    path: "/bookings/{id}/cancel",
    tag: "Bookings",
    summary: "Cancel a booking",
    security: SESSION_COOKIE,
    params: idParam,
  },
  {
    method: "get",
    path: "/admin/bookings/calendar",
    tag: "Bookings",
    summary: "Staff: calendar view over a date range",
    security: SESSION_COOKIE,
    query: calendarQuerySchema,
  },
  {
    method: "get",
    path: "/admin/bookings",
    tag: "Bookings",
    summary: "Staff: list all bookings",
    security: SESSION_COOKIE,
    query: listAdminBookingsQuerySchema,
  },
  {
    method: "post",
    path: "/admin/bookings",
    tag: "Bookings",
    summary: "Staff: create a walk-in booking",
    security: SESSION_COOKIE,
    body: createAdminBookingSchema,
    successStatus: 201,
  },
  {
    method: "get",
    path: ADMIN_BOOKING_BY_ID_PATH,
    tag: "Bookings",
    summary: "Staff: get a booking's full detail",
    security: SESSION_COOKIE,
    params: idParam,
  },
  {
    method: "patch",
    path: ADMIN_BOOKING_BY_ID_PATH,
    tag: "Bookings",
    summary: "Staff: update a booking",
    security: SESSION_COOKIE,
    params: idParam,
    body: updateAdminBookingSchema,
  },
  {
    method: "delete",
    path: ADMIN_BOOKING_BY_ID_PATH,
    tag: "Bookings",
    summary: "Admin: delete a booking",
    security: SESSION_COOKIE,
    params: idParam,
    successStatus: 204,
  },

  // ── Payments ───────────────────────────────────────────────
  {
    method: "get",
    path: "/payment-methods",
    tag: "Payments",
    summary: "List available payment methods",
    query: paymentMethodsQuerySchema,
  },
  {
    method: "post",
    path: "/bookings/{id}/payments",
    tag: "Payments",
    summary: "Create a checkout session for a booking",
    security: SESSION_COOKIE,
    params: idParam,
    body: createChargeSchema,
    successStatus: 201,
  },
  {
    method: "get",
    path: "/bookings/{reference}/payment",
    tag: "Payments",
    summary: "Get the latest payment status for a booking",
    security: SESSION_COOKIE,
    params: referenceParam,
  },
  {
    method: "post",
    path: "/webhooks/paybridge",
    tag: "Payments",
    summary: "PayBridge webhook — Ed25519-signature verified, not session-authenticated",
  },
  {
    method: "get",
    path: "/admin/payments",
    tag: "Payments",
    summary: "Admin: list payments",
    security: SESSION_COOKIE,
    query: listAdminPaymentsQuerySchema,
  },
  {
    method: "get",
    path: "/admin/payments/{id}",
    tag: "Payments",
    summary: "Admin: get a payment's full record",
    security: SESSION_COOKIE,
    params: idParam,
  },
  {
    method: "post",
    path: "/admin/payments/{id}/refund",
    tag: "Payments",
    summary: "Admin: refund a payment",
    security: SESSION_COOKIE,
    params: idParam,
    body: refundSchema,
    successStatus: 201,
  },

  // ── Settings ───────────────────────────────────────────────
  {
    method: "get",
    path: "/settings/public",
    tag: "Settings",
    summary: "Get the public subset of platform settings",
  },
  {
    method: "get",
    path: "/admin/settings",
    tag: "Settings",
    summary: "Admin: get all platform settings",
    security: SESSION_COOKIE,
  },
  {
    method: "put",
    path: "/admin/settings",
    tag: "Settings",
    summary: "Admin: replace platform settings",
    security: SESSION_COOKIE,
    body: updateSettingsSchema,
  },

  // ── Reports ────────────────────────────────────────────────
  {
    method: "get",
    path: "/admin/reports/overview",
    tag: "Reports",
    summary: "Staff: dashboard tiles for one day",
    security: SESSION_COOKIE,
    query: overviewQuerySchema,
  },
  {
    method: "get",
    path: "/admin/reports/revenue",
    tag: "Reports",
    summary: "Admin: revenue report over a date range",
    security: SESSION_COOKIE,
    query: revenueQuerySchema,
  },
  {
    method: "get",
    path: "/admin/reports/occupancy",
    tag: "Reports",
    summary: "Admin: workspace occupancy over a date range",
    security: SESSION_COOKIE,
    query: occupancyQuerySchema,
  },
  {
    method: "get",
    path: "/admin/reports/payments",
    tag: "Reports",
    summary: "Admin: payments ledger",
    security: SESSION_COOKIE,
    query: paymentsReportQuerySchema,
  },
  {
    method: "get",
    path: "/admin/activity",
    tag: "Reports",
    summary: "Staff: recent-activity feed",
    security: SESSION_COOKIE,
    query: activityQuerySchema,
  },
  {
    method: "get",
    path: "/admin/reports/export",
    tag: "Reports",
    summary: "Admin: streamed CSV export",
    security: SESSION_COOKIE,
    query: exportQuerySchema,
  },

  // ── Users ──────────────────────────────────────────────────
  {
    method: "get",
    path: "/me",
    tag: "Users",
    summary: "Get the caller's own profile",
    security: SESSION_COOKIE,
  },
  {
    method: "patch",
    path: "/me",
    tag: "Users",
    summary: "Update the caller's own profile",
    security: SESSION_COOKIE,
    body: updateMeSchema,
  },
  {
    method: "get",
    path: "/admin/users",
    tag: "Users",
    summary: "Admin: list users",
    security: SESSION_COOKIE,
    query: listUsersQuerySchema,
  },
  {
    method: "post",
    path: "/admin/users",
    tag: "Users",
    summary: "Admin: create a user",
    security: SESSION_COOKIE,
    body: createUserSchema,
    successStatus: 201,
  },
  {
    method: "get",
    path: ADMIN_USER_BY_ID_PATH,
    tag: "Users",
    summary: "Admin: get a user's full detail",
    security: SESSION_COOKIE,
    params: idParam,
  },
  {
    method: "patch",
    path: ADMIN_USER_BY_ID_PATH,
    tag: "Users",
    summary: "Admin: update a user",
    security: SESSION_COOKIE,
    params: idParam,
    body: adminUpdateUserSchema,
  },
  {
    method: "delete",
    path: ADMIN_USER_BY_ID_PATH,
    tag: "Users",
    summary: "Admin: delete a user",
    security: SESSION_COOKIE,
    params: idParam,
    successStatus: 204,
  },
  {
    method: "post",
    path: "/admin/users/{id}/ban",
    tag: "Users",
    summary: "Admin: ban a user",
    security: SESSION_COOKIE,
    params: idParam,
    body: banUserSchema,
  },
  {
    method: "post",
    path: "/admin/users/{id}/unban",
    tag: "Users",
    summary: "Admin: unban a user",
    security: SESSION_COOKIE,
    params: idParam,
  },

  // ── Auth (Better Auth, auth.md) ────────────────────────────
  {
    method: "post",
    path: "/api/auth/sign-up/email",
    tag: "Auth",
    summary: "Sign up with email + password",
  },
  {
    method: "post",
    path: "/api/auth/sign-in/email",
    tag: "Auth",
    summary: "Sign in with email + password",
  },
  {
    method: "get",
    path: "/api/auth/sign-in/social",
    tag: "Auth",
    summary: "Start a Google OAuth sign-in",
  },
  {
    method: "get",
    path: "/api/auth/callback/google",
    tag: "Auth",
    summary: "Google OAuth callback",
  },
  {
    method: "post",
    path: "/api/auth/sign-out",
    tag: "Auth",
    summary: "Sign out",
    security: SESSION_COOKIE,
  },
  {
    method: "get",
    path: "/api/auth/get-session",
    tag: "Auth",
    summary: "Get the current session, if any",
  },
  {
    method: "post",
    path: "/api/auth/forget-password",
    tag: "Auth",
    summary: "Request a password-reset email — always 200, even for an unknown address",
  },
  {
    method: "post",
    path: "/api/auth/reset-password",
    tag: "Auth",
    summary: "Reset a password with a reset token",
  },
  {
    method: "get",
    path: "/api/auth/verify-email",
    tag: "Auth",
    summary: "Verify an email address with a verification token",
  },
];

const DEFAULT_SUCCESS_STATUS = 200;

/**
 * @param {RouteSpec} route
 * @returns {import("zod-openapi").ZodOpenApiResponsesObject}
 */
function responsesFor(route) {
  const status = route.successStatus ?? DEFAULT_SUCCESS_STATUS;
  return {
    [status]: json(route.successDescription ?? "Success"),
    ...(route.security ? { 401: STANDARD_ERRORS[401], 403: STANDARD_ERRORS[403] } : {}),
    ...(route.params ? { 404: STANDARD_ERRORS[404] } : {}),
    ...(route.body || route.query ? { 422: STANDARD_ERRORS[422] } : {}),
  };
}

/**
 * @param {RouteSpec} route
 * @returns {import("zod-openapi").ZodOpenApiParameters | undefined}
 */
function requestParamsFor(route) {
  if (!route.query && !route.params) return undefined;
  return {
    ...(route.params ? { path: route.params } : {}),
    ...(route.query ? { query: route.query } : {}),
  };
}

/**
 * @param {RouteSpec} route
 * @returns {[string, import("zod-openapi").ZodOpenApiOperationObject]}
 */
function toOperation(route) {
  const requestParams = requestParamsFor(route);
  const operation = /** @type {import("zod-openapi").ZodOpenApiOperationObject} */ ({
    tags: [route.tag],
    summary: route.summary,
    ...(route.security ? { security: route.security } : {}),
    ...(requestParams ? { requestParams } : {}),
    ...(route.body
      ? { requestBody: { content: { [JSON_CONTENT_TYPE]: { schema: route.body } } } }
      : {}),
    responses: responsesFor(route),
  });
  return [route.method, operation];
}

/** @returns {Record<string, import("zod-openapi").ZodOpenApiPathItemObject>} */
function buildPaths() {
  /** @type {Record<string, import("zod-openapi").ZodOpenApiPathItemObject>} */
  const paths = {};
  for (const route of ROUTES) {
    const [method, operation] = toOperation(route);
    paths[route.path] = { ...paths[route.path], [method]: operation };
  }
  return paths;
}

/**
 * Builds the OpenAPI document straight from this app's own Zod
 * validation schemas — every request body/query/params shape here is
 * the exact schema `validate()` enforces at runtime, never a
 * hand-typed duplicate that can drift from it (development-phases.md
 * Phase 8).
 * @returns {ReturnType<typeof createDocument>}
 */
export function buildOpenApiDocument() {
  return createDocument({
    openapi: OPENAPI_VERSION,
    info: {
      title: "TerraSpace API",
      version: API_VERSION,
      description: "Coworking-space booking platform — V2 backend.",
    },
    servers: [{ url: "/api/v1", description: "Versioned feature API" }],
    paths: buildPaths(),
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description: "Better Auth session cookie — set by /api/auth/sign-in/*.",
        },
      },
    },
  });
}
