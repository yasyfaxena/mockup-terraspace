export interface CalendarEventDetails {
  title: string;
  description: string;
  location: string;
  bookingDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/**
 * Creates a direct 1-click Google Calendar web link with event details pre-filled.
 * Supported across all modern desktop and mobile browsers without requiring Google API credentials.
 */
export function createGoogleCalendarUrl(event: CalendarEventDetails): string {
  const startISO = `${event.bookingDate.replace(/-/g, "")}T${event.startTime.replace(/:/g, "")}00`;
  const endISO = `${event.bookingDate.replace(/-/g, "")}T${event.endTime.replace(/:/g, "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startISO}/${endISO}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Downloads a standard RFC-5545 .ics file for Apple Calendar, Outlook, and offline calendar apps.
 */
export function downloadIcsFile(event: CalendarEventDetails, filename = "booking.ics"): void {
  const startISO = `${event.bookingDate.replace(/-/g, "")}T${event.startTime.replace(/:/g, "")}00`;
  const endISO = `${event.bookingDate.replace(/-/g, "")}T${event.endTime.replace(/:/g, "")}00`;
  const nowISO = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TerraSpace//Coworking Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@terraspace.com`,
    `DTSTAMP:${nowISO}`,
    `DTSTART:${startISO}`,
    `DTEND:${endISO}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
