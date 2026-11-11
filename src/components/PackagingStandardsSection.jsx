import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { PackageCheck, Edit3, Save, X, Settings } from 'lucide-react';
import { packagingStandardsAPI } from '../utils/api';

const CATEGORY_LABELS = {
  catering: 'Catering',
  aqiqah: 'Aqiqah',
  event: 'Event',
  store: 'Store',
};

const PackagingStandardsSection = ({ order, canEdit = false }) => {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [manageAllOpen, setManageAllOpen] = useState(false);

  const fetchStandards = async () => {
    try {
      setLoading(true);
      const res = await packagingStandardsAPI.getAll();
      setStandards(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching packaging standards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandards();
  }, []);

  const orderCategories = useMemo(() => {
    const set = new Set();
    if (Array.isArray(order?.items)) {
      order.items.forEach((item) => {
        if (item.product_category) {
          set.add(String(item.product_category).toLowerCase().trim());
        }
      });
    }
    if (set.size === 0 && order?.categories) {
      String(order.categories)
        .split(',')
        .map((c) => c.toLowerCase().trim())
        .filter(Boolean)
        .forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [order]);

  const displayedStandards = useMemo(() => {
    if (orderCategories.length === 0) {
      return [];
    }
    const map = new Map(standards.map((s) => [String(s.category).toLowerCase().trim(), s]));
    return orderCategories.map((cat) => {
      if (map.has(cat)) return map.get(cat);
      const label = CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
      return {
        category: cat,
        title: `Standar Pengemasan ${label}`,
        content: 'Belum ada ketentuan standar pengemasan untuk kategori ini.',
      };
    });
  }, [standards, orderCategories]);

  const startEdit = (std) => {
    setEditingCategory(std.category);
    setEditTitle(std.title || `Standar Pengemasan ${CATEGORY_LABELS[std.category] || std.category}`);
    setEditContent(std.content || '');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSave = async (category) => {
    if (!editContent.trim()) {
      toast.error('Catatan standar pengemasan wajib diisi');
      return;
    }
    try {
      setSaving(true);
      await packagingStandardsAPI.update(category, {
        title: editTitle.trim() || `Standar Pengemasan ${CATEGORY_LABELS[category] || category}`,
        content: editContent,
      });
      toast.success(`Standar pengemasan ${CATEGORY_LABELS[category] || category} berhasil disimpan`);
      cancelEdit();
      await fetchStandards();
    } catch (error) {
      console.error('Error saving packaging standard:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan standar pengemasan');
    } finally {
      setSaving(false);
    }
  };

  const renderStandardCard = (std) => {
    const isEditing = editingCategory === std.category;
    const label = CATEGORY_LABELS[std.category] || std.category;

    return (
      <div
        key={std.category}
        className="border border-purple-200 bg-purple-50/40 rounded-lg p-4 space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 uppercase">
              {label}
            </span>
            {!isEditing && (
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                {std.title}
              </h3>
            )}
          </div>
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={() => startEdit(std)}
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 bg-white border border-purple-200 px-2.5 py-1 rounded-md shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Judul Standar ({label})
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ketentuan Standar Pengemasan
              </label>
              <textarea
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Tulis ketentuan pengemasan..."
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5" /> Batal
              </button>
              <button
                type="button"
                onClick={() => handleSave(std.category)}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {std.content}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-purple-700" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Standar Pengemasan</h2>
            <p className="text-xs text-gray-500">
              Ketentuan otomatis sesuai kategori produk pada pesanan ini
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setManageAllOpen(!manageAllOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
          >
            <Settings className="w-3.5 h-3.5" />
            {manageAllOpen ? 'Tutup Kelola Semua Kategori' : 'Kelola Semua Kategori'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-sm text-gray-500">Memuat standar pengemasan...</div>
      ) : manageAllOpen && canEdit ? (
        <div className="space-y-3">
          {standards.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data standar pengemasan.</p>
          ) : (
            standards.map(renderStandardCard)
          )}
        </div>
      ) : displayedStandards.length === 0 ? (
        <p className="text-sm text-gray-500">
          Kategori produk belum terdeteksi pada pesanan ini.
        </p>
      ) : (
        <div className="space-y-3">
          {displayedStandards.map(renderStandardCard)}
        </div>
      )}
    </div>
  );
};

export default PackagingStandardsSection;

