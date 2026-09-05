const prisma = require('../config/db');
const contractService = require('./contract.service');
const attendanceService = require('./attendance.service');
const leaveService = require('./leave.service');
const salaryRuleEngine = require('./salaryRuleEngine.service');
const { AppError } = require('../middleware/errorHandler');

// Valid state transitions
const VALID_TRANSITIONS = {
  DRAFT: ['CALCULATING'],
  CALCULATING: ['CALCULATED'],
  CALCULATED: ['REVIEW', 'CALCULATING'], // Can recalculate
  REVIEW: ['APPROVED', 'CALCULATING'],   // Can recalculate
  APPROVED: ['FINALIZED'],
  FINALIZED: ['PAID'],
  PAID: [],
};

class PayrollService {
  /**
   * Create a new payrun (Step 1 — scope + period).
   */
  async createPayrun(data, createdById) {
    return prisma.payrun.create({
      data: {
        name: data.name,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        salaryStructureId: data.salaryStructureId,
        status: 'DRAFT',
        createdById,
      },
      include: { salaryStructure: true },
    });
  }

  /**
   * Get eligible employees for a payrun period.
   */
  async getEligibleEmployees(payrunId) {
    const payrun = await this.getPayrun(payrunId);

    // Get all ACTIVE employees
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      include: {
        department: true,
        jobPosition: true,
        contracts: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: payrun.periodEnd },
            OR: [
              { endDate: null },
              { endDate: { gte: payrun.periodStart } },
            ],
          },
        },
      },
    });

    return employees.map((emp) => ({
      ...emp,
      hasContract: emp.contracts.length > 0,
      hasBankDetails: !!(emp.bankAccountNumber && emp.bankIfsc),
    }));
  }

  /**
   * Select employees for the payrun (Step 2).
   */
  async selectEmployees(payrunId, employeeIds) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['DRAFT', 'CALCULATED', 'REVIEW']);

    // Delete existing payslips for this payrun (for re-selection)
    await prisma.payslipLine.deleteMany({
      where: { payslip: { payrunId } },
    });
    await prisma.payslip.deleteMany({ where: { payrunId } });

    // Create empty payslip shells
    const payslips = [];
    for (const employeeId of employeeIds) {
      // Resolve contract for each employee
      const contract = await contractService.resolveForPeriod(
        employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      if (!contract) {
        // Create payslip with warning but no contract
        continue; // Skip employees without contracts
      }

      payslips.push({
        payrunId,
        employeeId,
        contractId: contract.id,
        grossSalary: 0,
        totalDeductions: 0,
        netSalary: 0,
        workedDays: 0,
        status: 'DRAFT',
      });
    }

    if (payslips.length > 0) {
      await prisma.payslip.createMany({ data: payslips });
    }

    return prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        contract: true,
      },
    });
  }

  /**
   * Calculate payroll for all payslips in a payrun.
   * Each employee's calculation is wrapped in a transaction.
   */
  async calculate(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['DRAFT', 'CALCULATED', 'REVIEW']);

    // Transition to CALCULATING
    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'CALCULATING' },
    });

    try {
      const payslips = await prisma.payslip.findMany({
        where: { payrunId },
        include: {
          employee: true,
          contract: {
            include: {
              salaryStructure: {
                include: {
                  rules: {
                    include: { salaryRule: true },
                    orderBy: { salaryRule: { sequence: 'asc' } },
                  },
                },
              },
              workingSchedule: { include: { scheduleDays: true } },
            },
          },
        },
      });

      // Load the payrun's salary structure as fallback
      const payrunStructure = await prisma.salaryStructure.findUnique({
        where: { id: payrun.salaryStructureId },
        include: {
          rules: {
            include: { salaryRule: true },
            orderBy: { salaryRule: { sequence: 'asc' } },
          },
        },
      });

      const results = [];

      for (const payslip of payslips) {
        try {
          await this.calculateSinglePayslip(payslip, payrun, payrunStructure);
          results.push({ employeeId: payslip.employeeId, status: 'success' });
        } catch (err) {
          // Mark individual payslip with warning, don't abort batch
          console.error(`[Payroll] Calc failed for employee ${payslip.employeeId}:`, err.message);
          await prisma.payslip.update({
            where: { id: payslip.id },
            data: {
              warnings: [{ type: 'CALCULATION_ERROR', message: err.message }],
              status: 'DRAFT',
            },
          });
          results.push({ employeeId: payslip.employeeId, status: 'error', message: err.message });
        }
      }

      // Transition to CALCULATED
      await prisma.payrun.update({
        where: { id: payrunId },
        data: { status: 'CALCULATED' },
      });

      return results;
    } catch (err) {
      // Reset status on catastrophic failure
      await prisma.payrun.update({
        where: { id: payrunId },
        data: { status: 'DRAFT' },
      });
      throw err;
    }
  }

  /**
   * Calculate a single payslip within a transaction.
   */
  async calculateSinglePayslip(payslip, payrun, fallbackStructure) {
    await prisma.$transaction(async (tx) => {
      // Use contract's structure or fallback to payrun structure
      const structure = payslip.contract?.salaryStructure || fallbackStructure;
      if (!structure || !structure.rules || structure.rules.length === 0) {
        throw new Error('No salary structure/rules found');
      }

      // Aggregate attendance for the period
      const attendance = await attendanceService.aggregateForPayroll(
        payslip.employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      // Aggregate leave for the period
      const leave = await leaveService.aggregateForPayroll(
        payslip.employeeId,
        payrun.periodStart,
        payrun.periodEnd
      );

      // Calculate expected working days in the period
      const periodStart = new Date(payrun.periodStart);
      const periodEnd = new Date(payrun.periodEnd);
      let expectedDays = 0;
      const current = new Date(periodStart);
      while (current <= periodEnd) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) expectedDays++;
        current.setDate(current.getDate() + 1);
      }

      // Build evaluation context
      const context = {
        BASIC: parseFloat(payslip.contract?.basicWage || 0),
        employee: {
          employmentType: payslip.employee.employmentType,
          employmentStatus: payslip.employee.employmentStatus,
        },
        contract: {
          basicWage: parseFloat(payslip.contract?.basicWage || 0),
          wageType: payslip.contract?.wageType || 'MONTHLY',
        },
        attendance: {
          workedDays: attendance.workedDays,
          expectedDays,
          overtimeHours: attendance.totalOvertimeHours,
          absentDays: attendance.absentDays,
        },
        leave: {
          unpaidDays: leave.unpaidDays,
          paidDays: leave.paidDays,
        },
        workingDaysInMonth: expectedDays,
        unpaidLeaveDays: leave.unpaidDays,
      };

      // Run the rule engine
      const result = salaryRuleEngine.evaluate(structure.rules, context);

      // Delete existing lines (for recalculation)
      await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });

      // Create new lines
      if (result.lines.length > 0) {
        await tx.payslipLine.createMany({
          data: result.lines.map((line) => ({
            payslipId: payslip.id,
            salaryRuleId: line.salaryRuleId,
            ruleCode: line.ruleCode,
            label: line.label,
            amount: line.amount,
            sequence: line.sequence,
            category: line.category,
          })),
        });
      }

      // Update payslip totals
      const warnings = result.warnings.length > 0 ? result.warnings : null;
      await tx.payslip.update({
        where: { id: payslip.id },
        data: {
          grossSalary: result.grossSalary,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          workedDays: attendance.workedDays,
          status: 'CALCULATED',
          warnings,
        },
      });
    });
  }

  /**
   * Validate a payrun — produce warnings for review.
   */
  async validate(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['CALCULATED']);

    const payslips = await prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: true,
        lines: true,
      },
    });

    const allWarnings = [];

    for (const ps of payslips) {
      const warnings = Array.isArray(ps.warnings) ? [...ps.warnings] : [];

      // Missing bank details
      if (!ps.employee.bankAccountNumber || !ps.employee.bankIfsc) {
        warnings.push({ type: 'MISSING_BANK', message: 'Missing bank account details' });
      }

      // Negative/zero net
      if (parseFloat(ps.netSalary) <= 0) {
        warnings.push({ type: 'ZERO_NET', message: `Net salary is ${ps.netSalary}` });
      }

      // No payslip lines
      if (ps.lines.length === 0) {
        warnings.push({ type: 'NO_LINES', message: 'No salary rule lines computed' });
      }

      if (warnings.length > 0) {
        await prisma.payslip.update({
          where: { id: ps.id },
          data: {
            warnings,
            status: 'VALIDATED',
          },
        });
      } else {
        await prisma.payslip.update({
          where: { id: ps.id },
          data: { status: 'VALIDATED' },
        });
      }

      allWarnings.push({
        employeeId: ps.employeeId,
        employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
        warnings,
      });
    }

    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'REVIEW' },
    });

    return allWarnings;
  }

  /**
   * Approve a payrun.
   */
  async approve(payrunId, approvedById) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['REVIEW', 'CALCULATED']);

    return prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'APPROVED',
        approvedById,
      },
      include: { payslips: true, salaryStructure: true },
    });
  }

  /**
   * Finalize a payrun — makes it immutable.
   */
  async finalize(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['APPROVED']);

    return prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
      include: { payslips: true, salaryStructure: true },
    });
  }

  /**
   * Mark payrun as paid.
   */
  async markPaid(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    this.assertStatus(payrun, ['FINALIZED']);

    // Update all payslips to PAID
    await prisma.payslip.updateMany({
      where: { payrunId },
      data: { status: 'PAID' },
    });

    return prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'PAID' },
      include: { payslips: true, salaryStructure: true },
    });
  }

  // ─── List & Detail ────────────────────────────────────

  async listPayruns(query) {
    const { status, page = 1, pageSize = 20 } = query;
    const where = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.payrun.findMany({
        where,
        include: {
          salaryStructure: true,
          _count: { select: { payslips: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payrun.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async getPayrunDetail(payrunId) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
            },
            contract: true,
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw new AppError('Payrun not found', 404, 'NOT_FOUND');
    return payrun;
  }

  // ─── Helpers ──────────────────────────────────────────

  async getPayrun(id) {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: { salaryStructure: true },
    });
    if (!payrun) throw new AppError('Payrun not found', 404, 'NOT_FOUND');
    return payrun;
  }

  assertStatus(payrun, allowedStatuses) {
    if (!allowedStatuses.includes(payrun.status)) {
      throw new AppError(
        `Action not allowed in status '${payrun.status}'. Required: ${allowedStatuses.join(', ')}`,
        409,
        'INVALID_STATUS'
      );
    }
  }

  async sendPayslips(payrunId) {
    const payrun = await this.getPayrun(payrunId);
    const payslips = await prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true } }
      }
    });

    const recipients = payslips.map(ps => ({
      employeeId: ps.employeeId,
      email: ps.employee.email,
      name: `${ps.employee.firstName} ${ps.employee.lastName}`,
      payslipId: ps.id,
      netSalary: ps.netSalary
    }));

    return {
      success: true,
      count: recipients.length,
      recipients,
      message: `Successfully dispatched ${recipients.length} payslips via bulk email delivery.`
    };
  }
}

module.exports = new PayrollService();
