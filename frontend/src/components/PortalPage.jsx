import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PortalPage.css";
import { loadItems } from "../utils/semesters";

export default function PortalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const portal = useMemo(() => {
    const items = loadItems();
    return items.find((item) => item.id === id);
  }, [id]);
  const title = portal?.title || "Unknown Portal";
  const typeLabel = portal
    ? (portal.type === "semester" ? "Semester Portal" : "Project Portal")
    : "Portal";

  return (
    <div className="portal-root">
      <div className="portal-card">
        <p className="eyebrow">{typeLabel}</p>
        <h1>{title}</h1>
        <p>This portal will soon lead to your next experience.</p>
        <button className="ace-btn" type="button" onClick={() => navigate("/dashboard/main")}>Back to the Oracle</button>
      </div>
    </div>
  );
}
