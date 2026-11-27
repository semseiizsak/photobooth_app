import { liveLocations, toLocation } from "@/lib/siteLocations";
import LocationsClient from "./LocationsClient";

// Locations come from Supabase (pb_site_locations). The GPT API calls
// revalidatePath("/locations") on every change, so edits show up at once;
// the timer is only a safety net.
export const revalidate = 300;

export default async function LocationsPage() {
  const rows = await liveLocations();
  return <LocationsClient locations={rows.map(toLocation)} />;
}
