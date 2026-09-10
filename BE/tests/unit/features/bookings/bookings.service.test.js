import { describe, it, expect, vi } from "vitest";
import { BookingsService } from "../../../../src/features/bookings/bookings.service.js";
import {
  BookingInPastError,
  AdvanceBookingExceededError,
  BookingMinDurationError,
  SlotTakenError,
  WorkspaceNotBookableError,
  LocationInactiveError,
  CancellationWindowClosedError,
  BookingAlreadyCancelledError,
} from "../../../../src/features/bookings/bookings.errors.js";
import { NotFoundError } from "../../../../src/shared/errors/http-errors.js";

const WORKSPACE_LOCATION = { id: "loc1", slug: "hq", name: "HQ", address: "Addr", city: "City" };

function baseWorkspace(overrides = {}) {
  return {
    id: "ws1",
    name: "Room A",
    type: "meeting_room",
    floor: "1",
    pricePerHour: "50000.00",
    availability: "available",
    cancellationPolicy: "Free cancellation.",
    location: { ...WORKSPACE_LOCATION, status: "active", timezone: "UTC", ...overrides.location },
    ...overrides,
  };
}

/** A createdBooking shape compatible with the mapper (needs `.workspace.location`). */
function createdBookingFrom(input) {
  return {
    id: "bk1",
    userId: input.userId,
    workspaceId: input.workspaceId,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    unitPrice: input.unitPrice,
    durationHours: input.durationHours,
    subtotalAmount: input.subtotalAmount,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    currency: input.currency,
    status: input.status,
    paymentStatus: "pending",
    reference: input.reference,
    accessCode: input.accessCode,
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: null,
    workspace: {
      id: "ws1",
      name: "Room A",
      type: "meeting_room",
      floor: "1",
      imageUrl: null,
      cancellationPolicy: "Free cancellation.",
      location: {
        ...WORKSPACE_LOCATION,
        timezone: "UTC",
        latitude: null,
        longitude: null,
        accessRadiusMeters: 50,
      },
    },
  };
}

/** @param {{ repo?: object, settings?: object, users?: object }} [overrides] */
function makeService(overrides = {}) {
  const repo = {
    findWorkspaceForBooking: vi.fn().mockResolvedValue(baseWorkspace()),
    create: vi.fn().mockImplementation((data) => Promise.resolve(createdBookingFrom(data))),
    findById: vi.fn(),
    findByReference: vi.fn(),
    findManyForUser: vi.fn(),
    findAllAdmin: vi.fn(),
    findByIdAdmin: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findCalendar: vi.fn(),
    ...overrides.repo,
  };
  const settings = {
    getSettings: vi.fn().mockResolvedValue({
      currency: "IDR",
      taxPercent: 11,
      cancellationWindowHours: 24,
      advanceBookingDays: 30,
    }),
    ...overrides.settings,
  };
  const users = {
    getAdminDetail: vi.fn().mockResolvedValue({ id: "usr1" }),
    ...overrides.users,
  };
  const service = new BookingsService({
    bookingsRepository: repo,
    settingsService: settings,
    usersService: users,
  });
  return { service, repo, settings, users };
}

const FUTURE_DATE = "2026-09-15";
const VALID_CREATE = {
  workspaceId: "ws1",
  bookingDate: FUTURE_DATE,
  startTime: "09:00",
  endTime: "12:00",
};

