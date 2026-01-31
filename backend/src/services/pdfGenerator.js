/**
 * PDF Generator Service
 * Generates professional PDF reports using Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Report brand colors
const BRAND_COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',
  dark: '#1e293b',
  light: '#f8fafc',
  border: '#e2e8f0'
};

// Status colors mapping
const STATUS_COLORS = {
  'Done': '#22c55e',
  'Completed': '#22c55e',
  'In Progress': '#3b82f6',
  'Pending': '#eab308',
  'Cancelled': '#ef4444',
  'On Hold': '#f97316',
  'Unknown': '#6b7280'
};

/**
 * Common HTML template with styling
 * @param {string} title - Report title
 * @param {string} content - Report body content
 * @param {Object} options - Additional options
 * @returns {string} Complete HTML document
 */
const createBaseTemplate = (title, content, options = {}) => {
  const { subtitle = '', dateRange = '', filters = [] } = options;
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build filters display HTML
  let filtersHtml = '';
  if (filters && filters.length > 0) {
    filtersHtml = `
      <div class="applied-filters">
        <strong>Applied Filters:</strong>
        ${filters.map(f => `<span class="filter-tag">${f.field}: ${f.value}</span>`).join('')}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1e293b;
      background: #fff;
    }
    
    @page {
      size: A4 landscape;
      margin: 15mm 12mm 20mm 12mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9px;
        color: #64748b;
      }
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
      margin-bottom: 20px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo-placeholder {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    }
    
    .brand-info h1 {
      font-size: 18px;
      color: #1e293b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    
    .brand-info p {
      font-size: 10px;
      color: #64748b;
    }
    
    .report-info {
      text-align: right;
    }
    
    .report-info h2 {
      font-size: 16px;
      color: #2563eb;
      margin-bottom: 4px;
    }
    
    .report-info .subtitle {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 2px;
    }
    
    .report-info .date {
      font-size: 9px;
      color: #94a3b8;
    }
    
    .content {
      margin-top: 15px;
    }
    
    .applied-filters {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 10px;
    }
    
    .filter-tag {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 12px;
      margin: 2px 4px;
      font-size: 9px;
    }
    
    .summary-cards {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }
    
    .summary-card {
      flex: 1;
      min-width: 140px;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .summary-card .label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-card .change {
      font-size: 10px;
      margin-top: 5px;
    }
    
    .summary-card.positive .change { color: #22c55e; }
    .summary-card.negative .change { color: #ef4444; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10px;
    }
    
    thead {
      background: #f8fafc;
    }
    
    th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    
    th.numeric {
      text-align: right;
    }
    
    td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    
    td.numeric {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    tr:hover {
      background: #f8fafc;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-done { background: #dcfce7; color: #166534; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-on-hold { background: #ffedd5; color: #9a3412; }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin: 25px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: #2563eb;
      border-radius: 2px;
    }
    
    .chart-placeholder {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      color: #64748b;
      margin: 15px 0;
    }
    
    .chart-bar {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 8px;
      height: 150px;
      margin: 20px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 60px;
    }
    
    .bar {
      width: 100%;
      background: linear-gradient(to top, #2563eb, #3b82f6);
      border-radius: 4px 4px 0 0;
      min-height: 20px;
    }
    
    .bar-label {
      font-size: 8px;
      color: #64748b;
      margin-top: 5px;
      text-align: center;
      transform: rotate(-45deg);
      transform-origin: top center;
      white-space: nowrap;
    }
    
    .bar-value {
      font-size: 9px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 3px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    
    .footer p {
      margin-bottom: 3px;
    }
    
    .two-column {
      display: flex;
      gap: 20px;
      margin: 15px 0;
    }
    
    .column {
      flex: 1;
    }
    
    .info-box {
      background: #f8fafc;
      border-left: 3px solid #2563eb;
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 0 6px 6px 0;
    }
    
    .info-box p {
      margin: 3px 0;
      font-size: 10px;
    }
    
    .info-box strong {
      color: #1e293b;
    }
    
    .trend-indicator {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 600;
    }
    
    .trend-up { color: #22c55e; }
    .trend-down { color: #ef4444; }
    
    .page-break {
      page-break-after: always;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: 'Courier New', monospace; }
    
    .color-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 6px;
    }
    
    .group-header {
      background: #f1f5f9;
      font-weight: 600;
    }
    
    .group-row {
      border-left: 3px solid #2563eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="logo-placeholder">PM</div>
      <div class="brand-info">
        <h1>Project Management System</h1>
        <p>Comprehensive Project Tracking & Analytics</p>
      </div>
    </div>
    <div class="report-info">
      <h2>${title}</h2>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      ${dateRange ? `<div class="subtitle">${dateRange}</div>` : ''}
      <div class="date">Generated: ${generatedDate}</div>
    </div>
  </div>
  
  ${filtersHtml}
  
  <div class="content">
    ${content}
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} Project Management System - Confidential Report</p>
    <p>This report was automatically generated by the Project Management System</p>
  </div>
</body>
</html>`;
};

/**
 * Initialize Puppeteer browser
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
const initBrowser = async () => {
  return await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
};

/**
 * Generate PDF from HTML content
 * @param {string} html - HTML content
 * @param {string} filename - Output filename
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePDF = async (html, filename = 'report.pdf') => {
  let browser;
  try {
    browser = await initBrowser();
    const page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000
    });
    
    return pdf;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Get status class for CSS
 * @param {string} status - Status string
 * @returns {string} CSS class name
 */
const getStatusClass = (status) => {
  const normalized = status?.toLowerCase().replace(/\s+/g, '-');
  return `status-${normalized}`;
};

/**
 * Generate Summary Report PDF
 * @param {Object} data - Report data from getSummary
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateSummaryReportPDF = async (data) => {
  const { summary, trends, recent_activity } = data.data || data;
  
  const content = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${formatNumber(summary.total_projects)}</div>
        <div class="label">Total Projects</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.completion_rate}%</div>
        <div class="label">Completion Rate</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.in_progress)}</div>
        <div class="label">In Progress</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.done)}</div>
        <div class="label">Completed</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.provinces_with_projects)}</div>
        <div class="label">Provinces</div>
      </div>
    </div>
    
    <div class="info-box">
      <p><strong>Coverage Overview:</strong> Projects span across ${summary.provinces_with_projects} provinces, 
      ${summary.municipalities_with_projects} municipalities with ${summary.active_project_types} active project types.</p>
      <p><strong>Status Breakdown:</strong> ${summary.pending || 0} Pending, ${summary.in_progress || 0} In Progress, 
      ${summary.done || 0} Done, ${summary.cancelled || 0} Cancelled, ${summary.on_hold || 0} On Hold</p>
    </div>
    
    <div class="section-title">Monthly Trends (Last 12 Months)</div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th class="numeric">New Projects</th>
          <th class="numeric">Completed</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        ${(trends || []).map(trend => `
          <tr>
            <td>${trend.month}</td>
            <td class="numeric">${formatNumber(trend.count)}</td>
            <td class="numeric">${formatNumber(trend.completed)}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${trend.count > 0 ? (trend.completed / trend.count * 100) : 0}%; background: ${BRAND_COLORS.success}"></div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="section-title">Recent Activity (Last 10 Updates)</div>
    <table>
      <thead>
        <tr>
          <th>Site Code</th>
          <th>Site Name</th>
          <th>Type</th>
          <th>Province</th>
          <th>Status</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        ${(recent_activity || []).map(activity => `
          <tr>
            <td class="font-mono">${activity.site_code}</td>
            <td>${activity.site_name}</td>
            <td><span class="color-dot" style="background: ${activity.color_code || STATUS_COLORS.Unknown}"></span>${activity.project_type}</td>
            <td>${activity.province}</td>
            <td><span class="status-badge ${getStatusClass(activity.status)}">${activity.status}</span></td>
            <td>${new Date(activity.updated_at).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  const html = createBaseTemplate('Dashboard Summary Report', content, {
    subtitle: 'Overview of all projects and key metrics'
  });
  
  return await generatePDF(html, 'summary-report.pdf');
};

/**
 * Generate Status Report PDF
 * @param {Object} data - Report data from getByStatus
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateStatusReportPDF = async (data) => {
  const { breakdown, total, group_by } = data.data || data;
  
  // Calculate totals by status
  const statusTotals = {
    pending: breakdown.reduce((sum, row) => sum + (row.pending || 0), 0),
    in_progress: breakdown.reduce((sum, row) => sum + (row.in_progress || 0), 0),
    done: breakdown.reduce((sum, row) => sum + (row.done || 0), 0),
    cancelled: breakdown.reduce((sum, row) => sum + (row.cancelled || 0), 0),
    on_hold: breakdown.reduce((sum, row) => sum + (row.on_hold || 0), 0)
  };
  
  const content = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${formatNumber(total)}</div>
        <div class="label">Total Items</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusTotals.done)}</div>
        <div class="label">Completed</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusTotals.in_progress)}</div>
        <div class="label">In Progress</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusTotals.pending)}</div>
        <div class="label">Pending</div>
      </div>
    </div>
    
    <div class="section-title">Status Breakdown by ${group_by === 'project_type' ? 'Project Type' : group_by === 'province' ? 'Province' : 'Category'}</div>
    <table>
      <thead>
        <tr>
          <th>${group_by === 'project_type' ? 'Project Type' : group_by === 'province' ? 'Province' : 'Category'}</th>
          <th class="numeric">Total</th>
          <th class="numeric">Pending</th>
          <th class="numeric">In Progress</th>
          <th class="numeric">Done</th>
          <th class="numeric">Cancelled</th>
          <th class="numeric">On Hold</th>
          <th class="numeric">Completion %</th>
        </tr>
      </thead>
      <tbody>
        ${breakdown.map(row => `
          <tr>
            <td>
              <span class="color-dot" style="background: ${row.color_code || BRAND_COLORS.primary}"></span>
              ${row.project_type || row.province || row.status || 'Unknown'}
            </td>
            <td class="numeric font-bold">${formatNumber(row.total || row.count)}</td>
            <td class="numeric">${formatNumber(row.pending || 0)}</td>
            <td class="numeric">${formatNumber(row.in_progress || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.success}">${formatNumber(row.done || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.danger}">${formatNumber(row.cancelled || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.warning}">${formatNumber(row.on_hold || 0)}</td>
            <td class="numeric">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar" style="width: 60px;">
                  <div class="progress-fill" style="width: ${Math.min(parseFloat(row.completion_percentage) || 0, 100)}%; background: ${BRAND_COLORS.success}"></div>
                </div>
                <span>${Number(parseFloat(row.completion_percentage) || 0).toFixed(1)}%</span>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="section-title">Status Distribution Summary</div>
    <div class="two-column">
      <div class="column">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th class="numeric">Count</th>
              <th class="numeric">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="status-badge status-done">Done</span></td>
              <td class="numeric">${formatNumber(statusTotals.done)}</td>
              <td class="numeric">${total > 0 ? ((statusTotals.done / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-in-progress">In Progress</span></td>
              <td class="numeric">${formatNumber(statusTotals.in_progress)}</td>
              <td class="numeric">${total > 0 ? ((statusTotals.in_progress / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-pending">Pending</span></td>
              <td class="numeric">${formatNumber(statusTotals.pending)}</td>
              <td class="numeric">${total > 0 ? ((statusTotals.pending / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-cancelled">Cancelled</span></td>
              <td class="numeric">${formatNumber(statusTotals.cancelled)}</td>
              <td class="numeric">${total > 0 ? ((statusTotals.cancelled / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-on-hold">On Hold</span></td>
              <td class="numeric">${formatNumber(statusTotals.on_hold)}</td>
              <td class="numeric">${total > 0 ? ((statusTotals.on_hold / total) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column">
        <div class="info-box">
          <p><strong>Key Insights:</strong></p>
          <p>• Completion Rate: ${total > 0 ? ((statusTotals.done / total) * 100).toFixed(1) : 0}% of all projects are completed</p>
          <p>• Active Projects: ${formatNumber(statusTotals.in_progress)} projects currently in progress</p>
          <p>• Pending Review: ${formatNumber(statusTotals.pending)} projects awaiting activation</p>
          <p>• On Hold: ${formatNumber(statusTotals.on_hold)} projects temporarily suspended</p>
        </div>
      </div>
    </div>
  `;
  
  const html = createBaseTemplate('Status Breakdown Report', content, {
    subtitle: `Grouped by ${group_by === 'project_type' ? 'Project Type' : group_by === 'province' ? 'Province' : 'Category'}`,
    dateRange: data.dateRange || ''
  });
  
  return await generatePDF(html, 'status-report.pdf');
};

/**
 * Generate Location Report PDF
 * @param {Object} data - Report data from getByLocation
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateLocationReportPDF = async (data) => {
  const { locations, summary } = data.data || data;
  const level = data.level || 'province';
  
  const content = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${formatNumber(summary.provinces_with_projects)}</div>
        <div class="label">Provinces</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.municipalities_with_projects)}</div>
        <div class="label">Municipalities</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.barangays_with_projects || 0)}</div>
        <div class="label">Barangays</div>
      </div>
      <div class="summary-card">
        <div class="value">${locations.reduce((sum, loc) => sum + (loc.total_projects || 0), 0)}</div>
        <div class="label">Total Projects</div>
      </div>
    </div>
    
    <div class="section-title">Location Distribution (${level === 'municipality' ? 'Municipality' : 'Province'} Level)</div>
    <table>
      <thead>
        <tr>
          ${level === 'municipality' ? '<th>Province</th><th>Municipality</th>' : '<th>Province</th><th>Region Code</th>'}
          <th class="numeric">Total Projects</th>
          <th class="numeric">Completed</th>
          <th class="numeric">In Progress</th>
          <th class="numeric">Pending</th>
          ${level === 'province' ? '<th class="numeric">Municipalities</th><th class="numeric">Project Types</th>' : '<th class="numeric">Types</th>'}
        </tr>
      </thead>
      <tbody>
        ${locations.map(loc => `
          <tr>
            ${level === 'municipality' ? `
              <td>${loc.province}</td>
              <td>${loc.municipality}</td>
            ` : `
              <td><strong>${loc.province}</strong></td>
              <td class="font-mono">${loc.region_code || 'N/A'}</td>
            `}
            <td class="numeric font-bold">${formatNumber(loc.total_projects)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.success}">${formatNumber(loc.completed || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.info}">${formatNumber(loc.in_progress || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.warning}">${formatNumber(loc.pending || 0)}</td>
            ${level === 'province' ? `
              <td class="numeric">${formatNumber(loc.municipalities_count || 0)}</td>
              <td class="numeric">${formatNumber(loc.project_types || 0)}</td>
            ` : `
              <td class="numeric">${formatNumber(loc.project_types || 0)}</td>
            `}
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="section-title">Top Performing Locations</div>
    <div class="two-column">
      <div class="column">
        <h4 style="margin-bottom: 10px; color: ${BRAND_COLORS.dark};">By Total Projects</h4>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th class="numeric">Projects</th>
              <th class="numeric">Completion</th>
            </tr>
          </thead>
          <tbody>
            ${locations.slice(0, 5).map(loc => `
              <tr>
                <td>${level === 'municipality' ? `${loc.municipality}, ${loc.province}` : loc.province}</td>
                <td class="numeric">${formatNumber(loc.total_projects)}</td>
                <td class="numeric">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="progress-bar" style="width: 50px;">
                      <div class="progress-fill" style="width: ${loc.total_projects > 0 ? ((loc.completed || 0) / loc.total_projects * 100) : 0}%; background: ${BRAND_COLORS.success}"></div>
                    </div>
                    <span>${loc.total_projects > 0 ? (((loc.completed || 0) / loc.total_projects) * 100).toFixed(1) : 0}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="column">
        <div class="info-box">
          <p><strong>Geographic Coverage:</strong></p>
          <p>Projects are distributed across ${summary.provinces_with_projects} provinces 
          covering ${summary.municipalities_with_projects} municipalities nationwide.</p>
          <p style="margin-top: 10px;"><strong>Average Projects per Province:</strong> 
          ${summary.provinces_with_projects > 0 ? (locations.reduce((sum, loc) => sum + (loc.total_projects || 0), 0) / summary.provinces_with_projects).toFixed(1) : 0}</p>
        </div>
      </div>
    </div>
  `;
  
  const html = createBaseTemplate('Location Breakdown Report', content, {
    subtitle: `Geographic distribution of projects at ${level} level`
  });
  
  return await generatePDF(html, 'location-report.pdf');
};

/**
 * Generate Projects List PDF
 * @param {Array} projects - Array of project objects
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateProjectsPDF = async (projects, options = {}) => {
  const { title = 'Project List', subtitle = '', filters = {} } = options;
  
  // Group projects by status for summary
  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  
  const content = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${formatNumber(projects.length)}</div>
        <div class="label">Total Projects</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusCounts['Done'] || 0)}</div>
        <div class="label">Completed</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusCounts['In Progress'] || 0)}</div>
        <div class="label">In Progress</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(statusCounts['Pending'] || 0)}</div>
        <div class="label">Pending</div>
      </div>
    </div>
    
    ${Object.keys(filters).length > 0 ? `
      <div class="info-box">
        <p><strong>Applied Filters:</strong></p>
        <p>${Object.entries(filters).map(([key, value]) => `${key}: ${value}`).join(' | ')}</p>
      </div>
    ` : ''}
    
    <div class="section-title">Project Details</div>
    <table>
      <thead>
        <tr>
          <th>Site Code</th>
          <th>Site Name</th>
          <th>Type</th>
          <th>Province</th>
          <th>Municipality</th>
          <th>Barangay</th>
          <th>Status</th>
          <th class="numeric">Latitude</th>
          <th class="numeric">Longitude</th>
          <th>Activation Date</th>
        </tr>
      </thead>
      <tbody>
        ${projects.map(project => `
          <tr>
            <td class="font-mono">${project.site_code}</td>
            <td>${project.site_name}</td>
            <td>${project.project_type}</td>
            <td>${project.province}</td>
            <td>${project.municipality}</td>
            <td>${project.barangay || 'N/A'}</td>
            <td><span class="status-badge ${getStatusClass(project.status)}">${project.status}</span></td>
            <td class="numeric">${project.latitude ? parseFloat(project.latitude).toFixed(6) : 'N/A'}</td>
            <td class="numeric">${project.longitude ? parseFloat(project.longitude).toFixed(6) : 'N/A'}</td>
            <td>${project.activation_date ? new Date(project.activation_date).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="section-title">Summary by Project Type</div>
    <table>
      <thead>
        <tr>
          <th>Project Type</th>
          <th class="numeric">Count</th>
          <th class="numeric">Percentage</th>
          <th>Distribution</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(projects.reduce((acc, p) => {
          acc[p.project_type] = (acc[p.project_type] || 0) + 1;
          return acc;
        }, {}))
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
          <tr>
            <td>${type}</td>
            <td class="numeric">${formatNumber(count)}</td>
            <td class="numeric">${((count / projects.length) * 100).toFixed(1)}%</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(count / projects.length) * 100}%; background: ${BRAND_COLORS.primary}"></div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  const html = createBaseTemplate(title, content, {
    subtitle: subtitle || `Export of ${projects.length} projects`
  });
  
  return await generatePDF(html, 'projects-export.pdf');
};

/**
 * Generate Custom Grouped Report PDF
 * @param {Object} data - Report data from getCustomReport
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateCustomReportPDF = async (data) => {
  const { groups, summary, group_by, applied_filters } = data.data || data;
  
  const groupByLabels = {
    'none': 'Flat List',
    'province': 'Province',
    'municipality': 'Municipality',
    'district': 'District',
    'project_type': 'Project Type',
    'status': 'Status',
    'activation_month': 'Activation Month'
  };
  
  // Calculate status totals
  const statusTotals = {
    pending: groups.reduce((sum, row) => sum + (row.pending || 0), 0),
    in_progress: groups.reduce((sum, row) => sum + (row.in_progress || 0), 0),
    done: groups.reduce((sum, row) => sum + (row.done || 0), 0),
    cancelled: groups.reduce((sum, row) => sum + (row.cancelled || 0), 0),
    on_hold: groups.reduce((sum, row) => sum + (row.on_hold || 0), 0)
  };
  
  const content = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${formatNumber(summary.total_projects)}</div>
        <div class="label">Total Projects</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.completion_rate}%</div>
        <div class="label">Completion Rate</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(groups.length)}</div>
        <div class="label">${groupByLabels[group_by] || 'Groups'}</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatNumber(summary.provinces_count || 0)}</div>
        <div class="label">Provinces</div>
      </div>
    </div>
    
    <div class="info-box">
      <p><strong>Report Configuration:</strong></p>
      <p>• Grouped by: ${groupByLabels[group_by] || group_by}</p>
      <p>• Total Groups: ${groups.length}</p>
      <p>• Status Distribution: ${statusTotals.done} Done, ${statusTotals.in_progress} In Progress, ${statusTotals.pending} Pending</p>
    </div>
    
    <div class="section-title">${groupByLabels[group_by] || 'Data'} Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>${groupByLabels[group_by] || 'Group'}</th>
          <th class="numeric">Total</th>
          <th class="numeric">Pending</th>
          <th class="numeric">In Progress</th>
          <th class="numeric">Done</th>
          <th class="numeric">Cancelled</th>
          <th class="numeric">On Hold</th>
          ${group_by === 'project_type' ? '<th class="numeric">Provinces</th><th class="numeric">Municipalities</th>' : ''}
          ${group_by === 'province' ? '<th class="numeric">Municipalities</th><th class="numeric">Types</th>' : ''}
          ${group_by === 'municipality' ? '<th class="numeric">Types</th>' : ''}
          <th class="numeric">Completion %</th>
        </tr>
      </thead>
      <tbody>
        ${groups.map(row => `
          <tr class="group-row">
            <td>
              ${row.color_code ? `<span class="color-dot" style="background: ${row.color_code}"></span>` : ''}
              <strong>${row.group_name || row.site_name || row.site_code || 'Unknown'}</strong>
              ${row.province_name ? `<br><small style="color: #64748b;">${row.province_name}</small>` : ''}
            </td>
            <td class="numeric font-bold">${formatNumber(row.total || 0)}</td>
            <td class="numeric">${formatNumber(row.pending || 0)}</td>
            <td class="numeric">${formatNumber(row.in_progress || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.success}">${formatNumber(row.done || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.danger}">${formatNumber(row.cancelled || 0)}</td>
            <td class="numeric" style="color: ${BRAND_COLORS.warning}">${formatNumber(row.on_hold || 0)}</td>
            ${group_by === 'project_type' ? `
              <td class="numeric">${formatNumber(row.provinces_count || 0)}</td>
              <td class="numeric">${formatNumber(row.municipalities_count || 0)}</td>
            ` : ''}
            ${group_by === 'province' ? `
              <td class="numeric">${formatNumber(row.municipalities_count || 0)}</td>
              <td class="numeric">${formatNumber(row.project_types_count || 0)}</td>
            ` : ''}
            ${group_by === 'municipality' ? `
              <td class="numeric">${formatNumber(row.project_types_count || 0)}</td>
            ` : ''}
            <td class="numeric">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar" style="width: 50px;">
                  <div class="progress-fill" style="width: ${Math.min(parseFloat(row.completion_rate) || 0, 100)}%; background: ${BRAND_COLORS.success}"></div>
                </div>
                <span>${Number(parseFloat(row.completion_rate) || 0).toFixed(1)}%</span>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="section-title">Summary Statistics</div>
    <div class="two-column">
      <div class="column">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th class="numeric">Count</th>
              <th class="numeric">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="status-badge status-done">Done</span></td>
              <td class="numeric">${formatNumber(statusTotals.done)}</td>
              <td class="numeric">${summary.total_projects > 0 ? ((statusTotals.done / summary.total_projects) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-in-progress">In Progress</span></td>
              <td class="numeric">${formatNumber(statusTotals.in_progress)}</td>
              <td class="numeric">${summary.total_projects > 0 ? ((statusTotals.in_progress / summary.total_projects) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-pending">Pending</span></td>
              <td class="numeric">${formatNumber(statusTotals.pending)}</td>
              <td class="numeric">${summary.total_projects > 0 ? ((statusTotals.pending / summary.total_projects) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-cancelled">Cancelled</span></td>
              <td class="numeric">${formatNumber(statusTotals.cancelled)}</td>
              <td class="numeric">${summary.total_projects > 0 ? ((statusTotals.cancelled / summary.total_projects) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><span class="status-badge status-on-hold">On Hold</span></td>
              <td class="numeric">${formatNumber(statusTotals.on_hold)}</td>
              <td class="numeric">${summary.total_projects > 0 ? ((statusTotals.on_hold / summary.total_projects) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column">
        <div class="info-box">
          <p><strong>Coverage Overview:</strong></p>
          <p>• Projects span ${summary.provinces_count || 0} provinces</p>
          <p>• ${summary.municipalities_count || 0} municipalities involved</p>
          <p>• ${summary.project_types_count || 0} project types represented</p>
          ${applied_filters && applied_filters.length > 0 ? `
            <p style="margin-top: 10px;"><strong>Applied Filters:</strong></p>
            ${applied_filters.map(f => `<p>• ${f.field}: ${f.value}</p>`).join('')}
          ` : '<p>• No filters applied (all data)</p>'}
        </div>
      </div>
    </div>
  `;
  
  const html = createBaseTemplate('Custom Grouped Report', content, {
    subtitle: `Grouped by ${groupByLabels[group_by] || group_by}`,
    filters: applied_filters || []
  });
  
  return await generatePDF(html, 'custom-report.pdf');
};

module.exports = {
  generateSummaryReportPDF,
  generateStatusReportPDF,
  generateLocationReportPDF,
  generateProjectsPDF,
  generateCustomReportPDF,
  generatePDF
};
