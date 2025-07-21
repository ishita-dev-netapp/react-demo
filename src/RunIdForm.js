import React, { useState } from "react";
import Navbar from "./Navbar";
const styles = {
  header: {
    background: "#2056ac",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: "56px",
    position: "relative",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    minWidth: "180px", // Ensures enough space for logo+text
  },
  logoImg: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
    marginRight: "10px",
    background: "white",
    borderRadius: "2px",
    padding: "2px",
  },
  logoText: {
    fontWeight: "bold",
    fontSize: "2rem",
    letterSpacing: "1px",
    color: "#fff",
  },
  centerText: {
    fontWeight: "bold",
    fontSize: "1.2rem",
    textAlign: "center",
    flex: 1,
    color: "#fff",
  },
  rightSection: {
    minWidth: "180px", // Matches logoSection for symmetry
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "60px",
  },
  form: {
    marginTop: "32px",
    background: "#fff",
    padding: "32px 40px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    minWidth: "480px",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  subtitle: {
    fontSize: "1.1rem",
    marginBottom: "32px",
    color: "#444",
  },
  label: {
    fontWeight: "bold",
    marginRight: "12px",
    fontSize: "1.1rem",
  },
  input: {
    padding: "10px 14px",
    fontSize: "1.1rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "260px",
    marginRight: "16px",
  },
  button: {
    padding: "10px 28px",
    fontSize: "1.1rem",
    background: "#2056ac",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default function RunIdForm() {
  const [runId, setRunId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Submitted Run ID: ${runId}`);
  };

  return (
    <div>
      {/* Header */}
      <div>
         <Navbar />
       </div>
      {/* <div style={styles.header}>
        <div style={styles.logoSection}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/5b/NetApp_logo.svg"
            alt="NetApp Logo"
            style={styles.logoImg}
          />
          <span style={styles.logoText}>NetApp</span>
        </div>
        <div style={styles.centerText}>Perf Data visualization</div>
        <div style={styles.rightSection}></div>
      //</div> */}

      {/* Main Content */}
      <div style={styles.container}>
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.title}>Enter Your Run ID</div>
          <div style={styles.subtitle}>
            Provide a valid run ID to retrieve performance data from Grover.
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <label htmlFor="runId" style={styles.label}>
              Run ID:
            </label>
            <input
              id="runId"
              type="text"
              placeholder="e.g. 231218hha"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button}>
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}