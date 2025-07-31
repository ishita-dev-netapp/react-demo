import React, { useState } from 'react';
import Navbar from './Navbar';
import './RunIdForm.css';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';

const keyDisplayNames = {
  purpose: "Test Purpose",
  user: "User",
  peak_mbs: "Peak MB/s",
  workload: "Workload Type",
  peak_iter: "Peak Iteration",
  ontap_ver: "ONTAP Version",
  peak_ops: "Achieved Ops",
  peak_latency_us: "Latency",
  model : "Model",
  //peak_lat: "Latency",
  cpu_busy: "CPU Busy (%)",
  vm_instance: "VM Instance",
  read_io_type_cache: "Read IO Type: Cache",
  read_io_type_ext_cache: "Read IO Type: Ext Cache",
  read_io_type_disk: "Read IO Type: Disk",
  read_io_type_bamboo_ssd: "Read IO Type: Bamboo SSD",
  rdma_actual_latency: "RDMA Actual Latency (WAFL_SPINNP_WRITE)",
  harness_log: "Harness Log",
  read_ops: "Read Ops",
};

const metricKeys = [
  "purpose",
  "user",
  "peak_mbs",
  "workload",
  "peak_iter",
  "ontap_ver",
  "peak_ops",
  "peak_latency_us",
  "model",
  //"peak_lat",
  "cpu_busy",
  "vm_instance",
  "read_io_type_cache",
  "read_io_type_ext_cache",
  "read_io_type_disk",
  "read_io_type_bamboo_ssd",
  "rdma_actual_latency",
    "harness_log",
  "read_ops",
];

function formatValue(key, value) {
  if (value === undefined || value === null || value === "") return "-";
  if (key === "peak_mbs") return `${value} MB/s`;
  if (key === "peak_ops") return `${value} ops`;
  if (key === "peak_lat" && value !== "-1") return `${value} ms`;
  if (key === "cpu_busy") return `${value}%`;
  if (key === "harness_log" && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#007acc", textDecoration: "underline" }}>
        Harness Logs
      </a>
    );
  }
  return value;
}

