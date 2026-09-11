import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminBookingsListQueryOptions,
  useAdminBookings,
  useDeleteAdminBooking,
  useUpdateAdminBooking,
  type AdminBookingListItemDto,
} from "@/features/bookings";
import { formatMoney } from "@/shared/format";

const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;

const bookingsSearchSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/admin/bookings")({
  validateSearch: bookingsSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(adminBookingsListQueryOptions(deps)),
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const status = search.status;
  const page = search.page ?? 1;

  const { data, isPending } = useAdminBookings({ status, page });
  const bookings = data?.data ?? [];
  const meta = data?.meta;

  const updateBooking = useUpdateAdminBooking();
  const deleteBooking = useDeleteAdminBooking();

  async function handleStatusChange(booking: AdminBookingListItemDto, next: string) {
    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        input: { status: next as AdminBookingListItemDto["status"] },
      });
      toast.success(`Status updated — ${booking.reference}`);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  async function handleDelete(booking: AdminBookingListItemDto) {
    if (!confirm(`Delete this booking permanently? (${booking.reference})`)) return;
    try {
      await deleteBooking.mutateAsync(booking.id);
      toast.success(`Booking deleted — ${booking.reference}`);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/35">All bookings from the live V2 API.</p>
        <Select
          value={status ?? "all"}
          onValueChange={(v) =>
            void navigate({
              search: { status: v === "all" ? undefined : (v as typeof status), page: undefined },
            })
          }
        >
          <SelectTrigger className="w-40 border-white/[.1] bg-white/[.05] text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">No bookings found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[.07]">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex flex-wrap items-center gap-4 border-b border-white/[.04] px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{booking.workspace.name}</p>
                <p className="truncate text-xs text-white/30">
                  {booking.customer.name} · {booking.bookingDate}, {booking.startTime}–
                  {booking.endTime} · {formatMoney(booking.totalAmount)}
                </p>
              </div>
              <Select
                value={booking.status}
                onValueChange={(v) => void handleStatusChange(booking, v)}
              >
                <SelectTrigger className="w-36 border-white/[.1] bg-white/[.05] text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => void handleDelete(booking)}
                className="p-2 text-white/30 hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <button
            disabled={meta.page <= 1}
            onClick={() => void navigate({ search: { status, page: meta.page - 1 } })}
            className="disabled:opacity-30"
          >
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => void navigate({ search: { status, page: meta.page + 1 } })}
            className="disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
