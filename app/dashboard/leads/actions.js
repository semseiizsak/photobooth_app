"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/pb";

export async function setLeadStatus(id, status) {
  if (!["new", "contacted", "closed"].includes(status)) return;
  await db().from("pb_leads").update({ status }).eq("id", id);
  revalidatePath("/dashboard/leads");
}