export default function RunIdForm() {
  const [runId1, setRunId1] = useState("");
  const [runId2, setRunId2] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary1, setSummary1] = useState({});
  const [summary2, setSummary2] = useState({});
  const [iterMetrics1, setIterMetrics1] = useState([]);
  const [iterMetrics2, setIterMetrics2] = useState([]);
  const [validationError, setValidationError] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary1({});
    setSummary2({});
    setIterMetrics1([]);
    setIterMetrics2([]);
    setValidationError(''); 

    if (!runId1 || !runId2) {
      setValidationError('Please provide both Run IDs.');
      console.log('Validation Error:', validationError); 
      setLoading(false);
      return;
    }

    if (runId1.length !== 9 || runId2.length !== 9) {
      setValidationError('Each Run ID must be exactly 9 characters long.');
      console.log('Validation Error:', validationError);
      setLoading(false);
      return;
    }
    // fetch logic
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
        if(obj.workload === 0){
          setValidationError('Invalid runId: ' + runId + '. Please provide a valid runId.');
          console.log('Validation Error:', validationError);
          setLoading(false);
          return;
        }
        if (obj) {
          newResults.push({ runId, data: obj });
        } else {
          setError("Invalid data format for " + runId);
        }
      }
      
      setResults(newResults);

      const graphResp = await fetch(`/api/fetch_graph_data/?run_id1=${runId1}&run_id2=${runId2}`);
      if (!graphResp.ok) throw new Error("Failed to fetch graph data");
      const graphData = await graphResp.json();

      setIterMetrics1(graphData.data_points[runId1] || []);
      setIterMetrics2(graphData.data_points[runId2] || []);
      setSummary1(graphData.summary[runId1] || {});
      setSummary2(graphData.summary[runId2] || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const lineData1 = iterMetrics1
    .filter(m => m.throughput_mbs !== null && m.latency_us !== null)
    .sort((a, b) => a.throughput_mbs - b.throughput_mbs)
    .map(m => ({
      throughput: m.throughput_mbs,
      latency: m.latency_us,
      iteration: m.iteration
    }));

  const lineData2 = iterMetrics2
    .filter(m => m.throughput_mbs !== null && m.latency_us !== null)
    .sort((a, b) => a.throughput_mbs - b.throughput_mbs)
    .map(m => ({
      throughput: m.throughput_mbs,
      latency: m.latency_us,
      iteration: m.iteration
    }));

  const allThroughputs = Array.from(new Set([
    ...lineData1.map(d => d.throughput),
    ...lineData2.map(d => d.throughput)
  ])).sort((a, b) => a - b);

  const mergedLineData = allThroughputs.map(throughput => {
    const d1 = lineData1.find(d => d.throughput === throughput);
    const d2 = lineData2.find(d => d.throughput === throughput);
    return {
      throughput,
      latency1: d1 ? d1.latency : null,
      latency2: d2 ? d2.latency : null,
      iteration1: d1 ? d1.iteration : null,
      iteration2: d2 ? d2.iteration : null,
    };
  });
  const areComparable = 
  summary1 && summary2 &&
  summary1.workload && summary2.workload &&
  summary1.model && summary2.model &&
  summary1.workload === summary2.workload &&
  summary1.model === summary2.model;

  const notComparableReason = (() => {
  if (summary1 && summary2) {
    if (summary1.workload !== summary2.workload) return "different workloads";
    if (summary1.model !== summary2.model) return "different models";
  }
  return "unknown reason";
})();


  return (
    <div>
      <Navbar />
      <div className="container">
        <form className="form" onSubmit={handleSubmit}>
          <div className="title">Compare Two Run IDs</div>
          <div className="subtitle">
            Provide both valid run IDs to retrieve and compare performance data from Grover.
          </div>
          <div className="input-group">
            <label htmlFor="runId1" className="label">Run ID 1 </label>
            <input
              id="runId1"
              type="text"
              placeholder="e.g. 231218hha"
              value={runId1}
              onChange={(e) => setRunId1(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="input-group" style={{ marginTop: "16px" }}>
            <label htmlFor="runId2" className="label">Run ID 2 </label>
            <input
              id="runId2"
              type="text"
              placeholder="e.g. 231219xyz"
              value={runId2}
              onChange={(e) => setRunId2(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" className="button" style={{ marginTop: "24px" }}>Compare</button>
        </form>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {/* Added this line */}
        {validationError && <p style={{ color: "red" }}>Validation Error: {validationError}</p>}

        {!loading && results.length === 2 && !areComparable && (
          <div style={{ color: "red", margin: "16px 0" /* ishita*/ , textAlign: "center" }}>
            These run IDs are not comparable as they have {notComparableReason}.<br />
            Below are their individual details.
          </div>
        )}

        {/* Show two separate tables if not comparable */}
        {!loading && results.length === 2 && !areComparable && (
          <div className='non-comparable-container'>
            {[{ summary: summary1, runId: runId1 }, { summary: summary2, runId: runId2 }].map(({ summary, runId }) => (
              <div className="individual-table" key={runId}>
                <h4>Run ID: {runId}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>{runId}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map((key) => (
                      <tr key={key}>
                        <td className="table-key">{keyDisplayNames[key] || key}</td>
                        <td className="table-value">{formatValue(key, summary[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        ))}
      </div>
)}

        {/* Comparison Table */}
        {!loading &&results.length === 2 && areComparable &&(
          <div className="results-container">
            <div className="left-section">
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
                    <td className="table-key">{keyDisplayNames[key] || key}</td>
                    {[summary1, summary2].map((summary, idx) => (
                      <td key={results[idx].runId} className="table-value">
                        {formatValue(key, summary[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        

        <div className="right-section">
              {iterMetrics1.length > 0 && iterMetrics2.length > 0 && (
                <div className="chart-container">
                  <h3>Latency vs Throughput per Iteration</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={mergedLineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="throughput"
                        type="number"
                        label={{ value: "Throughput (MB/s)", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        label={{ value: "Latency (us)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="linear"
                        dataKey="latency1"
                        stroke="red"
                        name={`Latency (${runId1})`}
                        connectNulls
                      />
                      <Line
                        type="linear"
                        dataKey="latency2"
                        stroke="blue"
                        name={`Latency (${runId2})`}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}