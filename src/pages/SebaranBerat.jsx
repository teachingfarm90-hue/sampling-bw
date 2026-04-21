import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getAllKandangs } from '../lib/db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// Hitung distribusi berat ke dalam bin
function buildDistribution(weights, binSize) {
  if (weights.length === 0) return [];
  const min = Math.floor(Math.min(...weights) / binSize) * binSize;
  const max = Math.ceil(Math.max(...weights) / binSize) * binSize;
  const bins = [];
  for (let i = min; i < max; i += binSize) {
    bins.push({
      label: `${i}`,
      range: `${i}–${i + binSize}`,
      count: weights.filter(w => w >= i && w < i + binSize).length,
      from: i,
      to: i + binSize
    });
  }
  return bins;
}

// Tooltip kustom
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-bold text-gray-700">{d.range} gr</p>
        <p className="text-green-600 font-semibold">{d.count} ekor</p>
      </div>
    );
  }
  return null;
}

export default function SebaranBerat() {
  const [selectedKandang, setSelectedKandang] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [binSize, setBinSize] = useState(10);
  const [analysis, setAnalysis] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(false);

  const kandangs = useLiveQuery(() => getAllKandangs(), []);
  const sessions = useLiveQuery(
    () => selectedKandang
      ? db.sessions.where('kandang').equals(selectedKandang).reverse().toArray()
      : [],
    [selectedKandang]
  );

  // Reset session saat kandang berubah
  useEffect(() => {
    setSelectedSession('');
    setAnalysis(null);
    setDistribution([]);
  }, [selectedKandang]);

  // Hitung analisa & distribusi saat session dipilih
  useEffect(() => {
    if (!selectedSession) {
      setAnalysis(null);
      setDistribution([]);
      return;
    }
    loadData(selectedSession, binSize);
  }, [selectedSession, binSize]);

  const loadData = async (sessionId, bin) => {
    setLoading(true);
    try {
      const data = await db.timbang.where('session_id').equals(Number(sessionId)).toArray();
      if (data.length === 0) {
        setAnalysis(null);
        setDistribution([]);
        return;
      }

      const weights = data.map(d => d.berat);
      const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / mean) * 100;
      const lowerBound = mean * 0.9;
      const upperBound = mean * 1.1;
      const uniformCount = weights.filter(w => w >= lowerBound && w <= upperBound).length;
      const uniformity = (uniformCount / weights.length) * 100;
      const min = Math.min(...weights);
      const max = Math.max(...weights);

      setAnalysis({
        totalEkor: weights.length,
        mean: Math.round(mean),
        cv: cv.toFixed(1),
        uniformity: uniformity.toFixed(1),
        stdDev: stdDev.toFixed(1),
        min,
        max,
        lowerBound: Math.round(lowerBound),
        upperBound: Math.round(upperBound)
      });

      setDistribution(buildDistribution(weights, bin));
    } finally {
      setLoading(false);
    }
  };

  const selectedSessionObj = sessions?.find(s => s.id === Number(selectedSession));

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-1">📊 Sebaran Berat Timbang</h2>
        <p className="text-sm text-gray-500">Pilih kandang dan sesi untuk melihat grafik distribusi berat</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        {/* Pilih Kandang */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Kandang</label>
          <select
            className="w-full p-3 border-2 rounded-lg focus:border-green-500 focus:outline-none text-sm"
            value={selectedKandang}
            onChange={e => setSelectedKandang(e.target.value)}
          >
            <option value="">— Pilih Kandang —</option>
            {kandangs?.map(k => (
              <option key={k.id} value={k.kode}>{k.kode} — {k.nama}</option>
            ))}
          </select>
        </div>

        {/* Pilih Sesi */}
        {selectedKandang && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sesi Timbang</label>
            {!sessions || sessions.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Belum ada sesi untuk kandang ini</p>
            ) : (
              <select
                className="w-full p-3 border-2 rounded-lg focus:border-green-500 focus:outline-none text-sm"
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
              >
                <option value="">— Pilih Sesi —</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    Minggu {s.umur_mg} — {new Date(s.created_at).toLocaleDateString('id-ID')}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Ukuran Bin */}
        {selectedSession && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Interval Grafik: <span className="text-green-600">{binSize} gr</span>
            </label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(b => (
                <button
                  key={b}
                  onClick={() => setBinSize(b)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition ${
                    binSize === b
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                  }`}
                >
                  {b} gr
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <div className="animate-spin text-3xl mb-2">⟳</div>
          <p className="text-sm">Memuat data...</p>
        </div>
      )}

      {/* Hasil */}
      {!loading && analysis && (
        <>
          {/* Info Sesi */}
          {selectedSessionObj && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-green-800">
                📍 {selectedKandang} — Minggu {selectedSessionObj.umur_mg}
              </span>
              <span className="text-green-700">
                🗓 {new Date(selectedSessionObj.created_at).toLocaleDateString('id-ID')}
              </span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Ekor" value={analysis.totalEkor} unit="ekor" color="blue" />
            <StatCard label="Rata-rata" value={analysis.mean} unit="gr" color="green" />
            <StatCard label="Keseragaman" value={analysis.uniformity} unit="%" color={parseFloat(analysis.uniformity) >= 80 ? 'green' : parseFloat(analysis.uniformity) >= 60 ? 'yellow' : 'red'} />
            <StatCard label="CV" value={analysis.cv} unit="%" color={parseFloat(analysis.cv) <= 8 ? 'green' : parseFloat(analysis.cv) <= 12 ? 'yellow' : 'red'} />
            <StatCard label="Berat Min" value={analysis.min} unit="gr" color="gray" />
            <StatCard label="Berat Max" value={analysis.max} unit="gr" color="gray" />
          </div>

          {/* Zona Keseragaman */}
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">🎯 Zona Keseragaman (±10% dari rata-rata)</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              <span className="text-gray-600">Dalam zona: <strong>{analysis.lowerBound} – {analysis.upperBound} gr</strong></span>
            </div>
            {/* Progress bar keseragaman */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0%</span>
                <span className="font-semibold text-gray-700">{analysis.uniformity}%</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    parseFloat(analysis.uniformity) >= 80 ? 'bg-green-500'
                    : parseFloat(analysis.uniformity) >= 60 ? 'bg-yellow-400'
                    : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(parseFloat(analysis.uniformity), 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 font-semibold ${
                parseFloat(analysis.uniformity) >= 80 ? 'text-green-600'
                : parseFloat(analysis.uniformity) >= 60 ? 'text-yellow-600'
                : 'text-red-600'
              }`}>
                {parseFloat(analysis.uniformity) >= 80 ? '✅ Keseragaman Baik'
                  : parseFloat(analysis.uniformity) >= 60 ? '⚠️ Keseragaman Cukup'
                  : '❌ Keseragaman Rendah'}
              </p>
            </div>
          </div>

          {/* Grafik Distribusi */}
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              📈 Distribusi Berat (interval {binSize} gr)
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${v}`}
                  label={{ value: 'Berat (gr)', position: 'insideBottom', offset: -2, fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                {/* Garis rata-rata */}
                <ReferenceLine
                  x={String(Math.floor(analysis.mean / binSize) * binSize)}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  label={{ value: `Rata-rata ${analysis.mean}gr`, position: 'top', fontSize: 10, fill: '#10b981' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {distribution.map((entry) => {
                    const inZone = entry.from >= analysis.lowerBound && entry.to <= analysis.upperBound + binSize;
                    return (
                      <Cell
                        key={entry.label}
                        fill={inZone ? '#10b981' : '#d1d5db'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500 inline-block"></span> Dalam zona ±10%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-300 inline-block"></span> Di luar zona
              </span>
            </div>
          </div>

          {/* Tabel Distribusi */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm font-semibold text-gray-700">📋 Tabel Distribusi</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Rentang (gr)</th>
                    <th className="p-3 text-right">Jumlah</th>
                    <th className="p-3 text-right">%</th>
                    <th className="p-3 text-left">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map(row => {
                    const pct = ((row.count / analysis.totalEkor) * 100).toFixed(1);
                    const inZone = row.from >= analysis.lowerBound && row.to <= analysis.upperBound + binSize;
                    return (
                      <tr key={row.label} className={`border-b ${inZone ? 'bg-green-50' : ''}`}>
                        <td className="p-3 font-medium">
                          {row.range} gr
                          {inZone && <span className="ml-1 text-xs text-green-600">✓</span>}
                        </td>
                        <td className="p-3 text-right font-bold">{row.count}</td>
                        <td className="p-3 text-right text-gray-500">{pct}%</td>
                        <td className="p-3">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${inZone ? 'bg-green-500' : 'bg-gray-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !analysis && !selectedSession && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-semibold text-gray-500">Pilih kandang dan sesi timbang</p>
          <p className="text-sm mt-1">untuk melihat grafik sebaran berat</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    gray:   'bg-gray-50 text-gray-700 border-gray-100',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}<span className="text-sm font-normal ml-1">{unit}</span></p>
    </div>
  );
}