describe("BookingsService.create", () => {
  it("throws NotFoundError when the workspace does not exist", async () => {
    const { service } = makeService({
      repo: { findWorkspaceForBooking: vi.fn().mockResolvedValue(null) },
    });
    await expect(service.create("u1", VALID_CREATE)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws WorkspaceNotBookableError when disabled/maintenance/full", async () => {
    const { service } = makeService({
      repo: {
        findWorkspaceForBooking: vi.fn().mockResolvedValue(baseWorkspace({ availability: "full" })),
      },
    });
    await expect(service.create("u1", VALID_CREATE)).rejects.toBeInstanceOf(
      WorkspaceNotBookableError,
    );
  });

  it("throws LocationInactiveError for an inactive location", async () => {
    const { service } = makeService({
      repo: {
        findWorkspaceForBooking: vi
          .fn()
          .mockResolvedValue(baseWorkspace({ location: { status: "inactive" } })),
      },
    });
    await expect(service.create("u1", VALID_CREATE)).rejects.toBeInstanceOf(LocationInactiveError);
  });

  it("throws BookingInPastError for a start already passed", async () => {
    const { service } = makeService();
    await expect(
      service.create("u1", { ...VALID_CREATE, bookingDate: "2020-01-01" }),
    ).rejects.toBeInstanceOf(BookingInPastError);
  });

  it("throws AdvanceBookingExceededError beyond advanceBookingDays", async () => {
    const { service } = makeService();
    await expect(
      service.create("u1", { ...VALID_CREATE, bookingDate: "2099-01-01" }),
    ).rejects.toBeInstanceOf(AdvanceBookingExceededError);
  });

  it("throws BookingMinDurationError under 30 minutes", async () => {
    const { service } = makeService();
    await expect(
      service.create("u1", { ...VALID_CREATE, startTime: "09:00", endTime: "09:15" }),
    ).rejects.toBeInstanceOf(BookingMinDurationError);
  });

  it("ignores hostile price fields and computes the amount server-side (REG-001)", async () => {
    const { service, repo } = makeService();
    await service.create("u1", {
      ...VALID_CREATE,
      // @ts-expect-error hostile fields a real request could still send
      total: 0,
      totalAmount: "0.00",
      unitPrice: "0.00",
    });

    const created = repo.create.mock.calls[0][0];
    expect(created.unitPrice).toBe("50000.00"); // the workspace's catalog price, not 0
    expect(created.totalAmount).toBeCloseTo(166500, 5);
  });

  it("translates an exclusion-constraint violation into SlotTakenError", async () => {
    const conflictErr = Object.assign(new Error('duplicate key value... code: "23P01"'), {});
    const { service } = makeService({ repo: { create: vi.fn().mockRejectedValue(conflictErr) } });
    await expect(service.create("u1", VALID_CREATE)).rejects.toBeInstanceOf(SlotTakenError);
  });

  it("starts pending — confirmed only once the payments service processes payment_succeeded", async () => {
    const { service } = makeService();
    const dto = await service.create("u1", VALID_CREATE);
    expect(dto.status).toBe("pending");
    expect(dto.paymentStatus).toBe("pending");
  });
});

describe("BookingsService.createStaff", () => {
  it("throws NotFoundError for an unknown userId", async () => {
    const { service, users } = makeService({
      users: { getAdminDetail: vi.fn().mockRejectedValue(new NotFoundError("User not found.")) },
    });
    await expect(
      service.createStaff({ ...VALID_CREATE, userId: "ghost", status: "confirmed" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(users.getAdminDetail).toHaveBeenCalledWith("ghost");
  });

  it("waives the past-date and advance-booking checks", async () => {
    const { service } = makeService();
    const dto = await service.createStaff({
      userId: "usr1",
      workspaceId: "ws1",
      bookingDate: "2020-01-01",
      startTime: "09:00",
      endTime: "10:00",
      status: "confirmed",
    });
    expect(dto.bookingDate).toBe("2020-01-01");
  });

  it("never waives the exclusion constraint", async () => {
    const conflictErr = Object.assign(new Error('code: "23P01"'), {});
    const { service } = makeService({ repo: { create: vi.fn().mockRejectedValue(conflictErr) } });
    await expect(
      service.createStaff({ ...VALID_CREATE, userId: "usr1", status: "confirmed" }),
    ).rejects.toBeInstanceOf(SlotTakenError);
  });
});

describe("BookingsService.cancel", () => {
  function bookingRow(overrides = {}) {
    return {
      id: "bk1",
      userId: "owner1",
      status: "confirmed",
      paymentStatus: "pending",
      bookingDate: new Date("2099-01-01T00:00:00.000Z"),
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      workspace: { location: { timezone: "UTC" } },
      ...overrides,
    };
  }

  it("throws NotFoundError for a booking owned by someone else", async () => {
    const { service } = makeService({
      repo: { findById: vi.fn().mockResolvedValue(bookingRow()) },
    });
    await expect(
      service.cancel({ id: "someoneElse", role: "customer" }, "bk1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws BookingAlreadyCancelledError when already cancelled", async () => {
    const { service } = makeService({
      repo: { findById: vi.fn().mockResolvedValue(bookingRow({ status: "cancelled" })) },
    });
    await expect(service.cancel({ id: "owner1", role: "customer" }, "bk1")).rejects.toBeInstanceOf(
      BookingAlreadyCancelledError,
    );
  });

  it("throws CancellationWindowClosedError inside the window", async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000); // 1 hour away, window is 24h
    const { service } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue(
          bookingRow({
            bookingDate: new Date(`${soon.toISOString().slice(0, 10)}T00:00:00.000Z`),
            startTime: new Date(`1970-01-01T${soon.toISOString().slice(11, 16)}:00.000Z`),
          }),
        ),
      },
    });
    await expect(service.cancel({ id: "owner1", role: "customer" }, "bk1")).rejects.toBeInstanceOf(
      CancellationWindowClosedError,
    );
  });

  it("lets staff cancel someone else's booking", async () => {
    const { service, repo } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue(bookingRow()),
        update: vi
          .fn()
          .mockResolvedValue(bookingRow({ status: "cancelled", cancelledAt: new Date() })),
      },
    });
    const dto = await service.cancel({ id: "staff1", role: "staff" }, "bk1");
    expect(dto.status).toBe("cancelled");
    expect(repo.update).toHaveBeenCalledWith(
      "bk1",
      expect.objectContaining({ status: "cancelled" }),
    );
  });
});

