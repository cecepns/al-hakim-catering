import { useEffect, useState } from 'react';
import { voucherAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '0',
    max_discount: '0',
    quota: '',
    valid_from: '',
    valid_until: '',
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const response = await voucherAPI.getAll();
      setVouchers(response.data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await voucherAPI.update(editId, formData);
        alert('Voucher berhasil diupdate');
      } else {
        await voucherAPI.create(formData);
        alert('Voucher berhasil ditambahkan');
      }
      setModal(false);
      resetForm();
      fetchVouchers();
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Gagal menyimpan voucher');
    }
  };

  const handleEdit = (voucher) => {
    setEditId(voucher.id);
    setFormData({
      code: voucher.code,
      name: voucher.name,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_purchase: voucher.min_purchase,
      max_discount: voucher.max_discount,
      quota: voucher.quota,
      valid_from: voucher.valid_from.split(' ')[0],
      valid_until: voucher.valid_until.split(' ')[0],
    });
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus voucher ini?')) return;
    try {
      await voucherAPI.delete(id);
      alert('Voucher berhasil dihapus');
      fetchVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Gagal menghapus voucher');
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      code: '',
      name: '',
      discount_type: 'percentage',
      discount_value: '',
      min_purchase: '0',
      max_discount: '0',
      quota: '',
      valid_from: '',
      valid_until: '',
    });
  };

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Voucher</h1>
            <p className="text-gray-600 mt-1">Kelola voucher dan promo</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Tambah Voucher
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Belum ada voucher</p>
              <button
                onClick={() => {
                  resetForm();
                  setModal(true);
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Tambah Voucher Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Diskon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Min. Pembelian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kuota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Masa Berlaku
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="px-3 py-1 bg-gray-100 text-primary-600 rounded font-mono text-sm font-semibold">
                          {voucher.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voucher.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voucher.discount_type === 'percentage'
                          ? `${voucher.discount_value}%`
                          : `Rp ${formatRupiah(voucher.discount_value)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {formatRupiah(voucher.min_purchase)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voucher.used_count} / {voucher.quota}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(voucher.valid_from).toLocaleDateString('id-ID')} -{' '}
                        {new Date(voucher.valid_until).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editId ? 'Edit Voucher' : 'Tambah Voucher'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kode Voucher *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="WELCOME10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Voucher *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe Diskon *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_type: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="percentage">Persentase</option>
                      <option value="fixed">Nominal Tetap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nilai Diskon *
                    </label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_value: e.target.value })
                      }
                      required
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min. Pembelian (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.min_purchase}
                      onChange={(e) =>
                        setFormData({ ...formData, min_purchase: e.target.value })
                      }
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max. Diskon (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.max_discount}
                      onChange={(e) =>
                        setFormData({ ...formData, max_discount: e.target.value })
                      }
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kuota *
                  </label>
                  <input
                    type="number"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Berlaku Dari *
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) =>
                        setFormData({ ...formData, valid_from: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Berlaku Hingga *
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) =>
                        setFormData({ ...formData, valid_until: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {editId ? 'Update' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminVouchers;
