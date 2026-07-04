'use client';
import { useEffect, useState } from 'react';
import { usersAPI, authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Users, UserPlus, Shield, Mail, Phone, Edit, Trash2, Key, Search,
  CheckCircle2, XCircle, Info, Lock, Clock
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: { id: number; name: string; description?: string };
  roleId: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}



export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Add Form States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoleId, setNewRoleId] = useState(0);

  // Edit Form States
  const [editRoleId, setEditRoleId] = useState(0);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        usersAPI.getAll(),
        usersAPI.getRoles()
      ]);
      if (usersRes.data && usersRes.data.length > 0) setUsers(usersRes.data);
      if (rolesRes.data && rolesRes.data.length > 0) {
        setRoles(rolesRes.data);
        const defaultRole = rolesRes.data.find((r: any) => r.name === 'MESS_MANAGER' || r.name === 'Mess Manager');
        if (defaultRole) {
          setNewRoleId(defaultRole.id);
          setEditRoleId(defaultRole.id);
        } else {
          setNewRoleId(rolesRes.data[0].id);
          setEditRoleId(rolesRes.data[0].id);
        }
      }
    } catch (e) {
      console.log('Using offline user catalog cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      const payload = {
        name: newName,
        email: newEmail,
        password: newPassword,
        phone: newPhone,
        roleId: newRoleId
      };
      const res = await authAPI.register(payload);
      if (res.data) {
        setStatusMsg({ type: 'success', text: `User ${newName} registered successfully!` });
        setShowAddModal(false);
        resetAddForm();
        fetchUsersAndRoles();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to register user.' });
    }
  };

  const resetAddForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewPhone('');
    const defaultRole = roles.find((r: any) => r.name === 'MESS_MANAGER' || r.name === 'Mess Manager');
    setNewRoleId(defaultRole?.id || roles[0]?.id || 0);
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setEditRoleId(user.roleId);
    setShowEditModal(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await usersAPI.update(selectedUser.id, { roleId: editRoleId });
      if (res.data) {
        setStatusMsg({ type: 'success', text: `User role updated successfully!` });
        setShowEditModal(false);
        fetchUsersAndRoles();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update user role.' });
    }
  };

  const handleDeactivate = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to deactivate ${name}?`)) {
      try {
        await usersAPI.deactivate(id);
        setStatusMsg({ type: 'success', text: `User ${name} deactivated.` });
        fetchUsersAndRoles();
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to deactivate user.' });
      }
    }
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowEditModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role.name === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/95 transition-all w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {statusMsg && (
        <div className={cn(
          'p-3 rounded-lg flex items-center gap-2 text-xs border animate-in',
          statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
        )}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground text-base mb-1">Active Accounts Catalog</h3>
        <p className="text-xs text-muted-foreground mb-4">List of registered staff members and roles</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/35" />
            <p className="text-sm text-muted-foreground">No users found matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 font-semibold">Staff Member</th>
                  <th className="py-2.5 font-semibold">Assigned Role</th>
                  <th className="py-2.5 font-semibold">Contact Info</th>
                  <th className="py-2.5 font-semibold">Last login</th>
                  <th className="py-2.5 font-semibold text-center">Status</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <p className="text-sm font-bold text-foreground">{u.name}</p>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{u.email}</span>
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 w-fit uppercase tracking-wider',
                          u.role.name === 'Super Admin' && 'bg-red-500/10 text-red-400 border-red-500/20',
                          u.role.name === 'Mess Manager' && 'bg-[hsl(28,95%,15%)] text-[hsl(28,95%,55%)] border-[hsl(28,95%,20%)]',
                          u.role.name === 'Storekeeper' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          u.role.name === 'Kitchen Staff' && 'bg-green-500/10 text-green-400 border-green-500/20',
                          u.role.name === 'Accountant' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                          u.role.name === 'Management Viewer' && 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        )}>
                          <Shield className="w-3 h-3" />
                          {u.role.name}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {u.email}</p>
                        {u.phone && <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {u.phone}</p>}
                      </td>
                      <td className="py-3 text-muted-foreground flex items-center gap-1.5 mt-3.5">
                        <Clock className="w-3 h-3" />
                        {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never logged in'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-500'
                        )}>
                          Active
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-border"
                            title="Edit Role"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeactivate(u.id, u.name)}
                              className="p-1.5 rounded bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all border border-border"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
        >
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close add user dialog"
            >
              <XCircle className="w-4 h-4" />
            </button>
            <h3 id="add-user-title" className="text-base font-bold text-foreground mb-1">Add Staff Member</h3>
            <p className="text-xs text-muted-foreground mb-4">Register a new login account with specific ERP roles</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Kumar"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. anand@jkkm.edu.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">User Role Mapping</label>
                <select
                  value={newRoleId}
                  onChange={e => setNewRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-semibold transition-all"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-role-title"
        >
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close edit role dialog"
            >
              <XCircle className="w-4 h-4" />
            </button>
            <h3 id="edit-role-title" className="text-base font-bold text-foreground mb-1">Edit User Role</h3>
            <p className="text-xs text-muted-foreground mb-4">Modify permissions for <span className="font-bold text-foreground">{selectedUser.name}</span></p>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Role</label>
                <select
                  value={editRoleId}
                  onChange={e => setEditRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
