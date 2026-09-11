# TerraSpace FE — Reports (V2)

**Feature:** `src/features/reports/`  
**Consumes:** BE `features/reports.md` — 6 endpoints.

## 1. Screens

| Screen | Kind | Access |
|---|---|---|
| Dashboard overview | Panel/page | Staff/Admin |
| Revenue report | Panel | Admin |
| Occupancy report | Panel | Admin |
| Payments report | Panel | Admin |
| Activity log | Panel | Staff/Admin |
| Report export | Action | Admin |

## 2. Components

| Component | Purpose |
|---|---|
| `overview-cards.tsx` | Daily KPI summary — was `frontend/admin/admin-dashboard.tsx`'s 6 KPI tiles (today's bookings, active members, active now, revenue today, pending payments, total bookings), a "today's bookings" list, and an occupancy-by-location progress-bar section. V1's dashboard also has a "Quick Actions" grid that jumps to other admin sections — carry the *pattern* over, but drop its dead "Memberships" entry (no destination) |
| `revenue-report.tsx` | Revenue series and totals — was `frontend/admin/admin-analytics.tsx`'s "Revenue by Location"/"Revenue by Workspace" bar panels. V1 hand-rolls its own `Bar` component instead of using `recharts` (already a project dependency) — V2 should use a real chart library rather than repeat the hand-rolled version |
| `occupancy-report.tsx` | Occupancy metrics |
| `payment-report.tsx` | Payment aggregates |
| `activity-table.tsx` | Staff/admin activity — replaces two separate V1 things: `admin-dashboard.tsx`'s "Recent Activity" feed and the standalone `admin-notifications.tsx` panel (which also drove a sidebar unread-count badge and auto-marked everything read on mount). V2 has one activity feed, backed by `GET /admin/activity`, not two independent implementations |
| `report-filters.tsx` | Date/location/type filters |
| `export-report-button.tsx` | Starts CSV download |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useReportOverview(params)` | `GET /admin/reports/overview` | `reports.overview(params)` |
| `useRevenueReport(params)` | `GET /admin/reports/revenue` | `reports.revenue(params)` |
| `useOccupancyReport(params)` | `GET /admin/reports/occupancy` | `reports.occupancy(params)` |
| `usePaymentReport(params)` | `GET /admin/reports/payments` | `reports.payments(params)` |
| `useActivity(params)` | `GET /admin/activity` | `reports.activity(params)` |
| `useReportExport(params)` | `GET /admin/reports/export` | download action, not normal cached query |

## 4. Aggregation rule

The FE renders aggregates supplied by the BE.

It must **not**:

- fetch every booking to calculate revenue;
- fetch every profile to calculate customer counts;
- sum payment rows itself;
- group timestamps using the browser timezone when the report is venue-based.

The BE performs SQL aggregation and applies the location timezone.

## 5. Currency handling

Reports must not combine amounts from different currencies into one number.

The UI should group or label totals by currency as returned by the API.

## 6. Date ranges

Respect server limits:

- ranged reports: maximum 366 days;
- calendar data: maximum 92 days.

The FE should prevent obviously invalid ranges but still handle the API's validation response.

## 7. Overview behavior

The overview screen renders:

- bookings today;
- confirmed bookings;
- cancelled bookings;
- paid revenue;
- occupancy;
- new customers;
- comparison against the same weekday one week earlier;
- schedule entries.

Pending checkouts are not displayed as revenue.

## 8. Export

CSV export is generated/streamed by the BE.

The FE should treat the response as a file download and must not buffer large report datasets in React state.

## 9. Notes

Reports are an admin/operations feature, not a replacement for the booking catalog. They consume read-only aggregate endpoints.
