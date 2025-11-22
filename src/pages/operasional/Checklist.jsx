import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { orderAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const OperasionalChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchChecklist();
  }, [selectedDate]);

  const getDefaultChecklist = () => {
    return {
      sections: [
        {
          id: 'section1',
          title: '1. CEK DASHBOARD UTAMA SETIAP AWAL SHIFT',
          items: [
            { id: 'item_1', text: 'Login ke dashboard admin operasional menggunakan akun resmi.', checked: false },
            { id: 'item_2', text: 'Periksa tampilan ringkasan: Jumlah pesanan baru hari ini, Pesanan yang sedang diproses, Pesanan dalam pengiriman, Pesanan selesai, Jumlah review yang masuk', checked: false },
            { id: 'item_3', text: 'Pastikan tidak ada error data atau status yang tidak sinkron antar dashboard.', checked: false },
          ]
        },
        {
          id: 'section2',
          title: '2. MONITOR PESANAN BARU',
          items: [
            { id: 'item_1', text: 'Cek tab Pesanan Baru di dashboard.', checked: false },
            { id: 'item_2', text: 'Verifikasi data pelanggan & pesanan (tanggal, lokasi, jumlah, jenis produk).', checked: false },
            { id: 'item_3', text: 'Cek status pembayaran: lunas / DP / belum bayar.', checked: false },
            { id: 'item_4', text: 'Tugaskan ke tim untuk memproses pesanan', checked: false },
            { id: 'item_5', text: 'Pastikan status otomatis berubah ke "Sedang Diproses" apabila pesanan selesai diproses.', checked: false },
            { id: 'item_6', text: 'Kirim konfirmasi ke pelanggan melalui WhatsApp, jika perlu.', checked: false },
          ]
        },
        {
          id: 'section3',
          title: '3. MONITOR PROSES DAPUR',
          items: [
            { id: 'item_1', text: 'Cek status bahan & progress (persiapan, masak, siap kemas).', checked: false },
            { id: 'item_2', text: 'Pastikan tidak ada pesanan yang tertahan lebih dari batas waktu SOP.', checked: false },
            { id: 'item_3', text: 'Jika ada kendala (bahan habis, alat rusak, dll) segera diselesaikan', checked: false },
            { id: 'item_4', text: 'Tandai pesanan "Siap Dikirim" setelah diverifikasi kualitas & jumlahnya.', checked: false },
          ]
        },
        {
          id: 'section4',
          title: '🚚 4. MONITOR PENGIRIMAN',
          items: [
            { id: 'item_1', text: 'Pastikan dashboard kurir sudah menerima notifikasi "Siap Dikirim".', checked: false },
            { id: 'item_2', text: 'Tentukan kurir yang bertugas & rute (cek fitur assign kurir).', checked: false },
            { id: 'item_3', text: 'Pastikan kurir: Membawa nota & nomor pelanggan, Menyiapkan jas hujan, plastik pelindung, dan perlengkapan keamanan', checked: false },
            { id: 'item_4', text: 'Pastikan status berubah otomatis ke "Dalam Pengiriman".', checked: false },
            { id: 'item_5', text: 'Konfirmasi penerimaan dari pembeli saat pesanan sampai.', checked: false },
          ]
        },
        {
          id: 'section5',
          title: '5. MONITOR PESANAN SELESAI',
          items: [
            { id: 'item_1', text: 'Cek tab Selesai di dashboard.', checked: false },
            { id: 'item_2', text: 'Pastikan kurir sudah mengunggah bukti serah terima (foto & waktu).', checked: false },
            { id: 'item_3', text: 'Kirim pesan ucapan terima kasih & permintaan review ke pembeli.', checked: false },
          ]
        },
        {
          id: 'section6',
          title: '6. MONITOR REVIEW PEMBELI',
          items: [
            { id: 'item_1', text: 'Cek tab Review / Feedback di dashboard.', checked: false },
            { id: 'item_2', text: 'Klasifikasikan review: positif / negatif / saran.', checked: false },
            { id: 'item_3', text: 'Jika review negatif → buat tiket keluhan dan teruskan ke tim terkait (dapur / kurir).', checked: false },
            { id: 'item_4', text: 'Balas review positif dengan ucapan terima kasih.', checked: false },
          ]
        },
        {
          id: 'section7',
          title: '7. KOORDINASI & KESINKRONAN DASHBOARD',
          items: [
            { id: 'item_1', text: 'Pastikan semua dashboard (Admin – Dapur – Kurir) sinkron real time.', checked: false },
            { id: 'item_2', text: 'Cek bahwa setiap perubahan status otomatis muncul di semua pihak.', checked: false },
            { id: 'item_3', text: 'Laporkan ke IT jika dashboard lambat / tidak update.', checked: false },
            { id: 'item_4', text: 'Lakukan refresh data setiap 30 menit selama jam operasional.', checked: false },
          ]
        },
        {
          id: 'section8',
          title: '8. EVALUASI & LAPORAN AKHIR HARI',
          items: [
            { id: 'item_1', text: 'Catat keterlambatan atau kendala jika ada (dapur, kurir, pembayaran).', checked: false },
            { id: 'item_2', text: 'Buat laporan singkat untuk pimpinan / manajer operasional.', checked: false },
            { id: 'item_3', text: 'Update SOP bila ditemukan pola masalah yang berulang.', checked: false },
          ]
        },
      ]
    };
  };

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOperasionalChecklist(selectedDate);
      if (response.data && response.data.checklist_data) {
        let checklistData = response.data.checklist_data;
        if (typeof checklistData === 'string') {
          checklistData = JSON.parse(checklistData);
        }
        setChecklist(checklistData);
      } else {
        setChecklist(getDefaultChecklist());
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
      // If no checklist exists, use default
      setChecklist(getDefaultChecklist());
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklistItem = (sectionId, itemId) => {
    setChecklist(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const section = updated.sections.find(s => s.id === sectionId);
      if (section) {
        const item = section.items.find(i => i.id === itemId);
        if (item) {
          item.checked = !item.checked;
        }
      }
      return updated;
    });
  };

  const handleSaveChecklist = async () => {
    try {
      setSaving(true);
      await orderAPI.saveOperasionalChecklist(selectedDate, { checklist_data: checklist });
      alert('Checklist berhasil disimpan!');
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Gagal menyimpan checklist: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    if (!checklist || !checklist.sections) return 0;
    const totalItems = checklist.sections.reduce((sum, section) => sum + section.items.length, 0);
    const checkedItems = checklist.sections.reduce(
      (sum, section) => sum + section.items.filter(item => item.checked).length,
      0
    );
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  };

  const progress = getProgress();

  if (loading) {
    return (
      <DashboardLayout role="operasional">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="operasional">
      <div>
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Checklist Operasional Harian</h1>
            <p className="text-gray-600 mt-1">Ceklis aktivitas operasional untuk memastikan semua berjalan dengan baik</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => navigate('/operasional/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Kembali
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Progress Checklist</h2>
            <span className="text-2xl font-bold text-primary-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-primary-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {checklist?.sections?.reduce((sum, s) => sum + s.items.filter(i => i.checked).length, 0) || 0} dari{' '}
            {checklist?.sections?.reduce((sum, s) => sum + s.items.length, 0) || 0} item selesai
          </p>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-6 mb-6">
          {checklist?.sections?.map((section, sectionIndex) => (
            <div key={section.id} className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                {section.title}
              </h3>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={() => toggleChecklistItem(section.id, item.id)}
                      className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Simpan Checklist</h3>
            <p className="text-sm text-gray-600 mt-1">
              Progress Anda akan otomatis tersimpan setiap kali Anda mencentang item
            </p>
          </div>
          <button
            onClick={handleSaveChecklist}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Checklist
              </>
            )}
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Tips Checklist Operasional</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Gunakan checklist ini setiap awal shift untuk memastikan semua aktivitas terpantau</li>
                <li>• Checklist akan tersimpan per tanggal, jadi Anda bisa mengecek kembali checklist hari sebelumnya</li>
                <li>• Pastikan semua item telah dicentang sebelum mengakhiri shift</li>
                <li>• Jika ada kendala, catat di laporan akhir hari</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OperasionalChecklist;

