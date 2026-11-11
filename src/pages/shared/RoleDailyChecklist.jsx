import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardCheck, Save } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { roleChecklistAPI } from '../../utils/api';

const RoleDailyChecklist = ({ role: propRole }) => {
  const { user } = useAuth();
  const effectiveRole = propRole || user?.role || 'dapur';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [checklist, setChecklist] = useState({ sections: [] });
  const [notes, setNotes] = useState('');

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await roleChecklistAPI.getByDate(effectiveRole, selectedDate);
      if (response.data && response.data.checklist_data) {
        setChecklist(response.data.checklist_data);
        setNotes(response.data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching role checklist:', error);
      toast.error('Gagal memuat checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole, selectedDate]);

  const handleToggleItem = (sectionId, itemId) => {
    setChecklist((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: (section.items || []).map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : section
      ),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await roleChecklistAPI.save(effectiveRole, selectedDate, {
        checklist_data: checklist,
        notes,
      });
      toast.success('Checklist berhasil disimpan!');
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Gagal menyimpan checklist');
    } finally {
      setSaving(false);
    }
  };

  const calculateProgress = () => {
    let total = 0;
    let checked = 0;
    (checklist.sections || []).forEach((section) => {
      (section.items || []).forEach((item) => {
        total++;
        if (item.checked) checked++;
      });
    });
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  };

  const roleTitle =
    effectiveRole === 'dapur'
      ? 'Checklist Dapur'
      : effectiveRole === 'kurir'
      ? 'Checklist Kurir / Pengiriman'
      : `Checklist ${effectiveRole}`;

  return (
    <DashboardLayout role={effectiveRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-purple-700" />
              {roleTitle}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Checklist tugas harian untuk tim {effectiveRole}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress Checklist Hari Ini
            </span>
            <span className="text-sm font-bold text-purple-700">
              {calculateProgress()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-700 h-3 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Checklist Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6 space-y-6">
            {(checklist.sections || []).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Belum ada daftar item checklist. Hubungi Operasional/Admin untuk mengatur template checklist.
              </p>
            ) : (
              (checklist.sections || []).map((section) => (
                <div key={section.id} className="border-b pb-6 last:border-b-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {(section.items || []).map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.checked)}
                          onChange={() => handleToggleItem(section.id, item.id)}
                          className="mt-1 w-5 h-5 text-purple-700 rounded focus:ring-purple-500"
                        />
                        <span
                          className={`flex-1 text-sm ${
                            item.checked
                              ? 'line-through text-gray-500'
                              : 'text-gray-900'
                          }`}
                        >
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Notes */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Tambahkan catatan operasional atau kendala hari ini..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 transition font-medium disabled:bg-gray-400 text-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Checklist'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RoleDailyChecklist;

