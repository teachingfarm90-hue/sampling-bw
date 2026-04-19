import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { registerKandang, getAllKandangs, updateKandang, deleteKandang } from '../lib/db';
import { canDelete } from '../lib/auth';

export default function KandangManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    penanggung_jawab: '',
    kontak: '',
    kapasitas: ''
  });

  const kandangs = useLiveQuery(() => getAllKandangs(), []);
  const userCanDelete = canDelete();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateKandang(editingId, formData);
        alert('Kandang berhasil diperbarui!');
      } else {
        await registerKandang(formData);
        alert('Kandang berhasil didaftarkan!');
      }
      resetForm();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (kandang) => {
    setFormData({
      kode: kandang.kode,
      nama: kandang.nama,
      penanggung_jawab: kandang.penanggung_jawab,
      kontak: kandang.kontak,
      kapasitas: kandang.kapasitas
    });
    setEditingId(kandang.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!userCanDelete) {
      alert('Hanya admin yang dapat menghapus data!');
      return;
    }
    
    if (confirm('Yakin ingin menghapus kandang ini?')) {
      try {
        await deleteKandang(id);
        alert('Kandang berhasil dihapus!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      penanggung_jawab: '',
      kontak: '',
      kapasitas: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Manajemen Kandang</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            {showForm ? 'Tutup Form' : '+ Daftar Kandang Baru'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Kandang' : 'Daftar Kandang Baru'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-semibold">Kode Kandang *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                  placeholder="Contoh: A, B, C1"
                  required
                  disabled={editingId !== null}
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Nama Kandang *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Kandang Broiler A"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Penanggung Jawab *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formData.penanggung_jawab}
                  onChange={(e) => setFormData({ ...formData, penanggung_jawab: e.target.value })}
                  placeholder="Nama lengkap"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Kontak *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formData.kontak}
                  onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                  placeholder="No. HP / Email"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Kapasitas (ekor)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formData.kapasitas}
                  onChange={(e) => setFormData({ ...formData, kapasitas: e.target.value })}
                  placeholder="Contoh: 5000"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                {editingId ? 'Update' : 'Daftar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Daftar Kandang Terdaftar</h3>
        
        {!kandangs || kandangs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Belum ada kandang terdaftar.</p>
            <p className="text-sm mt-2">Klik tombol "Daftar Kandang Baru" untuk memulai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Kode</th>
                  <th className="p-3 text-left">Nama Kandang</th>
                  <th className="p-3 text-left">Penanggung Jawab</th>
                  <th className="p-3 text-left">Kontak</th>
                  <th className="p-3 text-left">Kapasitas</th>
                  <th className="p-3 text-left">Dibuat Oleh</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kandangs.map((kandang) => (
                  <tr key={kandang.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold">{kandang.kode}</td>
                    <td className="p-3">{kandang.nama}</td>
                    <td className="p-3">{kandang.penanggung_jawab}</td>
                    <td className="p-3">{kandang.kontak}</td>
                    <td className="p-3">{kandang.kapasitas ? `${kandang.kapasitas} ekor` : '-'}</td>
                    <td className="p-3">
                      <div className="text-sm">
                        <p className="font-semibold">{kandang.created_by || '-'}</p>
                        {kandang.updated_by && (
                          <p className="text-xs text-gray-500">Edit: {kandang.updated_by}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(kandang)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                        >
                          Edit
                        </button>
                        {userCanDelete && (
                          <button
                            onClick={() => handleDelete(kandang.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {kandangs && kandangs.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mt-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Tips:</strong> Pastikan data kandang sudah lengkap sebelum memulai sesi timbang. 
            Penanggung jawab akan bertanggung jawab atas data yang diinput dari kandang tersebut.
          </p>
          {!userCanDelete && (
            <p className="text-sm text-orange-700 mt-2">
              ⚠️ <strong>Catatan:</strong> Anda tidak memiliki akses untuk menghapus data. Hanya admin yang dapat menghapus kandang.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
