import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../../../../src/features/auth/auth.service.js";

describe("AuthService.cleanupExpired", () => {
  it("deletes expired sessions and verifications using the same cutoff instant", async () => {
    const authRepository = {
      deleteExpiredSessions: vi.fn().mockResolvedValue(3),
      deleteExpiredVerifications: vi.fn().mockResolvedValue(2),
    };
    const service = new AuthService({ authRepository });

    const result = await service.cleanupExpired();

    expect(result).toEqual({ sessions: 3, verifications: 2 });
    const [sessionsCutoff] = authRepository.deleteExpiredSessions.mock.calls[0];
    const [verificationsCutoff] = authRepository.deleteExpiredVerifications.mock.calls[0];
    expect(sessionsCutoff).toBeInstanceOf(Date);
    expect(sessionsCutoff).toEqual(verificationsCutoff);
  });
});
