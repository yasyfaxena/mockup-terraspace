import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";
import { APP_CONFIG, CATALOG_STATUS, WORKSPACE_AVAILABILITY } from "@/shared/constants";

const BOOKING_UNIT = "hour";
const AMENITY_DEFAULTS = { category: "General", icon: "tag" } as const;

// A workspace counts as a "desk" (vs a "room") when its admin-configured type
// name contains "desk" (e.g. Hot Desk, Dedicated Desk) — everything else
// (Private Office, Meeting Room, Day Pass, Event Space, etc.) counts as a room.
function isDeskType(type: string): boolean {
  return type.toLowerCase().includes("desk");
}

// Locations are joined to workspaces by slug (no DB foreign key), and the
// public site builds location URLs from this same slug. The admin form only
// checked that the raw input wasn't blank — but characters outside a-z0-9
// (accents, punctuation-only input, non-Latin scripts) get stripped below,
// which could still collapse to an empty string. An empty slug matched the
// "/locations/" index route instead of "/locations/$slug" and matched zero
// workspaces, making a location silently show 0 desks/rooms and $0.00 even
// though it and its workspaces existed and were configured correctly. This
// helper is now the single place slugs are derived, and empty results are
// rejected before anything is written to the database.
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function requireNonEmptySlug(raw: string): string {
  const slug = slugify(raw);
  if (!slug) {
    throw new Error(
      "Slug tidak valid — gunakan huruf dan angka (mis. 'terraspace-johor-bahru').",
    );
  }
  return slug;
}

/* -------------------------------------------------------------------------- */
/* Shared catalog: Admin CMS -> PostgreSQL -> Public Web Client                */
/* -------------------------------------------------------------------------- */

type DbLocation = NonNullable<Awaited<ReturnType<typeof db.location.findFirst>>>;
type DbWorkspace = NonNullable<Awaited<ReturnType<typeof db.workspace.findFirst>>>;

function mapLocation(l: DbLocation) {
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    address: l.address,
    city: l.city,
    image: l.imageUrl,
    hours: l.hours,
    access247: l.access247,
    amenities: l.amenities,
    description: l.description,
    latitude: l.latitude,
    longitude: l.longitude,
    accessRadiusMeters: l.accessRadiusMeters,
    status: l.status,
  };
}

function mapWorkspace(w: DbWorkspace) {
  return {
    id: w.id,
    name: w.name,
    type: w.type,
    locationSlug: w.locationSlug,
    floor: w.floor,
    price: Number(w.price),
    unit: w.unit,
    amenities: w.amenities,
    availability: w.availability,
    slots: w.slots,
    image: w.imageUrl,
    description: w.description,
    cancellation: w.cancellation,
    simpleBooking: w.simpleBooking,
    calendarSync: w.calendarSync,
    qrProvider: w.qrProvider,
  };
}

