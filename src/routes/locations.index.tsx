import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPublicCatalog } from "@/backend";

export const Route = createFileRoute("/locations/")({
  beforeLoad: async () => {
    const catalog = await getPublicCatalog();
    const slug = catalog.locations[0]?.slug;
    if (!slug) throw redirect({ to: "/" });
    throw redirect({ to: "/locations/$slug", params: { slug } });
  },
});
