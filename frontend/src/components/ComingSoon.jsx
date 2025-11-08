import React from "react";

export default function ComingSoon({ emoji = "🚧" }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "2rem",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{emoji} 📝 🏫</div>
      <div>Page coming soon!</div>
    </div>
  );
}