// Normalizes a slug for comparison so stray whitespace or inconsistent
// casing (which can slip in through manual edits of the admin "Slug" field
// or older data saved before slugs were validated) doesn't silently break
// the location <-> workspace link even when the two values look identical
// in the admin UI.
function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const [locations, allWorkspaces, amenities] = await Promise.all([
    db.location.findMany({
      where: { status: CATALOG_STATUS.active },
      orderBy: { createdAt: "asc" },
    }),
    // Fetch every workspace here (disabled ones included) so that per-location
    // stats below — price range, room totals — reflect the location's real
    // catalog even when some/all of its workspaces are temporarily disabled.
    // Filtering disabled workspaces out before this point was the cause of
    // locations showing "Starting from $0.00" and "Temporarily unavailable"
    // even though the underlying workspace price was set correctly in admin.
    db.workspace.findMany({
      orderBy: { createdAt: "asc" },
    }),
    db.amenity.findMany({
      where: { status: CATALOG_STATUS.active },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const locationRows = locations.map((l) => {
    const targetSlug = normalizeSlug(l.slug);
    const spaces = allWorkspaces.filter((w) => normalizeSlug(w.locationSlug) === targetSlug);
    const available = spaces.filter(
      (w) => w.availability === "available" || w.availability === "limited",
    );
    const prices = spaces.map((w) => Number(w.price)).filter((p) => p > 0);
    const types = [...new Set(spaces.map((w) => w.type))];

    // Split into desks vs rooms so each stat reflects the actual admin-configured
    // workspace type, instead of lumping every type into "rooms" and leaving
    // "desks" permanently at 0 regardless of what's in the database.
    const deskSpaces = spaces.filter((w) => isDeskType(w.type));
    const roomSpaces = spaces.filter((w) => !isDeskType(w.type));
    const availableDesks = deskSpaces.filter(
      (w) => w.availability === "available" || w.availability === "limited",
    );
    const availableRooms = roomSpaces.filter(
      (w) => w.availability === "available" || w.availability === "limited",
    );

    return {
      ...mapLocation(l),
      desksAvailable: availableDesks.length,
      desksTotal: deskSpaces.length,
      roomsAvailable: availableRooms.length,
      roomsTotal: roomSpaces.length,
      occupancy: spaces.length
        ? Math.round(((spaces.length - available.length) / spaces.length) * 100)
        : 0,
      priceFrom: prices.length ? Math.min(...prices) : 0,
      availability: available.length
        ? available.length < spaces.length
          ? "limited"
          : "available"
        : "unavailable",
      types,
    };
  });
  // Only non-disabled workspaces should be bookable/browsable on the public site.
  const bookableWorkspaces = allWorkspaces.filter(
    (w) => w.availability !== WORKSPACE_AVAILABILITY.disabled,
  );
  // Same normalization as above: if a workspace's stored locationSlug only
  // differs from its location's real slug by case/whitespace, resolve it to
  // the location's actual (clean) slug here too. Otherwise the location
  // detail page's own `workspaces.filter(w => w.locationSlug === slug)`
  // would miss it even though the stats above just counted it correctly.
  const slugByNormalized = new Map(locations.map((l) => [normalizeSlug(l.slug), l.slug]));
  const resolvedWorkspaces = bookableWorkspaces.map((w) => {
    const resolved = slugByNormalized.get(normalizeSlug(w.locationSlug));
    return resolved ? { ...w, locationSlug: resolved } : w;
  });
  return {
    locations: locationRows,
    workspaces: resolvedWorkspaces.map(mapWorkspace),
    amenities: amenities.map((a) => ({
      id: a.id,
      name: a.name,
      nameId: a.nameId,
      category: a.category,
      icon: a.icon,
    })),
  };
});

export const adminGetCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const [locations, workspaces, amenities] = await Promise.all([
    db.location.findMany({ orderBy: { createdAt: "asc" } }),
    db.workspace.findMany({ orderBy: { createdAt: "asc" } }),
    db.amenity.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return {
    locations: locations.map(mapLocation),
    workspaces: workspaces.map(mapWorkspace),
    amenities: amenities.map((a) => ({
      id: a.id,
      name: a.name,
      nameId: a.nameId,
      category: a.category,
      icon: a.icon,
      status: a.status,
    })),
  };
});

export const adminCreateLocation = createServerFn({ method: "POST" })
  .validator(
    (data: {
      slug: string;
      name: string;
      address: string;
      city: string;
      imageUrl?: string | null;
      hours?: string;
      access247?: boolean;
      amenities?: string[];
      description?: string;
      latitude?: number | null;
      longitude?: number | null;
      accessRadiusMeters?: number;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const slug = requireNonEmptySlug(data.slug);
    return mapLocation(
      await db.location.create({
        data: {
          slug,
          name: data.name.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          imageUrl: data.imageUrl || null,
          hours: data.hours || APP_CONFIG.defaultLocationHours,
          access247: data.access247 ?? false,
          amenities: data.amenities ?? [],
          description: data.description ?? "",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          accessRadiusMeters: data.accessRadiusMeters ?? APP_CONFIG.defaultAccessRadiusMeters,
          status: data.status ?? CATALOG_STATUS.active,
        },
      }),
    );
  });

export const adminUpdateLocation = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      slug?: string;
      name?: string;
      address?: string;
      city?: string;
      imageUrl?: string | null;
      hours?: string;
      access247?: boolean;
      amenities?: string[];
      description?: string;
      latitude?: number | null;
      longitude?: number | null;
      accessRadiusMeters?: number;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const nextSlug = data.slug !== undefined ? requireNonEmptySlug(data.slug) : undefined;

    const updated = await db.$transaction(async (tx) => {
      const current = await tx.location.findUniqueOrThrow({ where: { id: data.id } });

      const result = await tx.location.update({
        where: { id: data.id },
        data: {
          ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.address !== undefined ? { address: data.address.trim() } : {}),
          ...(data.city !== undefined ? { city: data.city.trim() } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
          ...(data.hours !== undefined ? { hours: data.hours } : {}),
          ...(data.access247 !== undefined ? { access247: data.access247 } : {}),
          ...(data.amenities !== undefined ? { amenities: data.amenities } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
          ...(data.accessRadiusMeters !== undefined
            ? { accessRadiusMeters: data.accessRadiusMeters }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

      // Workspaces reference a location by its slug (not by id), and there is no
      // database-level foreign key enforcing that link. Without this, renaming a
      // location's slug orphans every workspace that belonged to it — the
      // workspace keeps its own fields (like floor) but silently loses its
      // location on the public site, since the location lookup no longer matches.
      if (nextSlug !== undefined && nextSlug !== current.slug) {
        await tx.workspace.updateMany({
          where: { locationSlug: current.slug },
          data: { locationSlug: nextSlug },
        });
      }

      return result;
    });

    return mapLocation(updated);
  });

export const adminDeleteLocation = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.location.delete({ where: { id: data.id } });
    return { success: true };
  });

export const adminCreateWorkspace = createServerFn({ method: "POST" })
  .validator(
    (data: {
      locationSlug: string;
      name: string;
      type: string;
      floor?: string;
      price?: number;
      unit?: string;
      amenities?: string[];
      availability?: string;
      slots?: string[];
      imageUrl?: string | null;
      description?: string;
      cancellation?: string;
      simpleBooking?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return mapWorkspace(
      await db.workspace.create({
        data: {
          locationSlug: data.locationSlug,
          name: data.name.trim(),
          type: data.type,
          floor: data.floor ?? "",
          price: BigInt(data.price ?? 0),
          unit: data.unit ?? BOOKING_UNIT,
          amenities: data.amenities ?? [],
          availability: data.availability ?? WORKSPACE_AVAILABILITY.available,
          slots: data.slots ?? [],
          imageUrl: data.imageUrl || null,
          description: data.description ?? "",
          cancellation: data.cancellation ?? "",
          simpleBooking: data.simpleBooking ?? false,
        },
      }),
    );
  });

export const adminUpdateWorkspace = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      locationSlug?: string;
      name?: string;
      type?: string;
      floor?: string;
      price?: number;
      unit?: string;
      amenities?: string[];
      availability?: string;
      slots?: string[];
      imageUrl?: string | null;
      description?: string;
      cancellation?: string;
      simpleBooking?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const updated = await db.workspace.update({
      where: { id: data.id },
      data: {
        ...(data.locationSlug !== undefined ? { locationSlug: data.locationSlug } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.floor !== undefined ? { floor: data.floor } : {}),
        ...(data.price !== undefined ? { price: BigInt(data.price) } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.amenities !== undefined ? { amenities: data.amenities } : {}),
        ...(data.availability !== undefined ? { availability: data.availability } : {}),
        ...(data.slots !== undefined ? { slots: data.slots } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.cancellation !== undefined ? { cancellation: data.cancellation } : {}),
        ...(data.simpleBooking !== undefined ? { simpleBooking: data.simpleBooking } : {}),
      },
    });
    return mapWorkspace(updated);
  });

export const adminDeleteWorkspace = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const bookingCount = await db.booking.count({
      where: { workspaceId: data.id, status: { not: "cancelled" } },
    });
    if (bookingCount) throw new Error("Cannot delete a workspace with active bookings.");
    await db.workspace.delete({ where: { id: data.id } });
    return { success: true };
  });

export const adminCreateAmenity = createServerFn({ method: "POST" })
  .validator(
    (data: { name: string; nameId?: string; category?: string; icon?: string; status?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const a = await db.amenity.create({
      data: {
        name: data.name.trim(),
        nameId: data.nameId?.trim() || data.name.trim(),
        category: data.category || AMENITY_DEFAULTS.category,
        icon: data.icon || AMENITY_DEFAULTS.icon,
        status: data.status || CATALOG_STATUS.active,
      },
    });
    return {
      id: a.id,
      name: a.name,
      nameId: a.nameId,
      category: a.category,
      icon: a.icon,
      status: a.status,
    };
  });

export const adminUpdateAmenity = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      name?: string;
      nameId?: string;
      category?: string;
      icon?: string;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...changes } = data;
    const a = await db.amenity.update({ where: { id }, data: changes });
    return {
      id: a.id,
      name: a.name,
      nameId: a.nameId,
      category: a.category,
      icon: a.icon,
      status: a.status,
    };
  });

export const adminDeleteAmenity = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.amenity.delete({ where: { id: data.id } });
    return { success: true };
  });
