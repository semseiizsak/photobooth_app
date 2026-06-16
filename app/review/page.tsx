import { redirect } from "next/navigation";
import { REVIEW_URL } from "./url";

export const metadata = {
  robots: "noindex, nofollow",
};

export default function ReviewPage() {
  if (REVIEW_URL) {
    redirect(REVIEW_URL);
  }

  return null;
}
