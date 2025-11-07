import React from "react";

const Reservasi = ({ user, onLogout }) => {
  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "60px 80px",
          borderRadius: "20px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          maxWidth: "600px",
        }}
      >
        <div
          style={{
            fontSize: "4rem",
            marginBottom: "20px",
          }}
        >
          🚧
        </div>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#1e3a8a",
            marginBottom: "15px",
          }}
        >
          WORK IN PROGRESS
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#64748b",
            marginTop: "10px",
          }}
        >
          Halaman Claim Photo sedang dalam pengembangan
        </p>
      </div>
    </div>
  );
};

export default Reservasi;
