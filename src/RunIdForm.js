import React, { useState } from 'react';
import Navbar from './Navbar';
import './RunIdForm.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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

  // New: iteration metrics
  const [iterMetrics1, setIterMetrics1] = useState([]);
  const [iterMetrics2, setIterMetrics2] = useState([]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setResults([]);
  setIterMetrics1([]);
  setIterMetrics2([]);

  try {
    // Fetch summary data for the table (as before)
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

    // Fetch iteration metrics for both run IDs in one call
    const graphResp = await fetch(`/api/fetch_graph_data/?run_id1=${runId1}&run_id2=${runId2}`);
    if (!graphResp.ok) throw new Error("Failed to fetch graph data");
    const graphData = await graphResp.json();

    setIterMetrics1(graphData.data_points[runId1] || []);
    setIterMetrics2(graphData.data_points[runId2] || []);
    console.log("Metrics for runId1:", graphData.data_points[runId1]);
    console.log("Metrics for runId2:", graphData.data_points[runId2]);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // Merge iteration metrics for chart
  function mergeIterationMetrics(metrics1, metrics2) {
    const map1 = {};
    metrics1.forEach(m => { map1[m.iteration] = m; });
    const map2 = {};
    metrics2.forEach(m => { map2[m.iteration] = m; });

    const allIterations = Array.from(new Set([
      ...metrics1.map(m => m.iteration),
      ...metrics2.map(m => m.iteration),
    ]));

    return allIterations.map(iteration => ({
      iteration,
      latency1: map1[iteration]?.latency_us ?? null,
      throughput1: map1[iteration]?.throughput_mbs ?? null,
      latency2: map2[iteration]?.latency_us ?? null,
      throughput2: map2[iteration]?.throughput_mbs ?? null,
    }));
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

        {/* Latency & Throughput Chart */}
        {iterMetrics1.length > 0 && iterMetrics2.length > 0 && (
          <div style={{ width: "100%", height: 400, marginTop: 32 }}>
            <h3>Latency and Throughput per Iteration</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={mergeIterationMetrics(iterMetrics1, iterMetrics2)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="iteration" />
                <YAxis yAxisId="left" label={{ value: 'Latency (us)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Throughput (MB/s)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="latency1" stroke="#8884d8" name={`Latency (${runId1})`} />
                <Line yAxisId="left" type="monotone" dataKey="latency2" stroke="#ff7300" name={`Latency (${runId2})`} />
                <Line yAxisId="right" type="monotone" dataKey="throughput1" stroke="#82ca9d" name={`Throughput (${runId1})`} />
                <Line yAxisId="right" type="monotone" dataKey="throughput2" stroke="#0088FE" name={`Throughput (${runId2})`} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// import React, { useState } from 'react';
// import Navbar from './Navbar';
// import './RunIdForm.css';

// const keyDisplayNames = {
//   purpose: "Test Purpose",
//   user: "User",
//   peak_mbs: "Peak MB/s",
//   workload: "Workload Type",
//   peak_iter: "Peak Iteration",
//   ontap_ver: "ONTAP Version",
//   peak_ops: "Achieved Ops",
//   peak_lat: "Latency",
// };

// const metricKeys = [
//   "purpose",
//   "user",
//   "peak_mbs",
//   "workload",
//   "peak_iter",
//   "ontap_ver",
//   "peak_ops",
//   "peak_lat",
// ];

// function formatValue(key, value) {
//   if (key === "peak_mbs") {
//     return `${value} MB/s`;
//   }
//   if (key === "peak_ops") {
//     return `${value} ops`;
//   }
//   if (key === "peak_lat" && value !== "-1") {
//     return `${value} ms`;
//   }
//   return value;
// }

// export default function RunIdForm() {
//   const [runId1, setRunId1] = useState("");
//   const [runId2, setRunId2] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setResults([]);

//     try {
//       const runIds = [runId1, runId2];
//       const newResults = [];
//       for (const runId of runIds) {
//         const response = await fetch(`/api/fetch_run_data/?runid=${runId}`);
//         if (!response.ok) throw new Error("Failed to fetch data for " + runId);
//         const text = await response.text();
//         let obj = null;
//         try {
//           obj = JSON.parse(text);
//         } catch {
//           obj = null;
//         }
//         if (obj) {
//           newResults.push({ runId, data: obj });
//         } else {
//           setError("Invalid data format for " + runId);
//         }
//       }
//       setResults(newResults);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   function ResultTable({ data, runId }) {
//     if (!data) return null;
//     return (
//       <div className="result-table">
//         <h3>Result for <span className="run-id">{runId}</span>:</h3>
//         <table>
//           <tbody>
//             {Object.entries(data).map(([key, value]) => (
//               <tr key={key}>
//                 <td className="table-key">
//                   {keyDisplayNames[key] || key}
//                 </td>
//                 <td className="table-value">
//                   {formatValue(key, value)}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     );
//   }

//   return (
//     <div>
//       <Navbar />
//       <div className="container">
//         <form className="form" onSubmit={handleSubmit}>
//           <div className="title">Compare Two Run IDs</div>
//           <div className="subtitle">
//             Provide one or two valid run IDs to retrieve and compare performance data from Grover.
//           </div>
//           <div className="input-group">
//             <label htmlFor="runId1" className="label">Run ID 1:</label>
//             <input
//               id="runId1"
//               type="text"
//               placeholder="e.g. 231218hha"
//               value={runId1}
//               onChange={(e) => setRunId1(e.target.value)}
//               className="input"
//               required={!runId2}
//             />
//           </div>
//           <div className="input-group" style={{ marginTop: "16px" }}>
//             <label htmlFor="runId2" className="label">Run ID 2:</label>
//             <input
//               id="runId2"
//               type="text"
//               placeholder="e.g. 231219xyz"
//               value={runId2}
//               onChange={(e) => setRunId2(e.target.value)}
//               className="input"
//               required={!runId1}
//             />
//           </div>
//           <button type="submit" className="button" style={{ marginTop: "24px" }}>Compare</button>
//         </form>

//         {loading && <p>Loading...</p>}
//         {error && <p style={{ color: "red" }}>Error: {error}</p>}
//         {results.length === 2 && (
//           <div className="comparison-table">
//             <h3>Comparison Table</h3>
//             <table>
//               <thead>
//                 <tr>
//                   <th>Metric</th>
//                   {results.map(({ runId }) => (
//                     <th key={runId}>{runId}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {metricKeys.map((key) => (
//                   <tr key={key}>
//                     <td className="table-key">
//                       {keyDisplayNames[key] || key}
//                     </td>
//                     {results.map(({ data, runId }) => (
//                       <td key={runId} className="table-value">
//                         {formatValue(key, data[key]) || "-"}
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }