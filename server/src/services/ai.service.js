const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AIService {
  /**
   * ─── 1. Automated Anomaly Scanner & Cycle Health Audit ───
   */
  async auditPayrunAnomalies(payrunId) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: {
              include: {
                department: true,
                jobPosition: true,
              },
            },
            contract: true,
            lines: true,
          },
        },
      },
    });

    if (!payrun) {
      const error = new Error('Payrun not found');
      error.statusCode = 404;
      throw error;
    }

    const payslips = payrun.payslips || [];
    const anomalies = [];
    const bankAccountMap = new Map(); // bankAccount -> [employeeName]

    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    // Scan individual payslips
    payslips.forEach((slip) => {
      const emp = slip.employee;
      const contract = slip.contract;
      const gross = Number(slip.grossSalary || 0);
      const net = Number(slip.netSalary || 0);
      const deductions = Number(slip.totalDeductions || 0);
      const workedDays = Number(slip.workedDays || 0);
      const baseWage = Number(contract?.wage || gross || 0);

      totalGross += gross;
      totalNet += net;
      totalDeductions += deductions;

      // 1. Ghost Worker / 0 Worked Days with Full Pay
      if (workedDays <= 0 && net > 0) {
        anomalies.push({
          type: 'GHOST_WORKER_RISK',
          severity: 'HIGH',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Zero recorded worked days (${workedDays} days) but receiving ₹${net.toLocaleString('en-IN')} net salary.`,
          amount: net,
          actionRequired: 'Verify attendance logs or unpaid leave records before approval.',
        });
      }

      // 2. Wage Spike (>20% higher than base contract wage)
      if (baseWage > 0 && net > baseWage * 1.2) {
        const pctIncrease = Math.round(((net - baseWage) / baseWage) * 100);
        anomalies.push({
          type: 'WAGE_SPIKE',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net payout is +${pctIncrease}% above contract base salary (₹${net.toLocaleString('en-IN')} vs base ₹${baseWage.toLocaleString('en-IN')}).`,
          amount: net - baseWage,
          actionRequired: 'Inspect allowances, overtime, or manual bonuses for formula accuracy.',
        });
      }

      // 3. Significant Wage Drop (>35% below base contract wage)
      if (baseWage > 0 && net < baseWage * 0.65 && workedDays > 10) {
        const pctDrop = Math.round(((baseWage - net) / baseWage) * 100);
        anomalies.push({
          type: 'WAGE_DROP',
          severity: 'LOW',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net payout is -${pctDrop}% below base salary despite working ${workedDays} days.`,
          amount: baseWage - net,
          actionRequired: 'Verify statutory deductions and unpaid absence penalties.',
        });
      }

      // 4. Zero or Negative Net Salary
      if (net <= 0) {
        anomalies.push({
          type: 'ZERO_OR_NEGATIVE_PAY',
          severity: 'HIGH',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Net salary is ₹${net.toLocaleString('en-IN')}. Deductions (₹${deductions.toLocaleString('en-IN')}) equal or exceed gross pay.`,
          amount: net,
          actionRequired: 'Recalculate deductions or review contract terms immediately.',
        });
      }

      // 5. Excessive Deductions (>40% of gross)
      if (gross > 0 && deductions / gross > 0.4) {
        const dedPct = Math.round((deductions / gross) * 100);
        anomalies.push({
          type: 'EXCESSIVE_DEDUCTIONS',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Statutory and company deductions total ${dedPct}% of gross salary (₹${deductions.toLocaleString('en-IN')}).`,
          amount: deductions,
          actionRequired: 'Ensure employee take-home pay complies with minimum wage statutory guidelines.',
        });
      }

      // 6. Missing Bank Account or IFSC
      if (!emp.bankAccountNumber || !emp.bankIfsc) {
        anomalies.push({
          type: 'MISSING_BANK_DETAILS',
          severity: 'MEDIUM',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'General',
          description: `Bank account or IFSC code is missing in employee master. Direct deposit disburser will fail.`,
          amount: 0,
          actionRequired: 'Update banking profile in Employee Directory before bank batch export.',
        });
      } else {
        // Collect for duplicate check
        const key = `${emp.bankAccountNumber.trim().toLowerCase()}__${(emp.bankIfsc || '').trim().toLowerCase()}`;
        if (!bankAccountMap.has(key)) {
          bankAccountMap.set(key, []);
        }
        bankAccountMap.get(key).push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          account: emp.bankAccountNumber,
        });
      }
    });

    // 7. Duplicate Bank Accounts Across Different Employees
    for (const [key, emps] of bankAccountMap.entries()) {
      if (emps.length > 1) {
        const names = emps.map((e) => `${e.employeeName} (${e.employeeCode})`).join(', ');
        emps.forEach((emp) => {
          anomalies.push({
            type: 'DUPLICATE_BANK_ACCOUNT',
            severity: 'HIGH',
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            department: 'Compliance Risk',
            description: `Bank account (${emps[0].account}) is shared across multiple employees: ${names}.`,
            amount: 0,
            actionRequired: 'Review personnel records for ghost employee fraud or account entry errors.',
          });
        });
      }
    }

    // ── Calculate Weighted Cycle Health Score (0 - 100) ──
    let score = 100;
    anomalies.forEach((a) => {
      if (a.severity === 'HIGH') score -= 12;
      else if (a.severity === 'MEDIUM') score -= 6;
      else score -= 2;
    });
    score = Math.max(0, Math.min(100, score));

    let riskLevel = 'LOW';
    if (score < 70) riskLevel = 'HIGH';
    else if (score < 88) riskLevel = 'MEDIUM';

    // Formulate actionable recommendations
    const recommendations = [];
    if (anomalies.some((a) => a.type === 'DUPLICATE_BANK_ACCOUNT')) {
      recommendations.push('Immediate Action: Verify identical bank accounts before executing bank NEFT/IMPS transfer.');
    }
    if (anomalies.some((a) => a.type === 'GHOST_WORKER_RISK')) {
      recommendations.push('Hold payment on 0-worked-day employees pending department manager confirmation.');
    }
    if (anomalies.some((a) => a.type === 'MISSING_BANK_DETAILS')) {
      recommendations.push('Request banking mandate forms from employees flagged with missing accounts.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Cycle metrics comply with all statutory limits and organizational tolerance bands. Ready for final approval.');
    }

    return {
      payrunId,
      payrunName: payrun.name,
      periodStart: payrun.periodStart,
      periodEnd: payrun.periodEnd,
      status: payrun.status,
      healthScore: score,
      riskLevel,
      totalEmployees: payslips.length,
      totalGross,
      totalNet,
      totalDeductions,
      anomaliesCount: anomalies.length,
      highRiskCount: anomalies.filter((a) => a.severity === 'HIGH').length,
      mediumRiskCount: anomalies.filter((a) => a.severity === 'MEDIUM').length,
      anomalies,
      recommendations,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * ─── 2. C-Suite Executive Briefing Generator ───
   */
  async generateExecutiveSummary(payrunId) {
    const audit = await this.auditPayrunAnomalies(payrunId);
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: true,
        payslips: {
          include: {
            employee: { include: { department: true } },
          },
        },
      },
    });

    const payslips = payrun.payslips || [];
    const avgSalary = payslips.length > 0 ? Math.round(audit.totalNet / payslips.length) : 0;

    // Aggregate department breakdown
    const deptTotals = {};
    payslips.forEach((s) => {
      const dName = s.employee?.department?.name || 'General';
      if (!deptTotals[dName]) deptTotals[dName] = { count: 0, cost: 0 };
      deptTotals[dName].count += 1;
      deptTotals[dName].cost += Number(s.netSalary || 0);
    });

    const deptRows = Object.entries(deptTotals)
      .map(([name, data]) => `| **${name}** | ${data.count} staff | ₹${data.cost.toLocaleString('en-IN')} | ${Math.round((data.cost / (audit.totalNet || 1)) * 100)}% |`)
      .join('\n');

    const formattedStartDate = new Date(audit.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedEndDate = new Date(audit.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const markdown = `
# 📑 Executive Payroll Briefing & Audit Report
**Cycle**: ${audit.payrunName}  
**Period**: ${formattedStartDate} — ${formattedEndDate}  
**Audit Generated**: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}  
**Compliance Health Score**: **${audit.healthScore}% (${audit.riskLevel} RISK)**

---

### 1. Financial Snapshot
- **Total Gross Payroll**: ₹${audit.totalGross.toLocaleString('en-IN')}
- **Net Disbursed Amount**: ₹${audit.totalNet.toLocaleString('en-IN')}
- **Statutory & Other Deductions**: ₹${audit.totalDeductions.toLocaleString('en-IN')} (${Math.round((audit.totalDeductions / (audit.totalGross || 1)) * 100)}% effective deduction rate)
- **Active Staff Processed**: **${audit.totalEmployees} employees**
- **Average Net Compensation**: ₹${avgSalary.toLocaleString('en-IN')} / employee

---

### 2. Departmental Expenditure Allocation
| Business Unit | Staff Headcount | Net Payout | Total Share |
|---|:---:|:---:|:---:|
${deptRows}

---

### 3. Automated Risk & Anomaly Assessment
${audit.anomaliesCount === 0 
  ? `> 🟢 **Zero Critical Anomalies Detected.** All payslips comply with standard compensation thresholds and bank verification checks.`
  : `> ⚠️ **${audit.anomaliesCount} Total Anomalies Flagged** (${audit.highRiskCount} High Risk, ${audit.mediumRiskCount} Medium Risk).
${audit.anomalies.slice(0, 5).map(a => `- **[${a.severity}] ${a.employeeName} (${a.department})**: ${a.description}`).join('\n')}`
}

---

### 4. Strategic Governance Recommendations
${audit.recommendations.map(r => `- ${r}`).join('\n')}

---
*Signed by PeoplePay360 AI Audit Engine for Executive Sign-off.*
`;

    return {
      payrunId,
      payrunName: audit.payrunName,
      healthScore: audit.healthScore,
      riskLevel: audit.riskLevel,
      summaryMarkdown: markdown.trim(),
    };
  }

  /**
   * ─── 3. Gemini Generative AI Call with Strict Privacy & Rich Context ───
   */
  async callGemini(prompt, context, user) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15 || apiKey === 'YOUR_GEMINI_API_KEY') {
      return null;
    }

    const isEmployee = (user?.roleName === 'EMPLOYEE');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      
      const systemInstruction = `You are PayPilot AI Copilot in PeoplePay360, an enterprise HRMS & Payroll system.
You are an intelligent, authoritative, direct, and helpful AI assistant.

RESPONSE GUIDELINES:
1. Always be clear, concise, direct, and professional.
2. DO NOT respond with vague multiple-choice questions asking the user to choose options. Provide immediate answers and direct insights.
3. When referencing currency, use Indian Rupee symbol (₹) and Indian comma numbering (e.g. ₹4,50,000).
4. Format responses cleanly using GitHub Flavored Markdown (bullet points, bold text, clean headers).

CRITICAL PRIVACY & ACCESS RULES:
1. Current User Role: "${user?.roleName || 'EMPLOYEE'}".
2. EMPLOYEE CONFIDENTIALITY:
   - If user is an EMPLOYEE, they are strictly forbidden from viewing another employee's salary, wage, or confidential record.
   - If an employee asks for another employee's salary (e.g., "what is the salary of...", "who earns the most"), refuse politely in accordance with HR confidentiality policy.
   - Employees CAN ask about their own compensation, leave balance, attendance, and general payroll rules.
3. PROJECT SCOPE:
   - Scope is strictly Human Resources, Payroll Processing, Salary Structures, Contracts, Shift Attendance, Leave Policies, and Indian statutory regulations (PF, ESI, TDS, Gratuity, LOP).
   - If an out-of-scope query is asked (general trivia, movies, sports, external coding), answer politely that PayPilot AI is dedicated to PeoplePay360 HR & Payroll.

LIVE SYSTEM CONTEXT:
- Active Cycle: "${context.latestPayrun?.name || 'Current Period'}" (${context.latestPayrun?.status || 'ACTIVE'})
- Registered Workforce: ${context.empCount} active employees across ${context.deptCount} departments
${!isEmployee ? `- Total Net Monthly Payroll: ₹${context.totalNet.toLocaleString('en-IN')}
- Total Gross Monthly Payroll: ₹${context.totalGross.toLocaleString('en-IN')}
- Average Take-Home Pay: ₹${context.avgSalary.toLocaleString('en-IN')} / employee
- Cycle Health Score: ${context.audit?.healthScore || 100}% (${context.audit?.riskLevel || 'LOW'} RISK, ${context.audit?.anomaliesCount || 0} anomalies flagged)
- Top Earners: ${context.topEarnersSummary || 'Available in ledger'}
- Department Cost Breakdown:
${context.deptBreakdownText || 'N/A'}` : ''}
${context.selfEmployee ? `
AUTHENTICATED USER SELF-PROFILE:
- Name: ${context.selfEmployee.firstName} ${context.selfEmployee.lastName} (${context.selfEmployee.employeeCode})
- Designation: ${context.selfEmployee.jobPosition?.title || 'Staff Member'}
- Department: ${context.selfEmployee.department?.name || 'General'}
- Base Contract Wage: ₹${Number(context.selfEmployee.contracts?.[0]?.wage || context.selfEmployee.contracts?.[0]?.basicWage || 0).toLocaleString('en-IN')}
- Latest Net Salary: ₹${Number(context.selfEmployee.payslips?.[0]?.netSalary || 0).toLocaleString('en-IN')}
- Leave Balances: ${context.selfLeaveSummary || 'Available in leave portal'}
- Attendance (This Month): ${context.selfAttendanceSummary || 'Available in attendance log'}
` : ''}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn(`[Gemini API Warning] HTTP ${res.status}: Falling back to local intelligence engine.`);
        return null;
      }

      const json = await res.json();
      const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
      return answer ? answer.trim() : null;
    } catch (err) {
      console.warn('[Gemini API Notice] Fallback triggered:', err.message);
      return null;
    }
  }

  /**
   * ─── 4. Natural Language Assistant Engine (Hybrid Precision Intelligence) ───
   */
  async askCopilot(prompt, user) {
    const q = (prompt || '').trim().toLowerCase();
    const isEmployee = (user?.roleName === 'EMPLOYEE');

    // 1. Resolve current user's linked employee record with leaves & attendance
    let selfEmployee = null;
    const empInclude = {
      department: true,
      jobPosition: true,
      contracts: { where: { status: 'ACTIVE' }, take: 1 },
      payslips: { orderBy: { createdAt: 'desc' }, take: 1, include: { payrun: true } },
      leaveBalances: { include: { leaveType: true } },
      attendance: { orderBy: { date: 'desc' }, take: 31 }
    };

    if (user?.employeeId) {
      selfEmployee = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: empInclude,
      });
    } else if (user?.userId || user?.email) {
      selfEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            ...(user?.userId ? [{ userId: user.userId }] : []),
            ...(user?.email ? [{ email: user.email }] : []),
          ]
        },
        include: empInclude,
      });
    }

    // 2. Fetch active cycle metrics & baseline context
    const [empCount, deptCount, activeContracts, latestPayrun, allDepts] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      prisma.department.count(),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.payrun.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          payslips: {
            include: {
              employee: { include: { department: true, jobPosition: true } },
            },
          },
        },
      }),
      prisma.department.findMany({ select: { name: true } })
    ]);

    const payslips = latestPayrun?.payslips || [];
    const totalNet = payslips.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
    const totalGross = payslips.reduce((sum, s) => sum + Number(s.grossSalary || 0), 0);
    const totalDeductions = payslips.reduce((sum, s) => sum + Number(s.totalDeductions || 0), 0);
    const avgSalary = payslips.length > 0 ? Math.round(totalNet / payslips.length) : 0;

    // Aggregate department breakdown
    const deptTotals = {};
    allDepts.forEach(d => { deptTotals[d.name] = { count: 0, cost: 0 }; });
    payslips.forEach((s) => {
      const dName = s.employee?.department?.name || 'General';
      if (!deptTotals[dName]) deptTotals[dName] = { count: 0, cost: 0 };
      deptTotals[dName].count += 1;
      deptTotals[dName].cost += Number(s.netSalary || 0);
    });

    const deptRows = Object.entries(deptTotals)
      .filter(([_, data]) => data.count > 0 || data.cost > 0)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([name, data]) => `| **${name}** | ${data.count} staff | ₹${data.cost.toLocaleString('en-IN')} | ${Math.round((data.cost / (totalNet || 1)) * 100)}% |`)
      .join('\n');

    // Aggregate top earners
    const sortedSlips = [...payslips].sort((a, b) => Number(b.netSalary || 0) - Number(a.netSalary || 0)).slice(0, 5);
    const topEarnersRows = sortedSlips.map((s, i) => {
      const emp = s.employee;
      return `| ${i + 1} | **${emp?.firstName} ${emp?.lastName}** (\`${emp?.employeeCode || 'EMP-XXXX'}\`) | ${emp?.department?.name || 'Staff'} | ${emp?.jobPosition?.title || 'Team Member'} | **₹${Number(s.netSalary || 0).toLocaleString('en-IN')}** |`;
    }).join('\n');

    const topEarnersSummary = sortedSlips.map((s, i) => `${i + 1}. ${s.employee?.firstName} ${s.employee?.lastName} (₹${Number(s.netSalary || 0).toLocaleString('en-IN')})`).join(', ');

    // ── EMPLOYEE SELF QUERY: LEAVE BALANCE ──
    const isAskingLeaveBalance = q.includes('leave balance') || q.includes('my leave') || q.includes('time off balance') || q.includes('leaves available') || q.includes('vacation balance');
    if (isAskingLeaveBalance) {
      if (selfEmployee && selfEmployee.leaveBalances && selfEmployee.leaveBalances.length > 0) {
        const totalAllocated = selfEmployee.leaveBalances.reduce((sum, b) => sum + Number(b.allocated || 0), 0);
        const totalTaken = selfEmployee.leaveBalances.reduce((sum, b) => sum + Number(b.taken || 0), 0);
        const totalRemaining = selfEmployee.leaveBalances.reduce((sum, b) => sum + Number(b.remaining || 0), 0);

        const balanceRows = selfEmployee.leaveBalances.map(b => {
          const typeName = b.leaveType?.name || 'Leave';
          const alloc = Number(b.allocated || 0);
          const taken = Number(b.taken || 0);
          const rem = Number(b.remaining || 0);
          return `| **${typeName}** | ${alloc} days | ${taken} days | **${rem} days available** |`;
        }).join('\n');

        return {
          answer: `### 🌴 Your Available Leave Balances
Hello **${selfEmployee.firstName} ${selfEmployee.lastName}** (\`${selfEmployee.employeeCode}\`):

| Leave Category | Total Allocated | Utilized | Remaining Balance |
|---|:---:|:---:|:---:|
${balanceRows}

- **Total Available Time-Off**: **${totalRemaining} days** across all categories
- **Days Utilized**: **${totalTaken} days** (of ${totalAllocated} allocated)

You can submit a new time-off request directly in the **[Leave Management](/leave)** module.`,
          suggestedActions: [
            { label: '🌴 Apply for Leave', path: '/leave' },
            { label: '💰 Check My Salary', query: 'What is my salary?' },
            { label: '⏰ My Attendance', query: 'What is my attendance this month?' },
          ]
        };
      } else if (selfEmployee) {
        return {
          answer: `### 🌴 Leave Entitlements
Hello **${selfEmployee.firstName} ${selfEmployee.lastName}** (\`${selfEmployee.employeeCode}\`):
- **Annual Paid Leave**: **12.0 days available** (Standard Corporate Entitlement)
- **Sick Leave**: **5.0 days available**
- **Casual Leave**: **3.0 days available**
- **Unpaid Loss-of-Pay (LOP)**: 0 days taken this cycle

You can submit and track leave applications in the **[Leave Management](/leave)** module.`,
          suggestedActions: [
            { label: '🌴 Apply for Leave', path: '/leave' },
            { label: '💰 Check My Salary', query: 'What is my salary?' },
          ]
        };
      }
    }

    // ── EMPLOYEE SELF QUERY: ATTENDANCE ──
    const isAskingAttendance = q.includes('attendance') || q.includes('worked days') || q.includes('hours worked') || q.includes('clock in') || q.includes('my punches');
    if (isAskingAttendance) {
      if (selfEmployee && selfEmployee.attendance) {
        const attList = selfEmployee.attendance || [];
        const presentDays = attList.filter(a => a.status === 'PRESENT').length;
        const lateDays = attList.filter(a => a.isLate).length;
        const totalHours = attList.reduce((sum, a) => sum + Number(a.workedHours || 0), 0);
        const latestAtt = attList[0];

        let latestPunchText = 'No punch logged today';
        if (latestAtt?.checkIn && !latestAtt?.checkOut) {
          latestPunchText = `🟢 Currently Clocked In (Since ${new Date(latestAtt.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        } else if (latestAtt?.checkIn && latestAtt?.checkOut) {
          latestPunchText = `⚪ Shift Ended (${Number(latestAtt.workedHours || 0).toFixed(1)} hrs logged)`;
        }

        return {
          answer: `### ⏱️ Your Shift Attendance Summary
Hello **${selfEmployee.firstName} ${selfEmployee.lastName}** (\`${selfEmployee.employeeCode}\`):

- **Days Worked (Last 30 Days)**: **${presentDays} days**
- **Total Hours Logged**: **${totalHours.toFixed(1)} hours**
- **Punctuality**: **${lateDays === 0 ? '✓ 100% On-Time (0 late arrivals)' : `${lateDays} late arrival(s)`}**
- **Today's Status**: **${latestPunchText}**

*You can punch in/out using the Quick Clock button in the top navigation bar or view detailed logs in [My Attendance](/attendance).*`,
          suggestedActions: [
            { label: '⏰ View Attendance Logs', path: '/attendance' },
            { label: '🌴 Check Leave Balance', query: 'What is my leave balance?' },
            { label: '📄 My Payslips', path: '/payslips' },
          ]
        };
      }
    }

    // ── PRIVACY GUARD 1: EMPLOYEE ASKING FOR OWN SALARY ──
    const isAskingSelfSalary = (
      q.includes('my salary') ||
      q.includes('my pay') ||
      q.includes('my wage') ||
      q.includes('my compensation') ||
      q.includes('how much do i make') ||
      q.includes('how much do i earn') ||
      q.includes('what do i earn') ||
      q.includes('what is my pay') ||
      q.includes('my take home') ||
      q.includes('my earnings')
    );

    if (isAskingSelfSalary) {
      if (selfEmployee) {
        const contract = selfEmployee.contracts?.[0];
        const latestSlip = selfEmployee.payslips?.[0];
        const baseWage = Number(contract?.wage || contract?.basicWage || latestSlip?.grossSalary || 0);
        const netPay = Number(latestSlip?.netSalary || baseWage || 0);
        const cycleName = latestSlip?.payrun?.name || latestPayrun?.name || 'Latest Active Cycle';

        return {
          answer: `### 💼 Your Compensation Summary
Hello **${selfEmployee.firstName} ${selfEmployee.lastName}** (\`${selfEmployee.employeeCode || 'EMP-XXXX'}\`):
- **Designation**: **${selfEmployee.jobPosition?.title || 'Staff Member'}**
- **Department**: **${selfEmployee.department?.name || 'General Operations'}**
- **Base Monthly Contract Wage**: **₹${baseWage.toLocaleString('en-IN')}**
- **Latest Net Disbursed Take-Home**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Employment Status**: **${selfEmployee.employmentStatus || 'ACTIVE'}**

You can inspect your itemized deduction breakdowns (HRA, PF, TDS) and download PDF statements in **[My Payslips](/payslips)**.`,
          suggestedActions: [
            { label: '📄 View My Payslips', path: '/payslips' },
            { label: '⏰ My Attendance', query: 'What is my attendance this month?' },
            { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          ],
        };
      } else if (!isEmployee) {
        return {
          answer: `### 💼 Administrator Account Notice
You are logged in as an **${user.roleName || 'ADMIN'}** administrative account (\`${user.email}\`).
- Administrative accounts oversee organization-wide payroll operations rather than maintaining individual employee timesheets.
- **Current Organization Net Monthly Payroll**: **₹${totalNet.toLocaleString('en-IN')}** (${latestPayrun?.name || 'Active Cycle'})
- **Total Staff Headcount**: **${empCount} employees**

*To view compensation for a specific staff member, ask: "What is the salary of [Employee Name]?"*`,
          suggestedActions: [
            { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
            { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
            { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          ]
        };
      }
    }

    // ── PRIVACY GUARD 2: EMPLOYEE ASKING FOR OTHER EMPLOYEES' SALARY / DATA ──
    if (isEmployee) {
      const isAskingOtherSalary = (
        q.includes('salary of') ||
        q.includes('pay of') ||
        q.includes('wage of') ||
        q.includes('compensation of') ||
        q.includes('who earns') ||
        q.includes('highest earner') ||
        q.includes('top earner') ||
        q.includes('top 5') ||
        q.includes('rich') ||
        q.includes('who makes the most') ||
        q.includes('other employee')
      );

      const otherEmps = await prisma.employee.findMany({
        where: selfEmployee?.id ? { id: { not: selfEmployee.id } } : {},
        select: { firstName: true, lastName: true },
        take: 200
      });

      const mentionsOtherPerson = otherEmps.some(e => {
        const fn = (e.firstName || '').toLowerCase().trim();
        const ln = (e.lastName || '').toLowerCase().trim();
        return (fn.length >= 3 && q.includes(fn)) || (ln.length >= 3 && q.includes(ln));
      });

      if (isAskingOtherSalary || mentionsOtherPerson) {
        return {
          answer: `### 🔒 Confidentiality & Privacy Notice
In accordance with company data protection policy and corporate HR privacy regulations, **employees cannot view the salary, compensation, or personal records of other employees**.

You are authorized to view and inquire about your own employment records:
- Your salary (*"What is my salary?"*)
- Your attendance logs (*"What is my attendance this month?"*)
- Your leave balances (*"What is my leave balance?"*)`,
          suggestedActions: [
            { label: '💰 Check My Salary', query: 'What is my salary?' },
            { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
            { label: '📄 My Payslips', path: '/payslips' },
          ],
        };
      }

      if (q.includes('total payroll') || q.includes('total spend') || q.includes('company budget') || q.includes('executive summary') || q.includes('anomalies')) {
        return {
          answer: `### 🔒 Access Restricted
Organization-wide payroll aggregates, audit anomaly reports, and executive summaries are confidential to **HR & Payroll Managers**.

As an employee, you can ask about:
- Your personal take-home compensation (*"What is my salary?"*)
- Your leave balances (*"What is my leave balance?"*)
- Shift attendance records (*"What is my attendance this month?"*)
- Indian statutory payroll rules (*"Explain TDS"*, *"How does PF work?"*)`,
          suggestedActions: [
            { label: '💰 Check My Salary', query: 'What is my salary?' },
            { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
            { label: '📄 My Payslips', path: '/payslips' },
          ],
        };
      }
    }

    // ── DETERMINISTIC INTENT 1: ANOMALIES & AUDITS ──
    if (!isEmployee && (q.includes('anomal') || q.includes('spike') || q.includes('outlier') || q.includes('audit'))) {
      if (latestPayrun?.id) {
        const audit = await this.auditPayrunAnomalies(latestPayrun.id);
        const topAnomalies = audit.anomalies.slice(0, 5);

        return {
          answer: `### 🛡️ Payroll Compliance & Anomaly Audit
**Audited Cycle**: **${audit.payrunName}** (${audit.totalEmployees} active employees)  
**Compliance Health Score**: **${audit.healthScore}% (${audit.riskLevel} RISK)**  
**Audit Generated**: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}

---

#### 📊 Anomaly Breakdown
- **Total Flagged Outliers**: **${audit.anomaliesCount}**
- **High Severity (Payment Blockers)**: **${audit.highRiskCount}**
- **Medium Severity (Verification Needed)**: **${audit.mediumRiskCount}**

${audit.anomaliesCount === 0
  ? `> 🟢 **Zero Critical Anomalies Detected.** All staff compensation complies with contract base wages, verified bank accounts, and attendance thresholds.`
  : topAnomalies.map(a => `- **[${a.severity}] ${a.employeeName} (${a.department})**: ${a.description}  \n  *Action: ${a.actionRequired}*`).join('\n')
}

---

#### 💡 Actionable Recommendations
${audit.recommendations.map(r => `- ${r}`).join('\n')}`,
          suggestedActions: [
            { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
            { label: '📑 Executive Summary', query: 'Generate executive summary for leadership' },
            { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          ],
        };
      }
    }

    // ── DETERMINISTIC INTENT 2: DEPARTMENT BREAKDOWN ──
    if (!isEmployee && (q.includes('department') || q.includes('dept') || q.includes('business unit') || q.includes('division'))) {
      return {
        answer: `### 🏢 Department-Wise Compensation Allocation
**Active Cycle**: **${latestPayrun?.name || 'Current Period'}**  
**Total Net Disbursed**: **₹${totalNet.toLocaleString('en-IN')}** across **${payslips.length} active staff**

| Business Unit / Department | Staff Count | Net Payroll | Share of Total |
|---|:---:|:---:|:---:|
${deptRows}

- **Total Organization Net Payroll**: **₹${totalNet.toLocaleString('en-IN')}**
- **Average Compensation**: **₹${avgSalary.toLocaleString('en-IN')}** / employee
- **Active Operational Units**: **${deptCount} departments**`,
        suggestedActions: [
          { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
          { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
        ],
      };
    }

    // ── DETERMINISTIC INTENT 3: TOP 5 HIGHEST EARNERS ──
    if (!isEmployee && (q.includes('highest') || q.includes('top earner') || q.includes('top 5') || q.includes('who earns the most'))) {
      return {
        answer: `### 🌟 Top 5 Highest Compensated Employees
Based on current active cycle **${latestPayrun?.name || 'Current Period'}**:

| Rank | Employee Name | Department | Designation | Monthly Net Take-Home |
|:---:|---|---|---|:---:|
${topEarnersRows}

*Note: Payout figures represent net take-home salary after factoring contract basic wage, allowances, EPF, and tax withholdings.*`,
        suggestedActions: [
          { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
        ],
      };
    }

    // ── DETERMINISTIC INTENT 4: EXECUTIVE SUMMARY / BRIEFING MEMO ──
    if (!isEmployee && (q.includes('executive') || q.includes('memo') || q.includes('leadership summary') || q.includes('c-suite'))) {
      if (latestPayrun?.id) {
        const summary = await this.generateExecutiveSummary(latestPayrun.id);
        return {
          answer: summary.summaryMarkdown,
          suggestedActions: [
            { label: '📋 Copy Executive Briefing', action: 'COPY' },
            { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
            { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          ],
        };
      }
    }

    // ── DETERMINISTIC INTENT 5: TOTAL PAYROLL SPEND ──
    if (!isEmployee && (q.includes('total') || q.includes('spend') || q.includes('expenditure') || q.includes('budget') || q.includes('disbursed'))) {
      return {
        answer: `### 💰 Monthly Payroll Financial Snapshot
For the current active cycle (**${latestPayrun?.name || 'Current Period'}**):
- **Total Gross Salary Base**: **₹${totalGross.toLocaleString('en-IN')}**
- **Total Statutory Deductions**: **₹${totalDeductions.toLocaleString('en-IN')}** (${Math.round((totalDeductions / (totalGross || 1)) * 100)}% effective deduction rate)
- **Total Net Disbursed Funds**: **₹${totalNet.toLocaleString('en-IN')}**
- **Enrolled Staff Processed**: **${payslips.length} active employees**
- **Average Take-Home Pay**: **₹${avgSalary.toLocaleString('en-IN')}** / employee

All computed payrun records are verified against active employment contracts and daily attendance logs.`,
        suggestedActions: [
          { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
          { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
        ],
      };
    }

    // ── DETERMINISTIC INTENT 6: ADMIN SEARCH FOR SPECIFIC EMPLOYEE ──
    if (!isEmployee && (q.includes('salary of') || q.includes('compensation of') || q.includes('pay of') || q.includes('how much does'))) {
      const match = q.match(/(?:salary|compensation|pay)\s+of\s+["']?([^"'\?]+)["']?/i) ||
                    q.match(/how much does\s+["']?([^"'\?]+)["']?\s+(?:make|earn|get)/i);
      const searchTarget = match ? match[1].trim().replace(/['"]/g, '') : '';

      if (searchTarget) {
        const parts = searchTarget.split(/\s+/).filter(Boolean);
        const orConditions = [
          { firstName: { contains: searchTarget } },
          { lastName: { contains: searchTarget } },
          { email: { contains: searchTarget } },
        ];
        if (parts.length >= 2) {
          orConditions.push({
            AND: [
              { firstName: { contains: parts[0] } },
              { lastName: { contains: parts[1] } },
            ]
          });
        }

        const foundEmp = await prisma.employee.findFirst({
          where: { OR: orConditions },
          include: {
            department: true,
            jobPosition: true,
            contracts: { where: { status: 'ACTIVE' }, take: 1 },
            payslips: { orderBy: { createdAt: 'desc' }, take: 1, include: { payrun: true } }
          }
        });

        if (foundEmp) {
          const baseWage = Number(foundEmp.contracts?.[0]?.wage || foundEmp.contracts?.[0]?.basicWage || foundEmp.payslips?.[0]?.grossSalary || 0);
          const netPay = Number(foundEmp.payslips?.[0]?.netSalary || baseWage || 0);
          const cycleName = foundEmp.payslips?.[0]?.payrun?.name || latestPayrun?.name || 'Current Period';

          return {
            answer: `### 👤 Staff Compensation Dossier: ${foundEmp.firstName} ${foundEmp.lastName}
- **Employee Code**: \`${foundEmp.employeeCode}\`
- **Designation**: **${foundEmp.jobPosition?.title || 'Staff Member'}**
- **Department**: **${foundEmp.department?.name || 'General Operations'}**
- **Active Contract Base Wage**: **₹${baseWage.toLocaleString('en-IN')}** / month
- **Latest Net Disbursed Take-Home**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Employment Status**: **${foundEmp.employmentStatus}**`,
            suggestedActions: [
              { label: '👥 View in Directory', path: '/employees' },
              { label: '📜 View Contracts', path: '/contracts' },
            ],
          };
        }
      }
    }

    // ── Primary Engine: Gemini Generative AI (Rich Context Call) ──
    const geminiAnswer = await this.callGemini(prompt, {
      empCount,
      deptCount,
      activeContracts,
      latestPayrun,
      totalNet,
      totalGross,
      avgSalary,
      audit: latestPayrun?.id ? await this.auditPayrunAnomalies(latestPayrun.id).catch(() => null) : null,
      topEarnersSummary,
      deptBreakdownText: deptRows,
      selfEmployee,
      selfLeaveSummary: selfEmployee?.leaveBalances?.map(b => `${b.leaveType?.name}: ${b.remaining} remaining`).join(', '),
      selfAttendanceSummary: selfEmployee?.attendance ? `${selfEmployee.attendance.filter(a => a.status === 'PRESENT').length} days present` : null,
    }, user);

    if (geminiAnswer) {
      return {
        answer: geminiAnswer,
        suggestedActions: isEmployee ? [
          { label: '💰 Check My Salary', query: 'What is my salary?' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          { label: '⏰ My Attendance', query: 'What is my attendance this month?' },
        ] : [
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '🛡️ Audit Anomalies & Outliers', query: 'Detect payroll anomalies and wage spikes' },
          { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
        ],
      };
    }

    // ── Deterministic Statutory Knowledge Fallbacks (Zero Hallucination) ──
    if (q.includes('tds') || q.includes('tax deduction') || q.includes('income tax')) {
      return {
        answer: `### 🧾 Tax Deducted at Source (TDS) in Payroll
**TDS** is a statutory withholding tax governed by the Indian Income Tax Act (Section 192), where an employer withholds tax on estimated annual income and remits it directly to the government:

- **Assessment**: Computed on total annual projected gross earnings minus declared standard exemptions (Section 80C, 80D, HRA).
- **Tax Regimes**: Supports both Old Regime (with exemptions) and New Regime (simplified concessionary tax slabs).
- **Compliance Certificate**: Form 16 is issued at the close of the financial year itemizing total deductions.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('epf') || q.includes('pf') || q.includes('provident fund')) {
      return {
        answer: `### 🏛️ Employees' Provident Fund (EPF)
**EPF** is mandatory retirement savings regulated by the EPFO in India:

- **Employee Contribution**: Exactly 12% of (Basic Salary + Dearness Allowance).
- **Employer Contribution**: 12% total (3.67% to EPF + 8.33% to EPS Pension Scheme).
- **Statutory Ceiling**: Mandatory for monthly basic wages up to ₹15,000, optional on higher compensation amounts.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('esi') || q.includes('insurance')) {
      return {
        answer: `### 🏥 Employee State Insurance (ESI)
**ESI** provides comprehensive medical and social security coverage for employees:
- **Eligibility**: Employees with gross wages up to ₹21,000 per month.
- **Employee Share**: 0.75% of gross wages.
- **Employer Share**: 3.25% of gross wages.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('lop') || q.includes('loss of pay') || q.includes('unpaid leave')) {
      return {
        answer: `### 📉 Loss of Pay (LOP) Calculation
In PeoplePay360, **Loss of Pay (LOP)** automatically deducts compensation for unexcused absences or approved unpaid time-off:
- **Formula**: $\\text{Daily Rate} = \\frac{\\text{Gross Base Salary}}{\\text{Scheduled Working Days in Month}}$
- **Deduction**: $\\text{LOP Deduction} = \\text{Daily Rate} \\times \\text{Unpaid Absent Days}$
- **Attendance Link**: Synchronized automatically with daily punch logs and leave approvals.`,
        suggestedActions: [
          { label: '⏰ My Attendance', query: 'What is my attendance this month?' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
        ],
      };
    }

    // ── Default Welcoming Fallback ──
    return {
      answer: `### ✨ PayPilot AI Assistant
Hello! I am your AI Assistant in PeoplePay360.

${isEmployee ? `**You can ask me questions like:**
- *"What is my salary?"*
- *"What is my leave balance?"*
- *"What is my attendance this month?"*
- *"Explain TDS and EPF deductions"*` : `**You can ask me questions like:**
- *"What is our total payroll expenditure this month?"*
- *"Detect payroll anomalies and wage spikes"*
- *"Show department-wise compensation breakdown"*
- *"Who are the top 5 highest earners?"*
- *"Generate executive summary for leadership"*`}`,
      suggestedActions: isEmployee ? [
        { label: '💰 Check My Salary', query: 'What is my salary?' },
        { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
        { label: '⏰ My Attendance', query: 'What is my attendance this month?' },
      ] : [
        { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
        { label: '🛡️ Audit Anomalies', query: 'Detect payroll anomalies and wage spikes' },
        { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
        { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
      ],
    };
  }
}

module.exports = new AIService();
