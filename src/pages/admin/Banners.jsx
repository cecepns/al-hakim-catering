import { useEffect, useState } from 'react';
import { bannerAPI } from '../../utils/api';
import { getImageUrl, getImagePath } from '../../utils/imageHelper';
import DashboardLayout from '../../components/DashboardLayout';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    display_order: '0',
    existing_image: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await bannerAPI.getAll();
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('display_order', formData.display_order);
      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (editId && formData.existing_image) {
        submitData.append('existing_image', formData.existing_image);
      }

      if (editId) {
        await bannerAPI.update(editId, submitData);
        alert('Banner berhasil diupdate');
      } else {
        await bannerAPI.create(submitData);
        alert('Banner berhasil ditambahkan');
      }
      setModal(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Gagal menyimpan banner');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus banner ini?')) return;
    try {
      await bannerAPI.delete(id);
      alert('Banner berhasil dihapus');
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Gagal menghapus banner');
    }
  };

  const handleEdit = (banner) => {
    setEditId(banner.id);
    setFormData({
      title: banner.title,
      description: banner.description,
      display_order: banner.display_order.toString(),
      existing_image: getImagePath(banner.image_url),
    });
    setImagePreview(getImageUrl(banner.image_url));
    setModal(true);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ title: '', description: '', display_order: '0', existing_image: null });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Banner</h1>
            <p className="text-gray-600 mt-1">Kelola banner promosi di halaman utama</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Tambah Banner
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Belum ada banner</p>
              <button
                onClick={() => {
                  resetForm();
                  setModal(true);
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Tambah Banner Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((banner) => (
                <div key={banner.id} className="border rounded-xl overflow-hidden hover:shadow-lg transition">
                  <img
                    src={getImageUrl(banner.image_url)}
                    alt={banner.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{banner.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{banner.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Order: {banner.display_order}
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="text-sm text-primary-600 hover:text-primary-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="text-sm text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editId ? 'Edit Banner' : 'Tambah Banner'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gambar Banner *
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editId}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urutan Tampil
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
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

export default AdminBanners;
