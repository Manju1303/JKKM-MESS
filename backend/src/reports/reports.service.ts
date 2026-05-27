import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

/**
 * ReportsService generates Excel reports entirely in-memory using ExcelJS buffers.
 * This avoids writing to Railway's ephemeral filesystem (files lost on redeploy).
 * Each generate* method returns { buffer, filename, report } — the controller
 * streams the buffer directly to the HTTP response using res.end(buffer).
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Generate daily consumption + purchase + wastage report as in-memory Excel buffer */
  async generateDailyReport(date: string, userId: number) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [issues, purchases, wastages] = await Promise.all([
      this.prisma.dailyIssue.findMany({
        where: { issueDate: { gte: targetDate, lt: nextDay } },
        include: { product: true },
      }),
      this.prisma.purchase.findMany({
        where: { purchaseDate: { gte: targetDate, lt: nextDay } },
        include: { supplier: true, items: { include: { product: true } } },
      }),
      this.prisma.wastage.findMany({
        where: { reportedAt: { gte: targetDate, lt: nextDay } },
        include: { product: true },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JKKM Mess ERP';
    workbook.created = new Date();

    // Kitchen Issues sheet
    const issuesSheet = workbook.addWorksheet('Kitchen Issues');
    issuesSheet.columns = [
      { header: 'Product Name', key: 'product' },
      { header: 'Meal Type', key: 'meal' },
      { header: 'Quantity Issued', key: 'quantity' },
      { header: 'Unit of Measure', key: 'unit' },
      { header: 'Staff Notes', key: 'notes' },
    ];
    issues.forEach((i) =>
      issuesSheet.addRow({ product: i.product.name, meal: i.meal, quantity: i.quantity, unit: i.unit, notes: i.notes || '—' }),
    );
    this.applyPremiumStyling(issuesSheet);

    // Purchases sheet
    const purchasesSheet = workbook.addWorksheet('Purchases');
    purchasesSheet.columns = [
      { header: 'PO Number', key: 'po' },
      { header: 'Supplier Name', key: 'supplier' },
      { header: 'Net Amount (₹)', key: 'amount' },
      { header: 'Approval Status', key: 'status' },
    ];
    purchases.forEach((p) =>
      purchasesSheet.addRow({ po: p.purchaseNumber, supplier: p.supplier.name, amount: p.netAmount, status: p.status }),
    );
    this.applyPremiumStyling(purchasesSheet);

    // Wastage sheet
    const wastageSheet = workbook.addWorksheet('Wastage');
    wastageSheet.columns = [
      { header: 'Product Name', key: 'product' },
      { header: 'Quantity Wasted', key: 'quantity' },
      { header: 'Unit of Measure', key: 'unit' },
      { header: 'Reason for Waste', key: 'reason' },
      { header: 'Estimated Loss (₹)', key: 'value' },
    ];
    wastages.forEach((w) =>
      wastageSheet.addRow({ product: w.product.name, quantity: w.quantity, unit: w.unit, reason: w.reason, value: w.valueAmount }),
    );
    this.applyPremiumStyling(wastageSheet);

    // Generate buffer in-memory — no disk writes
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const filename = `daily-report-${date}.xlsx`;

    // Persist metadata record in DB (fileUrl is null — file is generated on-demand)
    const report = await this.prisma.report.create({
      data: {
        type: 'DAILY',
        title: `Daily Report - ${date}`,
        dateFrom: targetDate,
        dateTo: nextDay,
        fileUrl: null, // In-memory generation — no persistent URL
        format: 'EXCEL',
        generatedBy: userId,
      },
    });

    return { buffer, filename, report };
  }

  /** Monthly expense summary report — in-memory buffer */
  async generateMonthlyReport(year: number, month: number, userId: number) {
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59);

    const purchases = await this.prisma.purchase.findMany({
      where: { status: 'APPROVED', purchaseDate: { gte: dateFrom, lte: dateTo } },
      include: { supplier: true, items: { include: { product: true } } },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Monthly Expenses');
    sheet.columns = [
      { header: 'PO Number', key: 'po' },
      { header: 'Purchase Date', key: 'date' },
      { header: 'Supplier Name', key: 'supplier' },
      { header: 'Total Amount (₹)', key: 'total' },
      { header: 'GST Amount (₹)', key: 'gst' },
      { header: 'Net Amount (₹)', key: 'net' },
    ];
    purchases.forEach((p) =>
      sheet.addRow({
        po: p.purchaseNumber,
        date: p.purchaseDate.toLocaleDateString('en-IN'),
        supplier: p.supplier.name,
        total: p.totalAmount,
        gst: p.gstAmount,
        net: p.netAmount,
      }),
    );
    sheet.addRow({
      po: 'TOTAL APPROVED SPEND',
      net: purchases.reduce((s, p) => s + p.netAmount, 0),
    });

    this.applyPremiumStyling(sheet);
    this.applyTotalRowStyling(sheet, 6);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const filename = `monthly-report-${year}-${String(month).padStart(2, '0')}.xlsx`;

    const report = await this.prisma.report.create({
      data: {
        type: 'MONTHLY',
        title: `Monthly Report - ${year}/${month}`,
        dateFrom,
        dateTo,
        fileUrl: null,
        format: 'EXCEL',
        generatedBy: userId,
      },
    });

    return { buffer, filename, report };
  }

  /** Inventory valuation report — in-memory buffer */
  async generateInventoryReport(userId: number) {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Valuation');
    sheet.columns = [
      { header: 'Product Name', key: 'product' },
      { header: 'Category', key: 'category' },
      { header: 'Batch Number', key: 'batch' },
      { header: 'Current Quantity', key: 'qty' },
      { header: 'Unit', key: 'unit' },
      { header: 'Cost/Unit (₹)', key: 'cost' },
      { header: 'Total Value (₹)', key: 'total' },
      { header: 'Expiry Date', key: 'expiry' },
    ];
    inventory.forEach((i) =>
      sheet.addRow({
        product: i.product.name,
        category: i.product.category.name,
        batch: i.batchNumber || 'N/A',
        qty: i.quantity,
        unit: i.unit,
        cost: i.costPerUnit,
        total: Math.round(i.quantity * i.costPerUnit * 100) / 100,
        expiry: i.expiryDate ? i.expiryDate.toLocaleDateString('en-IN') : 'N/A',
      }),
    );

    const totalValuation = inventory.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);
    sheet.addRow({
      product: 'TOTAL PORTFOLIO VALUATION',
      total: Math.round(totalValuation * 100) / 100,
    });

    this.applyPremiumStyling(sheet);
    this.applyTotalRowStyling(sheet, 7);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const filename = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    const report = await this.prisma.report.create({
      data: {
        type: 'CUSTOM',
        title: 'Inventory Valuation Report',
        dateFrom: new Date(),
        dateTo: new Date(),
        fileUrl: null,
        format: 'EXCEL',
        generatedBy: userId,
      },
    });

    return { buffer, filename, report };
  }

  // ── Private Styling Helpers ──────────────────────────────────────────────────

  /** Apply total row accent styling to the last row of a sheet */
  private applyTotalRowStyling(sheet: ExcelJS.Worksheet, netAmountColNum: number) {
    const lastRowIndex = sheet.rowCount;
    const finalRow = sheet.getRow(lastRowIndex);
    finalRow.height = 22;
    finalRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1F497D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF1F5' } };
      if (colNum === netAmountColNum) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }

  /** Apply professional premium look-and-feel to any worksheet */
  private applyPremiumStyling(sheet: ExcelJS.Worksheet) {
    // Auto-size columns
    sheet.columns.forEach((column) => {
      let maxLen = column.header ? String(column.header).length : 10;
      column.eachCell?.((cell, rowNumber) => {
        if (rowNumber === 1) return;
        const valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 45);
    });

    // Header row styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: '10253F' } },
        bottom: { style: 'medium', color: { argb: '10253F' } },
        left: { style: 'thin', color: { argb: '10253F' } },
        right: { style: 'thin', color: { argb: '10253F' } },
      };
    });

    // Data rows — zebra striping
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rowNumber === sheet.rowCount && row.getCell(1).value?.toString().includes('TOTAL')) return;
      row.height = 20;
      const isEven = rowNumber % 2 === 0;
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } },
        };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFC' } };
        }
        if (typeof cell.value === 'number') {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        }
      });
    });
  }
}
