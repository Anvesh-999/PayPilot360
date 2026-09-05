const prisma = require('../config/db');
const PDFDocument = require('pdfkit');
const { AppError } = require('../middleware/errorHandler');

const list = async (req, res, next) => {
  try {
    const { employeeId, payrunId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (payrunId) where.payrunId = payrunId;

    // Employee can only see own payslips
    if (req.user.roleName === 'EMPLOYEE') {
      where.employeeId = req.user.employeeId;
    }

    const [items, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
          payrun: { select: { name: true, periodStart: true, periodEnd: true, status: true } },
          contract: { select: { basicWage: true, wageType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.payslip.count({ where }),
    ]);

    res.json({ success: true, data: { items, page: parseInt(page), pageSize: parseInt(pageSize), total } });
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          include: { department: true, jobPosition: true },
        },
        payrun: true,
        contract: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) throw new AppError('Payslip not found', 404, 'NOT_FOUND');

    // Employee self-access check
    if (req.user.roleName === 'EMPLOYEE' && payslip.employeeId !== req.user.employeeId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    res.json({ success: true, data: payslip });
  } catch (error) { next(error); }
};

const downloadPdf = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { include: { department: true, jobPosition: true } },
        payrun: true,
        contract: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) throw new AppError('Payslip not found', 404, 'NOT_FOUND');

    if (req.user.roleName === 'EMPLOYEE' && payslip.employeeId !== req.user.employeeId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.employee.employeeCode}-${payslip.payrun.periodStart.toISOString().slice(0, 7)}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PeoplePay360', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Payslip', { align: 'center' });
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Employee Details
    doc.fontSize(10);
    const leftCol = 50;
    const rightCol = 300;
    let y = doc.y;

    doc.font('Helvetica-Bold').text('Employee:', leftCol, y);
    doc.font('Helvetica').text(`${payslip.employee.firstName} ${payslip.employee.lastName}`, leftCol + 80, y);

    doc.font('Helvetica-Bold').text('Employee Code:', rightCol, y);
    doc.font('Helvetica').text(payslip.employee.employeeCode, rightCol + 100, y);

    y += 18;
    doc.font('Helvetica-Bold').text('Department:', leftCol, y);
    doc.font('Helvetica').text(payslip.employee.department?.name || 'N/A', leftCol + 80, y);

    doc.font('Helvetica-Bold').text('Position:', rightCol, y);
    doc.font('Helvetica').text(payslip.employee.jobPosition?.title || 'N/A', rightCol + 100, y);

    y += 18;
    doc.font('Helvetica-Bold').text('Pay Period:', leftCol, y);
    doc.font('Helvetica').text(
      `${payslip.payrun.periodStart.toISOString().slice(0, 10)} to ${payslip.payrun.periodEnd.toISOString().slice(0, 10)}`,
      leftCol + 80, y
    );

    doc.font('Helvetica-Bold').text('Worked Days:', rightCol, y);
    doc.font('Helvetica').text(String(payslip.workedDays), rightCol + 100, y);

    doc.moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Earnings
    const earnings = payslip.lines.filter(l => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category));
    const deductions = payslip.lines.filter(l => l.category === 'DEDUCTION');

    doc.fontSize(12).font('Helvetica-Bold').text('Earnings');
    doc.moveDown(0.5);

    for (const line of earnings) {
      doc.fontSize(10).font('Helvetica');
      doc.text(line.label, leftCol, doc.y, { continued: true, width: 300 });
      doc.text(`₹${parseFloat(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
    }

    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Deductions');
    doc.moveDown(0.5);

    for (const line of deductions) {
      doc.fontSize(10).font('Helvetica');
      doc.text(line.label, leftCol, doc.y, { continued: true, width: 300 });
      doc.text(`₹${parseFloat(Math.abs(line.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Totals
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Gross Salary:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`₹${parseFloat(payslip.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.text('Total Deductions:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`₹${parseFloat(payslip.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Net Salary:', leftCol, doc.y, { continued: true, width: 300 });
    doc.text(`₹${parseFloat(payslip.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

    doc.moveDown(3);
    doc.fontSize(8).font('Helvetica').fillColor('grey');
    doc.text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });

    doc.end();
  } catch (error) { next(error); }
};

module.exports = { list, getById, downloadPdf };