describe("BookingsService.updateAdmin", () => {
  function bookingRow(overrides = {}) {
    return {
      id: "bk1",
      workspaceId: "ws1",
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T12:00:00.000Z"),
      ...overrides,
    };
  }

  it("throws NotFoundError for a missing booking", async () => {
    const { service } = makeService({ repo: { findById: vi.fn().mockResolvedValue(null) } });
    await expect(service.updateAdmin("ghost", { status: "completed" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("does not reprice when only status changes", async () => {
    const { service, repo } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue(bookingRow()),
        findByIdAdmin: vi.fn().mockResolvedValue({
          ...bookingRow(),
          user: { id: "u1", name: "A", email: "a@test.com", phone: null, company: null },
          workspace: {
            id: "ws1",
            name: "Room A",
            type: "meeting_room",
            floor: "1",
            location: WORKSPACE_LOCATION,
          },
          reference: "TS-X",
          accessCode: "TS-X-Y",
          paymentStatus: "pending",
          currency: "IDR",
          unitPrice: 0,
          durationHours: 0,
          subtotalAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          bookingDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
        }),
      },
    });
    await service.updateAdmin("bk1", { status: "completed" });
    expect(repo.findWorkspaceForBooking).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith("bk1", { status: "completed", cancelledAt: null });
  });

  it("reprices when the time window changes", async () => {
    const { service, repo } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue(bookingRow()),
        findByIdAdmin: vi.fn().mockResolvedValue({
          ...bookingRow(),
          user: { id: "u1", name: "A", email: "a@test.com", phone: null, company: null },
          workspace: {
            id: "ws1",
            name: "Room A",
            type: "meeting_room",
            floor: "1",
            location: WORKSPACE_LOCATION,
          },
          reference: "TS-X",
          accessCode: "TS-X-Y",
          paymentStatus: "pending",
          currency: "IDR",
          unitPrice: 0,
          durationHours: 0,
          subtotalAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          bookingDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
        }),
      },
    });
    await service.updateAdmin("bk1", { startTime: "10:00", endTime: "13:00" });
    expect(repo.findWorkspaceForBooking).toHaveBeenCalledWith("ws1");
    const fields = repo.update.mock.calls[0][1];
    expect(fields.totalAmount).toBeCloseTo(166500, 5); // 50000/h * 3h * 1.11
  });
});
