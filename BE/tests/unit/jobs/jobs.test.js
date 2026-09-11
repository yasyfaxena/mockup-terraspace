import { describe, it, expect, vi } from "vitest";
import { runStalePendingSweep } from "../../../src/jobs/stale-pending-sweep.js";
import { runFailedEventReplay } from "../../../src/jobs/failed-event-replay.js";
import { runReconciliation } from "../../../src/jobs/reconciliation.js";
import { runSessionCleanup } from "../../../src/jobs/session-cleanup.js";
import { runCompleteBookings } from "../../../src/jobs/complete-bookings.js";

const STALE_PENDING_MINUTES = 30;
const REPLAY_AFTER_MINUTES = 5;
const RECONCILE_AFTER_MINUTES = 60;

function fakeLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("runStalePendingSweep", () => {
  it("calls sweepStalePending with the 30-minute threshold and logs only when something was swept", async () => {
    const paymentsService = { sweepStalePending: vi.fn().mockResolvedValue({ swept: 2 }) };
    const logger = fakeLogger();

    await runStalePendingSweep({ paymentsService, logger });

    expect(paymentsService.sweepStalePending).toHaveBeenCalledWith(STALE_PENDING_MINUTES);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ swept: 2 }),
      expect.any(String),
    );
  });

  it("stays quiet when nothing was swept", async () => {
    const paymentsService = { sweepStalePending: vi.fn().mockResolvedValue({ swept: 0 }) };
    const logger = fakeLogger();

    await runStalePendingSweep({ paymentsService, logger });

    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe("runFailedEventReplay", () => {
  it("calls replayFailedEvents with the 5-minute threshold and logs only when something replayed", async () => {
    const paymentsService = { replayFailedEvents: vi.fn().mockResolvedValue({ replayed: 3 }) };
    const logger = fakeLogger();

    await runFailedEventReplay({ paymentsService, logger });

    expect(paymentsService.replayFailedEvents).toHaveBeenCalledWith(REPLAY_AFTER_MINUTES);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ replayed: 3 }),
      expect.any(String),
    );
  });

  it("stays quiet when nothing needed replay", async () => {
    const paymentsService = { replayFailedEvents: vi.fn().mockResolvedValue({ replayed: 0 }) };
    const logger = fakeLogger();

    await runFailedEventReplay({ paymentsService, logger });

    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe("runReconciliation", () => {
  it("calls reconcile with the 60-minute threshold and warns only when drift was corrected", async () => {
    const paymentsService = {
      reconcile: vi.fn().mockResolvedValue({ checked: 5, corrected: 1 }),
    };
    const logger = fakeLogger();

    await runReconciliation({ paymentsService, logger });

    expect(paymentsService.reconcile).toHaveBeenCalledWith(RECONCILE_AFTER_MINUTES);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ checked: 5, corrected: 1 }),
      expect.any(String),
    );
  });

  it("stays quiet when nothing had drifted", async () => {
    const paymentsService = {
      reconcile: vi.fn().mockResolvedValue({ checked: 5, corrected: 0 }),
    };
    const logger = fakeLogger();

    await runReconciliation({ paymentsService, logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("runSessionCleanup", () => {
  it("cleans up expired sessions and verifications and logs the counts", async () => {
    const authService = {
      cleanupExpired: vi.fn().mockResolvedValue({ sessions: 4, verifications: 1 }),
    };
    const logger = fakeLogger();

    await runSessionCleanup({ authService, logger });

    expect(authService.cleanupExpired).toHaveBeenCalledWith();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ sessions: 4, verifications: 1 }),
      expect.any(String),
    );
  });

  it("stays quiet when nothing was expired", async () => {
    const authService = {
      cleanupExpired: vi.fn().mockResolvedValue({ sessions: 0, verifications: 0 }),
    };
    const logger = fakeLogger();

    await runSessionCleanup({ authService, logger });

    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe("runCompleteBookings", () => {
  it("promotes elapsed confirmed bookings to completed and logs the count", async () => {
    const bookingsService = { completeElapsed: vi.fn().mockResolvedValue({ completed: 7 }) };
    const logger = fakeLogger();

    await runCompleteBookings({ bookingsService, logger });

    expect(bookingsService.completeElapsed).toHaveBeenCalledWith();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ completed: 7 }),
      expect.any(String),
    );
  });

  it("stays quiet when nothing elapsed", async () => {
    const bookingsService = { completeElapsed: vi.fn().mockResolvedValue({ completed: 0 }) };
    const logger = fakeLogger();

    await runCompleteBookings({ bookingsService, logger });

    expect(logger.info).not.toHaveBeenCalled();
  });
});
