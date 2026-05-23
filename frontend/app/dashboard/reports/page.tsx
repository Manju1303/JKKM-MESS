'use client';
import { useEffect, useState } from 'react';
import { reportsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { FileBarChart, Download, FileText, Calendar, Plus, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportRecord {
  id: number;
  type: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  fileUrl: string;
  format: string;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [reportType, setReportType] = useState('DAILY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.getAll();
      setReports(res.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      let res;
      if (reportType === 'DAILY') {
        res = await reportsAPI.generateDaily(selectedDate);
      } else if (reportType === 'MONTHLY') {
        res = await reportsAPI.generateMonthly(Number(selectedYear), Number(selectedMonth));
      } else {
        res = await reportsAPI.generateInventoryValuation();
      }

      setSuccess(`Report "${res.data.title}" generated successfully.`);
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report. Please verify backend state.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header Info */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <FileBarChart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Reports & Excel Export</h2>
            <p className="text-xs text-muted-foreground">
              Generate daily kitchen consumption logs, monthly purchase summary tables, or active inventory valuation sheets.
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Refresh reports list"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Generator Form */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Generate New Report
          </h3>

          <form onSubmit={handleGenerateReport} className="space-y-3.5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-lg">
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DAILY">Daily Issues & Wastage</option>
                <option value="MONTHLY">Monthly Expenses Summary</option>
                <option value="INVENTORY">Inventory Valuation Sheet</option>
              </select>
            </div>

            {reportType === 'DAILY' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            )}

            {reportType === 'MONTHLY' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>
                        {new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {reportType === 'INVENTORY' && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-start gap-2 border border-border/50">
                <Database className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  Generates a full sheet of all active stock levels, batch details, Unit Costs, and overall valuation in INR.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {generating && <RefreshCw className="w-4 h-4 animate-spin" />}
              {generating ? 'Generating...' : 'Export to Excel (.xlsx)'}
            </button>
          </form>
        </div>

        {/* Reports History */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 overflow-hidden">
          <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Report Export Logs
          </h3>

          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No generated reports found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                    <th className="pb-3">Report Name</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Generated Date</th>
                    <th className="pb-3">Format</th>
                    <th className="pb-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((report) => (
                    <tr key={report.id} className="text-sm hover:bg-muted/50 transition-colors">
                      <td className="py-3.5 font-medium text-foreground">{report.title}</td>
                      <td className="py-3.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          report.type === 'DAILY' && 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                          report.type === 'MONTHLY' && 'bg-green-500/15 text-green-400 border-green-500/30',
                          report.type === 'CUSTOM' && 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        )}>
                          {report.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">{formatDate(report.createdAt)}</td>
                      <td className="py-3.5 text-xs font-mono">{report.format}</td>
                      <td className="py-3.5 text-right">
                        <a
                          href={`${API_URL}${report.fileUrl}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-muted hover:bg-primary hover:text-white rounded border border-border text-foreground transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
