import { useState, useEffect } from 'react';
import { db, createSession, addTimbang, getSessionData, calculateAnalysis, getAllKandangs } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function MobileInput() {
  const [kandang, setKandang] = useState('');
  const [umurMg, setUmurMg] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [berat, setBerat] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [kandangInfo, setKandangInfo] = useState(null);

  const kandangs = useLiveQuery(() => getAllKandangs(), []);
  const data = useLiveQuery(
    () => sessionId ? getSessionData(sessionId) : [],
    [sessionId]
  );

  useEffect(() => {
    if (kandang && kandangs) {
      const info = kandangs.find(k => k.kode === kandang);
      setKandangInfo(info);
    }
  }, [kandang, kandangs]);

  const handleStartSession = async () => {
    if (!kandang || !umurMg) {
      alert('Pilih kandang dan umur terlebih dahulu');
      return;
    }
    const id = await createSession(kandang, parseInt(umurMg));
    setSessionId(id);
  };

  const handleAddBerat = async () => {
    if (!berat || berat.length > 4) {
      alert('Masukkan berat maksimal 4 digit');
      return;
    }
    await addTimbang(sessionId, parseInt(berat));
    setBerat('');
  };

  const handleReview = () => {
    setShowReview(true);
  };

  if (!sessionId) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Setup Sesi Timbang</h2>
        
        {!kandangs || kandangs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ Belum ada kandang terdaftar</p>
            <p className="text-sm text-yellow-700 mb-3">
              Silakan daftarkan kandang terlebih dahulu di menu Kandang.
            </p>
            <a 
              href="/kandang"
              className="inline-block bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Ke Halaman Kandang
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold">Kandang</label>
              <select 
                className="w-full p-2 border rounded"
                value={kandang}
                onChange={(e) => setKandang(e.target.value)}
              >
                <option value="">Pilih Kandang</option>
                {kandangs.map(k => (
                  <option key={k.id} value={k.kode}>
                    {k.kode} - {k.nama}
                  </option>
                ))}
              </select>
            </div>

            {kandangInfo && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p><strong>Penanggung Jawab:</strong> {kandangInfo.penanggung_jawab}</p>
                <p><strong>Kontak:</strong> {kandangInfo.kontak}</p>
                {kandangInfo.kapasitas && (
                  <p><strong>Kapasitas:</strong> {kandangInfo.kapasitas} ekor</p>
                )}
              </div>
            )}

            <div>
              <label className="block mb-2 font-semibold">Umur (Minggu)</label>
              <input 
                type="number"
                className="w-full p-2 border rounded"
                value={umurMg}
                onChange={(e) => setUmurMg(e.target.value)}
                placeholder="Contoh: 6"
              />
            </div>
            <button 
              onClick={handleStartSession}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Mulai Sesi
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showReview) {
    return <ReviewScreen sessionId={sessionId} onBack={() => setShowReview(false)} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Kandang {kandang} - Minggu {umurMg}</h2>
            <p className="text-gray-600">Jumlah Data: {data?.length || 0} Ekor</p>
            {kandangInfo && (
              <p className="text-sm text-gray-500">PJ: {kandangInfo.penanggung_jawab}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="number"
            className="flex-1 p-3 border-2 rounded-lg text-lg"
            value={berat}
            onChange={(e) => setBerat(e.target.value)}
            placeholder="Berat (gram)"
            maxLength={4}
          />
          <button 
            onClick={handleAddBerat}
            className="w-24 bg-green-600 text-white rounded-lg font-bold text-2xl hover:bg-green-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-4 max-h-96 overflow-y-auto">
        <h3 className="font-bold mb-3">Data Timbang Terbaru</h3>
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">No</th>
              <th className="p-2 text-right">Berat (gr)</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-2">{item.id_ayam}</td>
                <td className="p-2 text-right font-semibold">{item.berat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={handleReview}
        disabled={!data || data.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        Review & Simpan
      </button>
    </div>
  );
}

function ReviewScreen({ sessionId, onBack }) {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    calculateAnalysis(sessionId).then(setAnalysis);
  }, [sessionId]);

  if (!analysis) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Hasil Analisa</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-gray-600">Total Ekor</p>
            <p className="text-3xl font-bold">{analysis.totalEkor}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-gray-600">Rata-rata Berat</p>
            <p className="text-3xl font-bold">{analysis.mean} gr</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="text-gray-600">Keseragaman</p>
            <p className="text-3xl font-bold">{analysis.uniformity}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-gray-600">CV</p>
            <p className="text-3xl font-bold">{analysis.cv}%</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700"
          >
            Kembali
          </button>
          <button 
            onClick={() => alert('Data tersimpan!')}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
