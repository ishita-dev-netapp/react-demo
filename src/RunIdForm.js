import React, { useState } from 'react';
import Navbar from './Navbar';
import './RunIdForm.css';

const keyDisplayNames = {
  purpose: "Test Purpose",
  user: "User",
  peak_mbs: "Peak MB/s",
  workload: "Workload Type",
  peak_iter: "Peak Iteration",
  ontap_ver: "ONTAP Version",
  peak_ops: "Achieved Ops",
  peak_lat: "Latency",
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
  return value;
}

export default function RunIdForm() {
  const [runId1, setRunId1] = useState("");
  const [runId2, setRunId2] = useState("");
  const [results, setResults] = useState([]);
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
      <div className="result-table">
        <h3>Result for <span className="run-id">{runId}</span>:</h3>
        <table>
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key}>
                <td className="table-key">
                  {keyDisplayNames[key] || key}
                </td>
                <td className="table-value">
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
      <div className="container">
        <form className="form" onSubmit={handleSubmit}>
          <div className="title">Compare Two Run IDs</div>
          <div className="subtitle">
            Provide one or two valid run IDs to retrieve and compare performance data from Grover.
          </div>
          <div className="input-group">
            <label htmlFor="runId1" className="label">Run ID 1:</label>
            <input
              id="runId1"
              type="text"
              placeholder="e.g. 231218hha"
              value={runId1}
              onChange={(e) => setRunId1(e.target.value)}
              className="input"
              required={!runId2}
            />
          </div>
          <div className="input-group" style={{ marginTop: "16px" }}>
            <label htmlFor="runId2" className="label">Run ID 2:</label>
            <input
              id="runId2"
              type="text"
              placeholder="e.g. 231219xyz"
              value={runId2}
              onChange={(e) => setRunId2(e.target.value)}
              className="input"
              required={!runId1}
            />
          </div>
          <button type="submit" className="button" style={{ marginTop: "24px" }}>Compare</button>
        </form>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {results.length === 2 && (
          <div className="comparison-table">
            <h3>Comparison Table</h3>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {results.map(({ runId }) => (
                    <th key={runId}>{runId}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricKeys.map((key) => (
                  <tr key={key}>
                    <td className="table-key">
                      {keyDisplayNames[key] || key}
                    </td>
                    {results.map(({ data, runId }) => (
                      <td key={runId} className="table-value">
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