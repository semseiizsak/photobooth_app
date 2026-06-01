import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import "./review.css";

export const metadata: Metadata = {
  title: "Leave a Review",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

function getUrl(): string {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "review-link.json"), "utf8")).url ?? "";
  } catch {
    return "";
  }
}

export default function ReviewPage() {
  const url = getUrl();

  return (
    <div className="rv-root">
      <div className="rv-card">
        <p className="rv-brand">PHOTOAUTOMAT</p>
        <h1 className="rv-heading">Thank you for visiting!</h1>
        <p className="rv-sub">We'd love to hear about your experience.<br />Leave us a review — it means a lot.</p>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="rv-btn">
            ★ LEAVE A REVIEW
          </a>
        ) : (
          <p className="rv-empty">Review link coming soon.</p>
        )}
      </div>
    </div>
  );
}
