'use client';
import { useEffect, useState, useCallback } from 'react';
import { usersAPI, authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Users, UserPlus, Shield, Mail, Phone, Edit3, Trash2, Search,
  CheckCircle2, XCircle, Lock, Clock, LayoutGrid, LayoutList,
  ChefHat, Boxes, Building2, GraduationCap, DollarSign, UserCheck, X
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

const getRoleConfig = (roleName: string) => {
  const normalized = roleName.toUpperCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'SUPER_ADMIN':
    case 'SUPER ADMIN':
      return {
        label: 'Super Admin',
        badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        avatarBg: 'from-purple-600 to-indigo-600',
        icon: Shield,
      };
    case 'MESS_MANAGER':
    case 'MESS MANAGER':
      return {
        label: 'Mess Manager',
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        avatarBg: 'from-blue-600 to-cyan-600',
        icon: UserCheck,
      };
    case 'HOSTEL_WARDEN':
    case 'HOSTEL WARDEN':
      return {
        label: 'Hostel Warden',
        badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        avatarBg: 'from-indigo-600 to-violet-600',
        icon: Building2,
      };
    case 'STOREKEEPER':
    case 'STORE_KEEPER':
    case 'STORE KEEPER':
      return {
        label: 'Storekeeper',
        badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        avatarBg: 'from-cyan-600 to-teal-600',
        icon: Boxes,
      };
    case 'KITCHEN_STAFF':
    case 'KITCHEN STAFF':
      return {
        label: 'Kitchen Staff',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        avatarBg: 'from-amber-600 to-orange-600',
        icon: ChefHat,
      };
    case 'ACCOUNTANT':
      return {
        label: 'Accountant',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        avatarBg: 'from-emerald-600 to-green-600',
        icon: DollarSign,
      };
    case 'STUDENT_VIEWER':
    case 'STUDENT VIEWER':
    case 'STUDENT':
      return {
        label: 'Student Viewer',
        badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        avatarBg: 'from-slate-600 to-zinc-600',
        icon: GraduationCap,
      };
    default:
      return {
        label: roleName,
        badge: 'bg-muted text-muted-foreground border-border',
        avatarBg: 'from-primary to-primary/80',
        icon: Shield,
      };
  }
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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

  const fetchUsersAndRoles = useCallback(async () => {
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
    } catch {
      console.log('Using offline user catalog cache');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

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
        setStatusMsg({ type: 'success', text: `User "${newName}" registered successfully!` });
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
        setStatusMsg({ type: 'success', text: `Role for ${selectedUser.name} updated successfully!` });
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

  // Calculate summary counts
  const adminCount = users.filter(u => ['SUPER_ADMIN', 'MESS_MANAGER', 'Super Admin', 'Mess Manager'].includes(u.role.name)).length;
  const operationalCount = users.filter(u => ['STOREKEEPER', 'STORE_KEEPER', 'KITCHEN_STAFF', 'Kitchen Staff', 'Storekeeper'].includes(u.role.name)).length;
  const viewerCount = users.filter(u => ['STUDENT_VIEWER', 'HOSTEL_WARDEN', 'Student Viewer', 'Hostel Warden'].includes(u.role.name)).length;

  return (
    <div className="space-y-6 animate-in">
      {/* ── Summary Stats Section ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-foreground leading-none">{users.length}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 truncate">Total Registered Accounts</p>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active Catalog
            </span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-foreground leading-none">{adminCount}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 truncate">Admins & Managers</p>
            <span className="text-[10px] text-purple-400 font-medium">Full System Controls</span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-foreground leading-none">{operationalCount}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 truncate">Store & Kitchen Staff</p>
            <span className="text-[10px] text-amber-400 font-medium">Inventory Operations</span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-foreground leading-none">{viewerCount}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 truncate">Wardens & Students</p>
            <span className="text-[10px] text-indigo-400 font-medium">Headcount & Complaints</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by staff name or email address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="ALL">All Roles ({users.length})</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {/* View mode switcher */}
          <div className="flex items-center bg-muted border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md text-xs transition-all flex items-center gap-1',
                viewMode === 'table' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md text-xs transition-all flex items-center gap-1',
                viewMode === 'grid' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMsg && (
        <div className={cn(
          'p-3 rounded-lg flex items-center gap-2 text-xs border animate-in shadow-xs',
          statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
        )}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Users Display Section ────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground text-base leading-none">Active Accounts Catalog</h3>
            <p className="text-xs text-muted-foreground mt-1">Institutional staff members, contact details, and role permissions</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
            Showing {filteredUsers.length} of {users.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-xl bg-muted/20">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <h4 className="text-sm font-bold text-foreground">No accounts found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">No registered staff members match your search criteria or role filter.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ── Table View Layout ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 font-bold">Staff Member</th>
                  <th className="py-3 px-3 font-bold">Assigned Role</th>
                  <th className="py-3 px-3 font-bold">Contact Info</th>
                  <th className="py-3 px-3 font-bold">Last Login</th>
                  <th className="py-3 px-3 font-bold text-center">Status</th>
                  <th className="py-3 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const config = getRoleConfig(u.role.name);
                  const RoleIcon = config.icon;
                  const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                      {/* Member profile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs',
                            config.avatarBg
                          )}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-extrabold uppercase">You</span>
                              )}
                            </p>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="py-3 px-3">
                        <span className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 shadow-2xs',
                          config.badge
                        )}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-3 text-muted-foreground">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1.5 text-xs text-foreground/80">
                            <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{u.email}</span>
                          </p>
                          {u.phone && (
                            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span>{u.phone}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never logged in'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-border"
                            title="Edit Role Assignment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeactivate(u.id, u.name)}
                              className="p-1.5 rounded-lg bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all border border-border"
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
        ) : (
          /* ── Grid View Layout ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredUsers.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const config = getRoleConfig(u.role.name);
              const RoleIcon = config.icon;
              const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-primary/30 transition-all shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md',
                        config.avatarBg
                      )}>
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
                          {u.name}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-extrabold uppercase">You</span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground block truncate mt-0.5 max-w-[160px]">{u.email}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Role:</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-semibold border inline-flex items-center gap-1',
                        config.badge
                      )}>
                        <RoleIcon className="w-3 h-3" /> {config.label}
                      </span>
                    </div>

                    {u.phone && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Phone:</span>
                        <span className="text-foreground font-medium">{u.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last Login:</span>
                      <span className="text-foreground/80 font-medium text-[11px]">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all text-xs font-semibold flex items-center gap-1.5 border border-border"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Role
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleDeactivate(u.id, u.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all text-xs font-semibold flex items-center gap-1.5 border border-border"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add User Modal Dialog ────────────────────────────────────────────── */}
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
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 id="add-user-title" className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add Staff Member
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Register a new user account with assigned system permissions</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Kumar"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. anand@jkkm.edu.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Initial Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Assign System Role *</label>
                <select
                  value={newRoleId}
                  onChange={e => setNewRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all shadow-md"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal Dialog ───────────────────────────────────────────── */}
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
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 id="edit-role-title" className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" /> Edit User Role
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Modify account access level for <span className="font-bold text-foreground">{selectedUser.name}</span></p>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select Assigned Role</label>
                <select
                  value={editRoleId}
                  onChange={e => setEditRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all shadow-md"
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
