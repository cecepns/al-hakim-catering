import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipboardCheck, Plus, Save, Settings, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { checklistTemplateAPI, orderAPI } from '../../utils/api';

const ROLE_OPTIONS = [
  { key: 'operasional', label: 'Operasional', color: 'purple' },
  { key: 'dapur', label: 'Dapur', color: 'amber' },
  { key: 'kurir', label: 'Kurir / Pengiriman', color: 'blue' },
  { key: 'admin', label: 'Admin', color: 'emerald' },
];

const OperasionalChecklist = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'templates'

  // Tab 1: Checklist Harian Operasional
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Tab 2: Kelola Template Checklist (Semua Role)
  const [templateRole, setTemplateRole] = useState('operasional');
  const [templateData, setTemplateData] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    fetchChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplateForRole(templateRole);
    }
  }, [activeTab, templateRole]);

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
          title: '4. MONITOR PENGIRIMAN',
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
            { id: 'item_3', text: 'Jika review negatif -> buat tiket keluhan dan teruskan ke tim terkait (dapur / kurir).', checked: false },
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
      setChecklist(getDefaultChecklist());
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateForRole = async (roleKey) => {
    try {
      setTemplateLoading(true);
      const response = await checklistTemplateAPI.getByRole(roleKey);
      let data = response.data?.template_data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      if (roleKey === 'admin') {
        setTemplateData({
          daily: Array.isArray(data?.daily) ? data.daily : [],
          monthly: Array.isArray(data?.monthly) ? data.monthly : [],
        });
      } else {
        setTemplateData({
          sections: Array.isArray(data?.sections) ? data.sections : [],
        });
      }
    } catch (error) {
      console.error('Error fetching checklist template:', error);
      toast.error('Gagal memuat template checklist');
    } finally {
      setTemplateLoading(false);
    }
  };

  const toggleChecklistItem = (sectionId, itemId) => {
    setChecklist((prev) => {
      const updated = JSON.parse(JSON.stringify(prev || { sections: [] }));
      const section = (updated.sections || []).find((s) => s.id === sectionId);
      if (section) {
        const item = (section.items || []).find((i) => i.id === itemId);
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
      toast.success('Checklist harian operasional berhasil disimpan!');
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Gagal menyimpan checklist: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    if (!checklist || !Array.isArray(checklist.sections)) return 0;
    const totalItems = checklist.sections.reduce((sum, section) => sum + (section.items || []).length, 0);
    const checkedItems = checklist.sections.reduce(
      (sum, section) => sum + (section.items || []).filter((item) => item.checked).length,
      0
    );
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  };

  // ========================================
  // TEMPLATE EDITOR HANDLERS (ALL ROLES)
  // ========================================
  const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const handleAddSection = (groupKey = 'sections') => {
    setTemplateData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(copy[groupKey])) copy[groupKey] = [];
      const newSec =
        templateRole === 'admin'
          ? {
              id: makeId(groupKey),
              section: 'Bagian Baru',
              items: [{ id: makeId('item'), text: '', checked: false }],
            }
          : {
              id: makeId('sec'),
              title: 'Bagian Baru',
              items: [{ id: makeId('item'), text: '', checked: false }],
            };
      copy[groupKey].push(newSec);
      return copy;
    });
  };

  const handleSectionTitleChange = (groupKey, sectionId, value) => {
    const titleField = templateRole === 'admin' ? 'section' : 'title';
    setTemplateData((prev) => ({
      ...prev,
      [groupKey]: (prev?.[groupKey] || []).map((sec) =>
        sec.id === sectionId ? { ...sec, [titleField]: value } : sec
      ),
    }));
  };

  const handleDeleteSection = (groupKey, sectionId) => {
    const targetSec = (templateData?.[groupKey] || []).find((s) => s.id === sectionId);
    if ((targetSec?.items || []).length > 0) {
      if (!window.confirm('Hapus bagian checklist ini beserta seluruh item di dalamnya?')) return;
    }
    setTemplateData((prev) => ({
      ...prev,
      [groupKey]: (prev?.[groupKey] || []).filter((sec) => sec.id !== sectionId),
    }));
  };

  const handleAddItem = (groupKey, sectionId) => {
    setTemplateData((prev) => ({
      ...prev,
      [groupKey]: (prev?.[groupKey] || []).map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              items: [...(sec.items || []), { id: makeId('item'), text: '', checked: false }],
            }
          : sec
      ),
    }));
  };

  const handleItemTextChange = (groupKey, sectionId, itemId, value) => {
    setTemplateData((prev) => ({
      ...prev,
      [groupKey]: (prev?.[groupKey] || []).map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              items: (sec.items || []).map((it) =>
                it.id === itemId ? { ...it, text: value } : it
              ),
            }
          : sec
      ),
    }));
  };

  const handleDeleteItem = (groupKey, sectionId, itemId) => {
    setTemplateData((prev) => ({
      ...prev,
      [groupKey]: (prev?.[groupKey] || []).map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              items: (sec.items || []).filter((it) => it.id !== itemId),
            }
          : sec
      ),
    }));
  };

  const sanitizeSections = (sections = [], titleField) =>
    sections
      .map((sec) => ({
        ...sec,
        [titleField]: String(sec[titleField] || '').trim(),
        items: (sec.items || [])
          .filter((it) => String(it.text || '').trim() !== '')
          .map((it) => ({
            id: it.id || makeId('item'),
            text: String(it.text).trim(),
            checked: false,
          })),
      }))
      .filter((sec) => sec[titleField] !== '' || sec.items.length > 0);

  const handleSaveTemplate = async () => {
    if (!templateData) return;

    let payload;
    if (templateRole === 'admin') {
      payload = {
        daily: sanitizeSections(templateData.daily || [], 'section'),
        monthly: sanitizeSections(templateData.monthly || [], 'section'),
      };
    } else {
      payload = {
        sections: sanitizeSections(templateData.sections || [], 'title'),
      };
    }

    try {
      setTemplateSaving(true);
      await checklistTemplateAPI.update(templateRole, payload);
      setTemplateData(payload);
      toast.success(`Template checklist untuk role ${templateRole} berhasil disimpan!`);
      if (templateRole === 'operasional') {
        fetchChecklist();
      }
    } catch (error) {
      console.error('Error saving checklist template:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan template checklist');
    } finally {
      setTemplateSaving(false);
    }
  };

  const renderSectionGroupEditor = (groupKey, groupTitle, badgeColor = 'purple') => {
    const sections = templateData?.[groupKey] || [];
    const titleField = templateRole === 'admin' ? 'section' : 'title';

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">{groupTitle}</h3>
          <button
            type="button"
            onClick={() => handleAddSection(groupKey)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ${
              badgeColor === 'green'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-700 hover:bg-purple-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            Tambah Bagian
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
            Belum ada bagian checklist. Klik &quot;Tambah Bagian&quot; untuk membuat bagian baru.
          </div>
        ) : (
          sections.map((section, idx) => (
            <div
              key={section.id}
              className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                <input
                  type="text"
                  value={section[titleField] || ''}
                  onChange={(e) => handleSectionTitleChange(groupKey, section.id, e.target.value)}
                  placeholder="Nama Bagian Checklist..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteSection(groupKey, section.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Hapus Bagian"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 pl-6">
                {(section.items || []).map((item, itemIdx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{itemIdx + 1}.</span>
                    <input
                      type="text"
                      value={item.text || ''}
                      onChange={(e) =>
                        handleItemTextChange(groupKey, section.id, item.id, e.target.value)
                      }
                      placeholder="Tuliskan deskripsi item checklist..."
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(groupKey, section.id, item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddItem(groupKey, section.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Item Checklist
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const progress = getProgress();

  return (
    <DashboardLayout role="operasional">
      <div>
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Checklist Operasional &amp; Pengaturan Semua Role
            </h1>
            <p className="text-gray-600 mt-1">
              Isi checklist harian operasional serta kelola daftar checklist untuk Admin, Operasional, Dapur, dan Kurir
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'daily' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            )}
            <button
              onClick={() => navigate('/operasional/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Kembali
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'daily'
                ? 'bg-primary-600 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Checklist Harian Operasional
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'templates'
                ? 'bg-purple-700 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Edit &amp; Tambah Checklist Semua Role
          </button>
        </div>

        {activeTab === 'daily' ? (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
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
                  {(checklist?.sections || []).reduce(
                    (sum, s) => sum + (s.items || []).filter((i) => i.checked).length,
                    0
                  )}{' '}
                  dari{' '}
                  {(checklist?.sections || []).reduce(
                    (sum, s) => sum + (s.items || []).length,
                    0
                  )}{' '}
                  item selesai
                </p>
              </div>

              {/* Checklist Sections */}
              <div className="space-y-6 mb-6">
                {(checklist?.sections || []).map((section) => (
                  <div key={section.id} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                      {section.title}
                    </h3>
                    <div className="space-y-3">
                      {(section.items || []).map((item) => (
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
                          <span
                            className={`flex-1 text-sm ${
                              item.checked ? 'text-gray-500 line-through' : 'text-gray-700'
                            }`}
                          >
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Simpan Checklist</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Klik Simpan setelah mencentang item agar progres tersimpan ke sistem
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
                      <Save className="w-5 h-5" />
                      Simpan Checklist
                    </>
                  )}
                </button>
              </div>
            </>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            {/* Role Selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pilih Role yang Template Checklist-nya Ingin Diedit / Ditambahkan:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setTemplateRole(r.key)}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                      templateRole === r.key
                        ? 'bg-purple-700 text-white border-purple-700 shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {templateLoading || !templateData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {templateRole === 'admin' ? (
                  <>
                    {renderSectionGroupEditor('daily', 'Checklist Harian Admin', 'purple')}
                    <div className="border-t pt-6">
                      {renderSectionGroupEditor('monthly', 'Checklist Bulanan Admin', 'green')}
                    </div>
                  </>
                ) : (
                  renderSectionGroupEditor(
                    'sections',
                    `Daftar Bagian & Item Checklist (${
                      ROLE_OPTIONS.find((r) => r.key === templateRole)?.label || templateRole
                    })`,
                    'purple'
                  )
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Perubahan template otomatis diterapkan ke dashboard role terkait (hari ini &amp; tanggal berikutnya).
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={templateSaving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition font-semibold text-sm disabled:bg-gray-400"
                  >
                    <Save className="w-4 h-4" />
                    {templateSaving
                      ? 'Menyimpan Template...'
                      : `Simpan Checklist ${
                          ROLE_OPTIONS.find((r) => r.key === templateRole)?.label || ''
                        }`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Tips Checklist Operasional</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Gunakan checklist ini setiap awal shift untuk memastikan semua aktivitas terpantau</li>
                <li>• Checklist akan tersimpan per tanggal, sehingga progres hari sebelumnya tetap terdokumentasi</li>
                <li>• Gunakan tab &quot;Edit &amp; Tambah Checklist Semua Role&quot; untuk menyesuaikan item checklist Dapur, Kurir, Admin, maupun Operasional</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OperasionalChecklist;
