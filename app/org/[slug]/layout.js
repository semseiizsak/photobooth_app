import "../../dashboard/pb.css";

export const metadata = { title: "PHOTOAUTOMAT — PARTNER" };

export default function OrgLayout({ children }) {
  return (
    <div className="pbd">
      <div className="wrap">{children}</div>
    </div>
  );
}
