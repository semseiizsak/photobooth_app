import type { Metadata } from "next";
import { REVIEW_URL } from "./url";
import "./review.css";

export const metadata: Metadata = {
  title: "Leave a Review",
  robots: "noindex, nofollow",
};

export default function ReviewPage() {
  return (
    <div className="rv-root">
      <div className="rv-card">
        <p className="rv-brand">PHOTOAUTOMAT</p>
        <h1 className="rv-heading">Thank you for visiting!</h1>
        <p className="rv-sub">We'd love to hear about your experience.<br />Leave us a review — it means a lot.</p>
        {REVIEW_URL ? (
          <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer" className="rv-btn">
            ★ LEAVE A REVIEW
          </a>
        ) : (
          <p className="rv-empty">Review link coming soon.</p>
        )}
      </div>
    </div>
  );
}
