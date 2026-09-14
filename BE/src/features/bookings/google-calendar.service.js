import { fetch } from "undici";
import { env } from "../../shared/config/env.js";
import { prisma } from "../../shared/database/client.js";
import { logger } from "../../shared/lib/logger.js";
import { bookingStartInstant, bookingEndInstant } from "./bookings.time.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const EXPIRY_BUFFER_MS = 60_000;
const MS_PER_SECOND = 1000;
const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Builds the event description string for Google Calendar.
 * @param {any} booking
 * @returns {string}
 */
function buildEventDescription(booking) {
  const lines = [
    `Booking Reference: ${booking.reference}`,
    booking.workspace?.name ? `Workspace: ${booking.workspace.name}` : null,
    booking.accessCode ? `Door Access Code: ${booking.accessCode}` : null,
    booking.workspace?.location?.address
      ? `Address: ${booking.workspace.location.address}, ${booking.workspace.location.city ?? ""}`
      : null,
    "",
    "Managed via TerraSpace.",
  ].filter((line) => line !== null);

  return lines.join("\n");
}

/**
 * @param {any} booking
 * @returns {string}
 */
function buildEventLocation(booking) {
  const loc = booking.workspace?.location;
  if (!loc) return "";
  return [loc.name, loc.address, loc.city].filter(Boolean).join(", ");
}

/**
 * Constructs the Google Calendar event payload.
 * @param {any} booking
 * @returns {object}
 */
function buildEventPayload(booking) {
  const loc = booking.workspace?.location;
  const timezone = loc?.timezone || DEFAULT_TIMEZONE;
  const startInstant = bookingStartInstant(booking, timezone);
  const endInstant = bookingEndInstant(booking, timezone);

  return {
    summary: `TerraSpace: ${booking.workspace?.name ?? "Workspace Booking"}`,
    description: buildEventDescription(booking),
    location: buildEventLocation(booking),
    start: {
      dateTime: startInstant.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: endInstant.toISOString(),
      timeZone: timezone,
    },
  };
}

/**
 * Sends the insert request to Google Calendar API.
 * @param {string} accessToken
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
async function postCalendarEvent(accessToken, payload) {
  try {
    const response = await fetch(GOOGLE_CALENDAR_EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, error: errorText };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Service to sync confirmed bookings to a user's primary Google Calendar
 * using the OAuth access token retrieved during sign-in.
 */
export class GoogleCalendarService {
  /**
   * Refreshes an expired Google access token using the stored refresh token.
   * @param {string} refreshToken
   * @returns {Promise<{ accessToken: string, expiresIn: number } | null>}
   */
  async #refreshAccessToken(refreshToken) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      logger.warn("Google OAuth client credentials not configured in environment");
      return null;
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({ errorBody }, "Failed to refresh Google OAuth token");
        return null;
      }

      const data = /** @type {{ access_token: string, expires_in: number }} */ (
        await response.json()
      );
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch (err) {
      logger.error({ err }, "Unexpected error refreshing Google access token");
      return null;
    }
  }

  /**
   * Retrieves a valid Google access token for a user, refreshing if needed.
   * @param {string} userId
   * @returns {Promise<string | null>}
   */
  async getValidAccessToken(userId) {
    const account = await prisma.account.findFirst({
      where: { userId, providerId: "google" },
    });

    if (!account) return null;

    const now = Date.now();
    const isExpired =
      !account.accessToken ||
      (account.accessTokenExpiresAt &&
        account.accessTokenExpiresAt.getTime() - EXPIRY_BUFFER_MS < now);

    if (isExpired) {
      if (!account.refreshToken) {
        logger.warn({ userId }, "Google account has no refresh token to renew session");
        return null;
      }

      const refreshed = await this.#refreshAccessToken(account.refreshToken);
      if (!refreshed) return null;

      const newExpiry = new Date(now + refreshed.expiresIn * MS_PER_SECOND);
      await prisma.account.update({
        where: { id: account.id },
        data: {
          accessToken: refreshed.accessToken,
          accessTokenExpiresAt: newExpiry,
        },
      });

      return refreshed.accessToken;
    }

    return account.accessToken;
  }

  /**
   * Creates an event on the user's primary Google Calendar for a booking.
   * @param {string} userId
   * @param {any} booking
   * @returns {Promise<{ synced: boolean, eventId?: string, htmlLink?: string, reason?: string, error?: string }>}
   */
  async syncBooking(userId, booking) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      return { synced: false, reason: "NO_GOOGLE_ACCOUNT" };
    }

    const payload = buildEventPayload(booking);
    const result = await postCalendarEvent(accessToken, payload);

    if (!result.ok) {
      logger.error(
        { error: result.error, userId, bookingRef: booking.reference },
        "Google Calendar API event creation failed",
      );
      return { synced: false, reason: "API_ERROR", error: result.error };
    }

    const eventData = result.data;
    logger.info(
      { userId, bookingRef: booking.reference, eventId: eventData.id },
      "Successfully synced booking to Google Calendar",
    );

    return {
      synced: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink,
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
