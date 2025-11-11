import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { X, Plus } from 'lucide-react';
import { productAPI } from '../../utils/api';
import { getImageUrl } from '../../utils/imageHelper';
import DashboardLayout from '../../components/DashboardLayout';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, images, variations, addons

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'catering',
    price: '',
    discount_percentage: '0',
    is_promo: false,
    stock: '',
  });

  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  const [variations, setVariations] = useState([]);
  const [newVariationForm, setNewVariationForm] = useState({
    name: '',
    price_adjustment: '0',
    stock: '',
    description: '',
  });

  const [addons, setAddons] = useState([]);
  const [newAddonForm, setNewAddonForm] = useState({
    name: '',
    description: '',
    price: '',
    max_quantity: '0',
  });

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getById(id);
      const product = response.data;
      
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        discount_percentage: product.discount_percentage || 0,
        is_promo: product.is_promo,
        stock: product.stock,
      });

      // Fetch images, variations, and addons
      const [imagesRes, variationsRes, addonsRes] = await Promise.all([
        productAPI.getImages(id),
        productAPI.getVariations(id),
        productAPI.getAddons(id),
      ]);

      setImages(imagesRes.data || []);
      setVariations(variationsRes.data || []);
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    }
  }, [isEdit, fetchProduct]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setNewImages((prev) => [...prev, ...files]);
  };

  // ==================== BASIC INFO SECTION ====================
  const handleSubmitBasicInfo = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('price', formData.price);
      submitData.append('discount_percentage', formData.discount_percentage);
      submitData.append('is_promo', formData.is_promo);
      submitData.append('stock', formData.stock);

      if (isEdit) {
        await productAPI.update(id, submitData);
        toast.success('Informasi produk berhasil diupdate');
      } else {
        const response = await productAPI.create(submitData);
        navigate(`/admin/products/${response.data.id}/edit`, { replace: true });
        toast.success('Produk berhasil dibuat');
        return;
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  };

  // ==================== IMAGES SECTION ====================
  const handleUploadImages = async () => {
    if (newImages.length === 0) {
      toast.warning('Pilih gambar terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      newImages.forEach((file) => {
        formData.append('images', file);
      });

      await productAPI.uploadImages(id, formData);
      toast.success('Gambar berhasil ditambahkan');
      setNewImages([]);
      fetchProduct();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Gagal mengunggah gambar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Hapus gambar ini?')) return;
    
    try {
      setLoading(true);
      await productAPI.deleteImage(id, imageId);
      toast.success('Gambar berhasil dihapus');
      fetchProduct();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Gagal menghapus gambar');
    } finally {
      setLoading(false);
    }
  };

  // ==================== VARIATIONS SECTION ====================
  const handleAddVariation = async (e) => {
    e.preventDefault();
    if (!newVariationForm.name || !newVariationForm.price_adjustment) {
      toast.warning('Isi nama dan harga variasi');
      return;
    }

    try {
      setLoading(true);
      await productAPI.addVariation(id, {
        name: newVariationForm.name,
        price_adjustment: parseFloat(newVariationForm.price_adjustment),
        stock: parseInt(newVariationForm.stock) || 0,
        description: newVariationForm.description,
      });
      toast.success('Variasi berhasil ditambahkan');
      setNewVariationForm({ name: '', price_adjustment: '0', stock: '', description: '' });
      fetchProduct();
    } catch (error) {
      console.error('Error adding variation:', error);
      toast.error('Gagal menambah variasi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariation = async (variantId) => {
    if (!window.confirm('Hapus variasi ini?')) return;

    try {
      setLoading(true);
      await productAPI.deleteVariation(id, variantId);
      toast.success('Variasi berhasil dihapus');
      fetchProduct();
    } catch (error) {
      console.error('Error deleting variation:', error);
      toast.error('Gagal menghapus variasi');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ADD-ONS SECTION ====================
  const handleAddAddon = async (e) => {
    e.preventDefault();
    if (!newAddonForm.name || !newAddonForm.price) {
      toast.warning('Isi nama dan harga add-on');
      return;
    }

    try {
      setLoading(true);
      await productAPI.addAddon(id, {
        name: newAddonForm.name,
        description: newAddonForm.description,
        price: parseFloat(newAddonForm.price),
        max_quantity: parseInt(newAddonForm.max_quantity) || 0,
      });
      toast.success('Add-on berhasil ditambahkan');
      setNewAddonForm({ name: '', description: '', price: '', max_quantity: '0' });
      fetchProduct();
    } catch (error) {
      console.error('Error adding addon:', error);
      toast.error('Gagal menambah add-on');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddon = async (addonId) => {
    if (!window.confirm('Hapus add-on ini?')) return;

    try {
      setLoading(true);
      await productAPI.deleteAddon(id, addonId);
      toast.success('Add-on berhasil dihapus');
      fetchProduct();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error('Gagal menghapus add-on');
    } finally {
      setLoading(false);
    }
  };

  if (!isEdit && activeTab !== 'basic') {
    return (
      <DashboardLayout role="admin">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Simpan produk terlebih dahulu sebelum menambah gambar, variasi, atau add-on</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Perbarui informasi produk' : 'Lengkapi form di bawah untuk menambah produk'}
          </p>
        </div>

        {/* TABS */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b">
            {['basic', 'images', 'variations', 'addons'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={!isEdit && tab !== 'basic'}
                className={`flex-1 px-4 py-3 font-medium text-sm transition ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {tab === 'basic' && 'Informasi Dasar'}
                {tab === 'images' && 'Gambar'}
                {tab === 'variations' && 'Variasi'}
                {tab === 'addons' && 'Add-on'}
              </button>
            ))}
            </div>

          {/* TAB CONTENT */}
          <div className="p-6">
            {/* BASIC INFO TAB */}
            {activeTab === 'basic' && (
              <form onSubmit={handleSubmitBasicInfo} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Produk *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Contoh: Paket Nasi Box Premium"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Jelaskan produk secara detail..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="catering">Catering</option>
                <option value="aqiqah">Aqiqah</option>
                <option value="event">Event</option>
                <option value="store">Store</option>
              </select>
            </div>

            {/* Price & Discount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diskon (%)
                </label>
                <input
                  type="number"
                  name="discount_percentage"
                  value={formData.discount_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stok *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="100"
              />
            </div>

            {/* Is Promo */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_promo"
                checked={formData.is_promo}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Tandai sebagai produk recommended
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
              >
                    {loading ? 'Menyimpan...' : isEdit ? 'Update' : 'Buat Produk'}
                  </button>
                </div>
              </form>
            )}

            {/* IMAGES TAB */}
            {activeTab === 'images' && (
              <div className="space-y-6">
                {/* Upload New Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tambah Gambar Produk
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer text-center">
                      <p className="text-gray-600">Klik atau drag gambar ke sini</p>
                      <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WebP (maks 5MB)</p>
                    </label>
                  </div>

                  {newImages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Gambar Baru:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {newImages.map((file, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New ${idx}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setNewImages(newImages.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUploadImages}
                      disabled={loading}
                      className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
                    >
                      {loading ? 'Mengunggah...' : 'Upload Gambar'}
                    </button>
                  )}
                </div>

                {/* Existing Images */}
                {images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Gambar Produk:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={getImageUrl(image.media_url)}
                            alt="Product"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.id)}
                            disabled={loading}
                            className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center"
                          >
                            <X size={24} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VARIATIONS TAB */}
            {activeTab === 'variations' && (
              <div className="space-y-6">
                {/* Add New Variation Form */}
                <form onSubmit={handleAddVariation} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4">Tambah Variasi</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nama variasi (mis: Ukuran M)"
                      value={newVariationForm.name}
                      onChange={(e) => setNewVariationForm({ ...newVariationForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Penyesuaian harga (Rp)"
                      value={newVariationForm.price_adjustment}
                      onChange={(e) => setNewVariationForm({ ...newVariationForm, price_adjustment: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Stok variasi"
                      value={newVariationForm.stock}
                      onChange={(e) => setNewVariationForm({ ...newVariationForm, stock: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      placeholder="Deskripsi variasi (opsional)"
                      value={newVariationForm.description}
                      onChange={(e) => setNewVariationForm({ ...newVariationForm, description: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
                    >
                      <Plus size={18} className="inline mr-2" />
                      Tambah Variasi
                    </button>
                  </div>
                </form>

                {/* List of Variations */}
                {variations.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Variasi Produk</h3>
                    <div className="space-y-3">
                      {variations.map((variation) => (
                        <div key={variation.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{variation.name}</p>
                            <p className="text-sm text-gray-600">
                              Harga: +Rp {variation.price_adjustment.toLocaleString('id-ID')} | Stok: {variation.stock}
                            </p>
                            {variation.description && (
                              <p className="text-sm text-gray-500">{variation.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteVariation(variation.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADD-ONS TAB */}
            {activeTab === 'addons' && (
              <div className="space-y-6">
                {/* Add New Addon Form */}
                <form onSubmit={handleAddAddon} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4">Tambah Add-on</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nama add-on (mis: Es Teh Manis)"
                      value={newAddonForm.name}
                      onChange={(e) => setNewAddonForm({ ...newAddonForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Harga (Rp)"
                      value={newAddonForm.price}
                      onChange={(e) => setNewAddonForm({ ...newAddonForm, price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Jumlah maksimal (0 = unlimited)"
                      value={newAddonForm.max_quantity}
                      onChange={(e) => setNewAddonForm({ ...newAddonForm, max_quantity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      placeholder="Deskripsi add-on (opsional)"
                      value={newAddonForm.description}
                      onChange={(e) => setNewAddonForm({ ...newAddonForm, description: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
                    >
                      <Plus size={18} className="inline mr-2" />
                      Tambah Add-on
                    </button>
                  </div>
                </form>

                {/* List of Addons */}
                {addons.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Daftar Add-on</h3>
                    <div className="space-y-3">
                      {addons.map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{addon.name}</p>
                            <p className="text-sm text-gray-600">
                              Harga: Rp {addon.price.toLocaleString('id-ID')} {addon.max_quantity > 0 && `| Max: ${addon.max_quantity}`}
                            </p>
                            {addon.description && (
                              <p className="text-sm text-gray-500">{addon.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAddon(addon.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <X size={20} />
              </button>
            </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProductForm;
