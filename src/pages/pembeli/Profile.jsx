import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { authAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authAPI.updateProfile(formData);
      toast.success('Profile berhasil diupdate');
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Gagal mengupdate profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="pembeli">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon *</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400">
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
