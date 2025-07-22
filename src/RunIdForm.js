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
// Key display name mapping
const keyDisplayNames = {
  purpose: "Test Purpose",
  user: "User",
  peak_mbs: "Peak MB/s",
  workload: "Workload Type",
  peak_iter: "Peak Iteration",
  ontap_ver: "ONTAP Version",
  peak_ops: "Achieved Ops",
  peak_lat: "Latency",
  // Add more mappings as needed
};
const metricKeys = [
  "purpose",
  "user",
  "peak_mbs",
  "workload",
  "peak_iter",
  "ontap_ver",
  "peak_ops",
  "peak_lat",
];

// Optional value formatting
function formatValue(key, value) {
  if (key === "peak_mbs") {
    return `${value} MB/s`;
  }
  if (key === "peak_ops") {
    return `${value} ops`;
  }
  if (key === "peak_lat" && value !== "-1") {
    return `${value} ms`;
  }
  // Add more formatting as needed
  return value;
}

export default function RunIdForm() {
  const [runId1, setRunId1] = useState("");
  const [runId2, setRunId2] = useState("");
  const [results, setResults] = useState([]); // [{runId, data}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const runIds = [runId1, runId2];
      const newResults = [];
      for (const runId of runIds) {
        const response = await fetch(`/api/fetch_run_data/?runid=${runId}`);
        if (!response.ok) throw new Error("Failed to fetch data for " + runId);
        const text = await response.text();
        let obj = null;
        try {
          obj = JSON.parse(text);
        } catch {
          obj = null;
        }
        if (obj) {
          newResults.push({ runId, data: obj });
        } else {
          setError("Invalid data format for " + runId);
        }
      }
      setResults(newResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  function ResultTable({ data, runId }) {
    if (!data) return null;
    return (
      <div style={{
        maxWidth: "600px",
        margin: "32px auto",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: "24px"
      }}>
        <h3 style={{ marginBottom: "16px" }}>Result for <span style={{ color: "#2056ac" }}>{runId}</span>:</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key}>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", width: "40%" }}>
                  {keyDisplayNames[key] || key}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {formatValue(key, value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div style={styles.container}>
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.title}>Compare Two Run IDs</div>
          <div style={styles.subtitle}>
            Provide one or two valid run IDs to retrieve and compare performance data from Grover.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <label htmlFor="runId1" style={styles.label}>Run ID 1:</label>
            <input
              id="runId1"
              type="text"
              placeholder="e.g. 231218hha"
              value={runId1}
              onChange={(e) => setRunId1(e.target.value)}
              style={styles.input}
              required={!runId2}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px" }}>
            <label htmlFor="runId2" style={styles.label}>Run ID 2:</label>
            <input
              id="runId2"
              type="text"
              placeholder="e.g. 231219xyz"
              value={runId2}
              onChange={(e) => setRunId2(e.target.value)}
              style={styles.input}
              required={!runId1}
            />
          </div>
          <button type="submit" style={{ ...styles.button, marginTop: "24px" }}>Compare</button>
        </form>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {results.length === 2 && (
          <div style={{ marginTop: "32px", width: "100%" }}>
            <h3>Comparison Table</h3>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Metric</th>
                  {results.map(({ runId }) => (
                    <th key={runId} style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {runId}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricKeys.map((key) => (
                  <tr key={key}>
                    <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>
                      {keyDisplayNames[key] || key}
                    </td>
                    {results.map(({ data, runId }) => (
                      <td key={runId} style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {formatValue(key, data[key]) || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}