"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Download, RefreshCw, Calendar, User, History } from "lucide-react";
import { exportToCSV } from "@/lib/export";

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs?limit=100");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#26332F] tracking-tight">
            Statutory Audit Trail
          </h2>
          <p className="text-sm text-[#68756F] mt-0.5">
            Immutable audit trail and statutory compliance security log
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E9E3] bg-white px-3.5 py-2.5 text-xs font-bold text-[#26332F] hover:bg-[#F7F8F5] shadow-xs transition"
          >
            <RefreshCw className="h-4 w-4 text-[#68756F]" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => exportToCSV("Society_Audit_Trail", logs)}
            className="flex items-center gap-1.5 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8E9B95] font-semibold text-sm">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8E9B95] font-semibold text-sm">
                    No audit records generated yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F8F5] transition">
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F] font-medium text-xs">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold border ${
                          log.action.includes("REVERSE")
                            ? "bg-[#FDF2F2] text-[#B93838] border-[#F7D2D2]"
                            : log.action.includes("CREATE")
                            ? "bg-[#F0F6F3] text-[#245B52] border-[#C8E5D5]"
                            : log.action.includes("LOGIN")
                            ? "bg-[#EBF5F0] text-[#246944] border-[#C8E5D5]"
                            : "bg-[#F7F8F5] text-[#26332F] border-[#E5E9E3]"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#26332F]">{log.entityType}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#68756F]">
                      {log.entityId ? `${log.entityId.slice(0, 14)}...` : "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.performedBy ? (
                        <div>
                          <div className="font-bold text-[#26332F] text-xs">{log.performedBy.fullName}</div>
                          <div className="text-[10px] text-[#68756F]">{log.performedBy.role}</div>
                        </div>
                      ) : (
                        <span className="text-[#8E9B95] font-semibold text-xs">System</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm truncate text-[#68756F] font-mono text-xs" title={log.details}>
                      {log.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
