import { useEffect, useState } from 'react';
import { userAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Yakin ingin mengubah role user ini menjadi ${newRole}?`)) return;
    try {
      await userAPI.updateRole(userId, newRole);
      alert('Role berhasil diupdate');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Gagal mengupdate role');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      pembeli: 'bg-blue-100 text-blue-800',
      marketing: 'bg-green-100 text-green-800',
      operasional: 'bg-purple-100 text-purple-800',
      dapur: 'bg-yellow-100 text-yellow-800',
      kurir: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredUsers = filter === 'all' ? users : users.filter((u) => u.role === filter);

  const roles = [
    { value: 'all', label: 'Semua' },
    { value: 'pembeli', label: 'Pembeli' },
    { value: 'admin', label: 'Admin' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operasional', label: 'Operasional' },
    { value: 'dapur', label: 'Dapur' },
    { value: 'kurir', label: 'Kurir' },
  ];

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-gray-600 mt-1">Kelola pengguna dan role sistem</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2 overflow-x-auto">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setFilter(role.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    filter === role.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Tidak ada pengguna</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Telepon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Saldo Cashback
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bergabung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {formatRupiah(user.cashback_balance || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="pembeli">Pembeli</option>
                          <option value="admin">Admin</option>
                          <option value="marketing">Marketing</option>
                          <option value="operasional">Operasional</option>
                          <option value="dapur">Dapur</option>
                          <option value="kurir">Kurir</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
