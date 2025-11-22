import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminChecklistAPI } from '../../utils/api';

const AdminChecklist = () => {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const getDefaultChecklist = () => {
    return {
      daily: [
        {
          id: 'daily_1',
          section: '1. Input Orderan di Dashboard',
          items: [
            { id: 'item_1', text: 'Input semua pesanan baru ke dashboard dengan data lengkap', checked: false },
            { id: 'item_2', text: 'Pastikan status pesanan sudah sesuai', checked: false },
            { id: 'item_3', text: 'Cek ulang agar tidak ada pesanan yang terlewat', checked: false },
          ]
        },
        {
          id: 'daily_2',
          section: '2. Catat Keuangan di Arus Kas',
          items: [
            { id: 'item_1', text: 'Catat pemasukan & pengeluaran di arus kas', checked: false },
            { id: 'item_2', text: 'Upload bukti transaksi setiap kali ada uang masuk atau keluar', checked: false },
            { id: 'item_3', text: 'Pastikan saldo kas sesuai antara fisik dan dashboard', checked: false },
          ]
        },
        {
          id: 'daily_3',
          section: '3. Pantau Transaksi Pesanan',
          items: [
            { id: 'item_1', text: 'Cek transaksi berjalan di dashboard', checked: false },
            { id: 'item_2', text: 'Pastikan semua pembayaran sudah dikonfirmasi / valid', checked: false },
            { id: 'item_3', text: 'Pantau pesanan COD / transfer sampai selesai', checked: false },
            { id: 'item_4', text: 'Laporkan ke owner jika ada pesanan belum dibayar atau bermasalah', checked: false },
          ]
        },
      ],
      monthly: [
        {
          id: 'monthly_1',
          section: 'CHECKLIST BULANAN',
          items: [
            { id: 'item_1', text: 'Export laporan penjualan & arus kas bulanan dari dashboard', checked: false },
            { id: 'item_2', text: 'Verifikasi semua bukti transaksi lengkap dan tersimpan', checked: false },
            { id: 'item_3', text: 'Rekap total pemasukan, pengeluaran, dan saldo akhir bulan', checked: false },
            { id: 'item_4', text: 'Laporkan hasil keuangan bulanan ke owner', checked: false },
          ]
        },
      ]
    };
  };

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminChecklistAPI.getByDate(selectedDate);
      if (response.data) {
        setChecklist(response.data.checklist_data);
        setNotes(response.data.notes || '');
      } else {
        setChecklist(getDefaultChecklist());
        setNotes('');
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
      setChecklist(getDefaultChecklist());
      setNotes('');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const handleItemToggle = (type, sectionId, itemId) => {
    setChecklist((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const section = updated[type].find((s) => s.id === sectionId);
      if (section) {
        const item = section.items.find((i) => i.id === itemId);
        if (item) {
          item.checked = !item.checked;
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminChecklistAPI.save(selectedDate, {
        checklist_data: checklist,
        notes: notes
      });
      alert('Checklist berhasil disimpan');
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Gagal menyimpan checklist: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getProgress = (type) => {
    if (!checklist || !checklist[type]) return 0;
    const sections = checklist[type];
    let total = 0;
    let checked = 0;
    sections.forEach((section) => {
      section.items.forEach((item) => {
        total++;
        if (item.checked) checked++;
      });
    });
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Checklist Harian</h1>
          <p className="text-gray-600 mt-1">Kelola checklist harian dan bulanan admin</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Pilih Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Daily Checklist */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">CHECKLIST HARIAN</h2>
            <div className="text-sm text-gray-600">
              Progress: <span className="font-semibold text-primary-600">{getProgress('daily')}%</span>
            </div>
          </div>

          <div className="space-y-6">
            {checklist?.daily?.map((section) => (
              <div key={section.id} className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-3">{section.section}</h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleItemToggle('daily', section.id, item.id)}
                        className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className={`flex-1 ${item.checked ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Checklist */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">CHECKLIST BULANAN</h2>
            <div className="text-sm text-gray-600">
              Progress: <span className="font-semibold text-primary-600">{getProgress('monthly')}%</span>
            </div>
          </div>

          <div className="space-y-6">
            {checklist?.monthly?.map((section) => (
              <div key={section.id} className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-3">{section.section}</h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleItemToggle('monthly', section.id, item.id)}
                        className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className={`flex-1 ${item.checked ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Tambahkan catatan atau keterangan..."
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400 font-semibold"
          >
            {saving ? 'Menyimpan...' : 'Simpan Checklist'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminChecklist;

