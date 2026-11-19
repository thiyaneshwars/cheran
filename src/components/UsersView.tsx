"use client";

import React, { useState, useEffect } from "react";
import { Plus, Mail, Phone } from "lucide-react";

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "ACCOUNTANT",
    phone: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      alert("User account created successfully!");
      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const roleNameMap: Record<string, { en: string; color: string }> = {
    ADMIN: { en: "Secretary (Admin)", color: "bg-[#F0F6F3] text-[#245B52] border-[#C8E5D5]" },
    ACCOUNTANT: { en: "Head Accountant", color: "bg-[#EBF5F0] text-[#246944] border-[#C8E5D5]" },
    DATA_ENTRY: { en: "Entry Operator", color: "bg-[#FEF8EC] text-[#975A16] border-[#F7E4BE]" },
    AUDITOR: { en: "Statutory Auditor", color: "bg-[#F7F8F5] text-[#26332F] border-[#E5E9E3]" },
    MANAGEMENT: { en: "Board Member", color: "bg-[#DCEAE2]/60 text-[#245B52] border-[#C6DDD1]" },
    PRODUCTION: { en: "Production Manager", color: "bg-[#F6EFEA] text-[#844C1D] border-[#E8D4C4]" },
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#26332F] tracking-tight">
            User Management & Access Roles
          </h2>
          <p className="text-sm text-[#68756F] mt-0.5">
            Authorized personnel and access controls
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add User Account</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#8E9B95] font-semibold text-sm">
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#8E9B95] font-semibold text-sm">
            No user accounts found.
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-[#E5E9E3] bg-white p-5 shadow-xs hover:border-[#C6DDD1] transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold border ${
                      roleNameMap[u.role]?.color || "bg-[#F7F8F5] text-[#26332F] border-[#E5E9E3]"
                    }`}
                  >
                    {roleNameMap[u.role]?.en || u.role}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-[#246944] font-bold bg-[#EBF5F0] px-2.5 py-1 rounded-full border border-[#C8E5D5]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#246944]" />
                  Active
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-[#26332F] text-base">{u.fullName}</h3>
                <p className="text-xs text-[#68756F] font-medium flex items-center gap-1.5 mt-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#8E9B95] shrink-0" />
                  <span>{u.email}</span>
                </p>
                {u.phone && (
                  <p className="text-xs text-[#68756F] font-medium flex items-center gap-1.5 mt-1">
                    <Phone className="h-3.5 w-3.5 text-[#8E9B95] shrink-0" />
                    <span>{u.phone}</span>
                  </p>
                )}
              </div>

              <div className="text-xs text-[#8E9B95] pt-3 border-t border-[#E5E9E3] flex items-center justify-between">
                <span>Joined:</span>
                <span className="font-bold text-[#26332F]">
                  {new Date(u.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-[#E5E9E3]">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-base font-bold text-[#26332F]">
                  Add Authorized User
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Create a new authorized login credential
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-[#68756F] hover:bg-[#F7F8F5] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-[#F7F8F5] focus:bg-white focus:border-[#245B52] outline-none"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-[#F7F8F5] focus:bg-white focus:border-[#245B52] outline-none"
                  placeholder="user@cheran.coop"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-[#F7F8F5] focus:bg-white focus:border-[#245B52] outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Role & Authority
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white focus:border-[#245B52] outline-none"
                >
                  <option value="ACCOUNTANT">Head Accountant</option>
                  <option value="PRODUCTION">Production Manager</option>
                  <option value="DATA_ENTRY">Entry Operator</option>
                  <option value="AUDITOR">Statutory Auditor</option>
                  <option value="MANAGEMENT">Board Member</option>
                  <option value="ADMIN">Secretary / Admin</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Mobile Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-[#F7F8F5] focus:bg-white focus:border-[#245B52] outline-none"
                  placeholder="10 digit mobile number"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 font-bold text-[#68756F] hover:bg-[#F7F8F5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-5 py-2 font-bold text-white shadow-xs transition"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
