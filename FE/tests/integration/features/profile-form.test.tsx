import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { ProfileForm } from "@/features/users/components/profile-form";
import type { MeDto } from "@/features/users/users.types";
import { server } from "../../mocks/server";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const mockMe: MeDto = {
  id: "user-123",
  email: "sarah@example.com",
  name: "Sarah Connor",
  phone: "08123456789",
  company: "Cyberdyne Systems",
  image: null,
  emailVerified: true,
  role: "customer",
  createdAt: "2026-01-01T00:00:00.000Z",
  stats: {
    totalBookings: 8,
    upcomingBookings: 2,
    totalSpent: "1500000",
    currency: "IDR",
  },
  authMethods: [{ providerId: "credential", linkedAt: "2026-01-01T00:00:00.000Z" }],
};

function renderProfileForm() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm />
    </QueryClientProvider>,
  );
}

describe("ProfileForm", () => {
  it("shows loading skeleton then populates user profile details and stats", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/me", () => {
        return HttpResponse.json(mockMe);
      }),
    );

    renderProfileForm();

    expect(await screen.findByDisplayValue("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("08123456789")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cyberdyne Systems")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders a friendly error card when /me fails instead of crashing", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/me", () => {
        return HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "Server error",
              requestId: "r1",
              details: null,
            },
          },
          { status: 500 },
        );
      }),
    );

    renderProfileForm();

    expect(
      await screen.findByText("Could not load profile details", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
