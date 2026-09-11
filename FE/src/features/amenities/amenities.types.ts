/** Mirrors BE `amenities.mapper.js`'s `toAmenityDto`. */
export type AmenityDto = {
  id: string;
  name: string;
  category: string;
  icon: string;
};

/** Mirrors BE `amenities.mapper.js`'s `toAdminAmenityDto`. */
export type AdminAmenityDto = {
  id: string;
  name: string;
  category: string;
  icon: string;
  status: "active" | "inactive";
  usage: { locations: number; workspaces: number };
  createdAt: string;
  updatedAt: string;
};
