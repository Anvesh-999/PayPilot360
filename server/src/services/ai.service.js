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
   * ─── 3. Gemini Generative AI Call with Strict Privacy & General Q&A ───
   */
  async callGemini(prompt, context, user) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15 || apiKey === 'YOUR_GEMINI_API_KEY') {
      return null;
    }

    const isEmployee = (user?.roleName === 'EMPLOYEE');

    try {
      // Use verified active Gemini 2.5 Flash model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      
      const systemInstruction = `You are PayPilot AI Copilot in PeoplePay360, an enterprise HRMS & Payroll system.
You are an intelligent, helpful, knowledgeable, and courteous AI assistant.

CRITICAL PRIVACY & SCOPE RULES:
1. Current User Role: "${user?.roleName || 'EMPLOYEE'}".
2. EMPLOYEE CONFIDENTIALITY:
   - If user is an EMPLOYEE, they are strictly FORBIDDEN from viewing any other employee's salary, wage, contract, or personal data.
   - If an employee asks for another employee's salary (e.g. "what is the salary of Arjun Reddy", "who is highest earner", "how much does someone make"), you MUST strictly refuse: "In accordance with HR confidentiality policy, employees cannot access or view the salary or personal details of other employees."
   - Employees are allowed to ask about their own salary, attendance, and leave.
   - Employees cannot view executive company-wide payroll budgets or anomaly scores.
3. STRICT PROJECT SCOPE POLICY:
   - Your scope is STRICTLY RESTRICTED to PeoplePay360: Human Resources, Payroll processing, Salary structures, Contracts, Attendance, Leaves, and Indian statutory payroll regulations (PF, ESI, TDS, Gratuity).
   - You MUST REFUSE any questions outside the scope of this project (such as "What is Java?", general programming languages, coding, sports, movies, weather, general trivia).
   - If a user asks an out-of-scope question, respond concisely: "⚠️ **Out of Scope**: I am PayPilot AI Copilot, specialized exclusively in **PeoplePay360 HR & Payroll Management**. I cannot answer general topics outside the scope of our HR and payroll platform. Please ask questions related to your attendance, leaves, compensation, or payroll operations."

ORGANIZATIONAL CONTEXT (Only disclose to HR/Managers, NOT to Employees):
- Total Registered Staff: ${context.empCount}
- Departments: ${context.deptCount}
${!isEmployee ? `- Total Net Monthly Payroll: ₹${context.totalNet.toLocaleString('en-IN')}
- Total Gross Monthly Payroll: ₹${context.totalGross.toLocaleString('en-IN')}
- Active Payrun: "${context.latestPayrun?.name || 'Current Period'}"` : ''}
${isEmployee && context.selfEmployee ? `
AUTHENTICATED EMPLOYEE SELF-DATA:
- Full Name: ${context.selfEmployee.firstName} ${context.selfEmployee.lastName}
- Staff ID: ${context.selfEmployee.employeeCode}
- Title: ${context.selfEmployee.jobPosition?.title || 'Staff Member'}
- Department: ${context.selfEmployee.department?.name || 'General Operations'}
- Base Contract Monthly Salary: ₹${Number(context.selfEmployee.contracts?.[0]?.wage || context.selfEmployee.contracts?.[0]?.basicWage || 0).toLocaleString('en-IN')}
- Latest Net Disbursed Salary: ₹${Number(context.selfEmployee.payslips?.[0]?.netSalary || 0).toLocaleString('en-IN')}
` : ''}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn(`[Gemini API Warning] HTTP ${res.status}: Falling back to local engine.`);
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
   * ─── 4. Natural Language Assistant Engine (Hybrid Intelligence) ───
   */
  async askCopilot(prompt, user) {
    const q = (prompt || '').trim().toLowerCase();
    const isEmployee = (user?.roleName === 'EMPLOYEE');

    // 1. Resolve current user's linked employee record
    let selfEmployee = null;
    if (user?.employeeId || user?.userId || user?.email) {
      selfEmployee = (user.employeeId && await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: {
          department: true,
          jobPosition: true,
          contracts: { where: { status: 'ACTIVE' }, take: 1 },
          payslips: { orderBy: { createdAt: 'desc' }, take: 1, include: { payrun: true } }
        }
      })) || (user.userId && await prisma.employee.findFirst({
        where: { OR: [{ userId: user.userId }, { email: user.email }] },
        include: {
          department: true,
          jobPosition: true,
          contracts: { where: { status: 'ACTIVE' }, take: 1 },
          payslips: { orderBy: { createdAt: 'desc' }, take: 1, include: { payrun: true } }
        }
      }));
    }

    // ── PRIVACY GUARD 1: EMPLOYEE ASKING FOR OWN SALARY ──
    if (isEmployee) {
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
        const contract = selfEmployee?.contracts?.[0];
        const latestSlip = selfEmployee?.payslips?.[0];
        const baseWage = Number(contract?.wage || contract?.basicWage || latestSlip?.grossSalary || 0);
        const netPay = Number(latestSlip?.netSalary || baseWage || 0);
        const cycleName = latestSlip?.payrun?.name || 'Latest Active Cycle';

        return {
          answer: `### 💼 Your Compensation Summary
Hello **${selfEmployee ? `${selfEmployee.firstName} ${selfEmployee.lastName}` : (user.employeeName || 'Staff Member')}** (\`${selfEmployee?.employeeCode || 'EMP-XXXX'}\`):
- **Designation**: **${selfEmployee?.jobPosition?.title || 'Staff Member'}**
- **Department**: **${selfEmployee?.department?.name || 'General Operations'}**
- **Base Monthly Salary**: **₹${baseWage.toLocaleString('en-IN')}**
- **Latest Net Disbursed Take-Home**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Contract Status**: Active

You can review your detailed payslips and monthly deduction breakdowns in the **[My Payslips](/payslips)** section.`,
          suggestedActions: [
            { label: '📄 View My Payslips', path: '/payslips' },
            { label: '⏰ My Attendance', path: '/attendance' },
            { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          ],
        };
      }

      // PRIVACY GUARD 2: EMPLOYEE ASKING FOR OTHER EMPLOYEES' SALARY / DATA
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
In accordance with company data security policies and HR confidentiality guidelines, **employees cannot access or view the salary, compensation, or personal records of other employees**.

You are only authorized to view and inquire about your own employment, salary, attendance, and leave information.

*Tip: You can ask **"What is my salary?"** to view your own compensation.*`,
          suggestedActions: [
            { label: '💰 Check My Salary', query: 'What is my salary?' },
            { label: '📄 My Payslips', path: '/payslips' },
            { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          ],
        };
      }

      // PRIVACY GUARD 3: EMPLOYEE ASKING FOR COMPANY FINANCIAL TOTALS
      if (q.includes('total payroll') || q.includes('total spend') || q.includes('company budget') || q.includes('executive summary') || q.includes('anomalies')) {
        return {
          answer: `### 🔒 Access Restricted
Organization-wide payroll aggregates, audit anomaly reports, and executive summaries are confidential to **HR & Payroll Managers**.

As an employee, you can ask about:
- Your own compensation (*"What is my salary?"*)
- Your leave entitlements (*"What is my leave balance?"*)
- General technical and HR questions (*"What is Java?"*, *"How is TDS calculated?"*)`,
          suggestedActions: [
            { label: '💰 Check My Salary', query: 'What is my salary?' },
            { label: '📄 My Payslips', path: '/payslips' },
            { label: '⏰ My Attendance', path: '/attendance' },
          ],
        };
      }
    }

    // ── ADMIN / HR FLOW: Querying specific employee salary by name ──
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
          const cycleName = foundEmp.payslips?.[0]?.payrun?.name || 'Current Period';

          return {
            answer: `### 👤 Staff Compensation: ${foundEmp.firstName} ${foundEmp.lastName}
- **Staff ID**: \`${foundEmp.employeeCode}\`
- **Designation**: **${foundEmp.jobPosition?.title || 'Staff Member'}**
- **Department**: **${foundEmp.department?.name || 'General Operations'}**
- **Active Contract Base Wage**: **₹${baseWage.toLocaleString('en-IN')}** / month
- **Latest Net Disbursed**: **₹${netPay.toLocaleString('en-IN')}** (${cycleName})
- **Status**: ${foundEmp.employmentStatus}`,
            suggestedActions: [
              { label: 'Inspect in Directory', path: '/employees' },
              { label: 'View Contracts', path: '/contracts' },
            ],
          };
        }
      }
    }

    // Fetch baseline context
    const [empCount, deptCount, activeContracts, latestPayrun] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      prisma.department.count(),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.payrun.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          payslips: {
            include: {
              employee: { include: { department: true } },
            },
          },
        },
      }),
    ]);

    const payslips = latestPayrun?.payslips || [];
    const totalNet = payslips.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
    const totalGross = payslips.reduce((sum, s) => sum + Number(s.grossSalary || 0), 0);
    const avgSalary = payslips.length > 0 ? Math.round(totalNet / payslips.length) : 0;

    // ── Scope Guard: Strictly refuse non-project topics (programming, trivia, weather, etc.) ──
    const outOfScopePatterns = ['java', 'python', 'c++', 'javascript', 'c#', 'php', 'golang', 'rust', 'ruby', 'weather', 'recipe', 'movie', 'cricket', 'football', 'bitcoin', 'crypto', 'game', 'song', 'capital of', 'who is president'];
    if (outOfScopePatterns.some(p => q.includes(p))) {
      return {
        answer: `⚠️ **Out of Scope**: I am PayPilot AI Copilot, specialized exclusively in **PeoplePay360 HR & Payroll Management**.

I cannot answer questions outside the scope of our HR and payroll platform.

**You can ask me questions about:**
${isEmployee ? `- Your compensation & salary (*"What is my salary?"*)
- Your attendance and punch logs
- Your leave balances & time-off policies
- Your monthly payslips` : `- Organization payroll expenditure and active cycles
- Department-wise compensation breakdowns
- Specific employee compensation records
- Payroll anomaly audits and statutory deductions`}`,
        suggestedActions: isEmployee ? [
          { label: '💰 Check My Salary', query: 'What is my salary?' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          { label: '📄 My Payslips', path: '/payslips' },
        ] : [
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '🛡️ Audit Anomalies & Outliers', query: 'Detect payroll anomalies and wage spikes' },
        ],
      };
    }

    // ── Primary Engine: Gemini Generative AI ──
    const geminiAnswer = await this.callGemini(prompt, {
      empCount,
      deptCount,
      activeContracts,
      latestPayrun,
      totalNet,
      totalGross,
      avgSalary,
      payslips,
      selfEmployee,
    }, user);

    if (geminiAnswer) {
      return {
        answer: geminiAnswer,
        suggestedActions: isEmployee ? [
          { label: '💰 Check My Salary', query: 'What is my salary?' },
          { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
          { label: '📄 My Payslips', path: '/payslips' },
        ] : [
          { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
          { label: '🛡️ Audit Anomalies & Outliers', query: 'Detect payroll anomalies and wage spikes' },
          { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
          { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
        ],
      };
    }

    // ── Fallback 1: Project HR & Statutory Knowledge Engine ──

    if (q.includes('tds') || q.includes('tax deduction')) {
      return {
        answer: `### 🧾 Tax Deducted at Source (TDS) in Payroll
**TDS** is a statutory withholding tax under the Indian Income Tax Act where the employer deducts income tax from an employee's salary at the time of monthly payout and remits it directly to the government.

- **Calculation**: Based on estimated annual income, selected tax regime (New vs Old), and declared exemptions (HRA, 80C).
- **Form 16**: Annually issued certificate detailing total salary paid and TDS deposited.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    if (q.includes('epf') || q.includes('pf') || q.includes('provident fund')) {
      return {
        answer: `### 🏛️ Employees' Provident Fund (EPF)
**EPF** is a mandatory social security savings scheme governed by the EPFO in India.

- **Employee Contribution**: 12% of (Basic + DA).
- **Employer Contribution**: 12% total (3.67% to EPF, 8.33% to EPS pension scheme).
- **Interest**: Annual statutory interest rate determined by the Central Board of Trustees.`,
        suggestedActions: [
          { label: '📄 View My Payslips', path: '/payslips' },
          { label: '💰 Check My Salary', query: 'What is my salary?' },
        ],
      };
    }

    // ── Fallback 2: Admin Payroll Intents (Only for non-employees) ──
    if (!isEmployee) {
      if (q.includes('total') || q.includes('spend') || q.includes('expenditure') || q.includes('budget') || q.includes('disbursed')) {
        return {
          answer: `### 💰 Monthly Payroll Summary
For the current active cycle (**${latestPayrun?.name || 'Current Period'}**):
- **Total Net Disbursed**: **₹${totalNet.toLocaleString('en-IN')}**
- **Total Gross Payroll**: **₹${totalGross.toLocaleString('en-IN')}**
- **Employees Processed**: **${payslips.length} active staff**
- **Average Take-Home Pay**: **₹${avgSalary.toLocaleString('en-IN')} / employee**`,
          suggestedActions: [
            { label: 'View Payrun Details', path: '/payroll' },
            { label: 'Department Cost Breakdown', query: 'Show department breakdown' },
          ],
        };
      }

      if (q.includes('highest') || q.includes('earner') || q.includes('top salary') || q.includes('top 5')) {
        const sortedSlips = [...payslips].sort((a, b) => Number(b.netSalary || 0) - Number(a.netSalary || 0)).slice(0, 5);
        const topRows = sortedSlips.map((s, i) => {
          const emp = s.employee;
          return `${i + 1}. **${emp?.firstName} ${emp?.lastName}** — **₹${Number(s.netSalary).toLocaleString('en-IN')}** (${emp?.department?.name || 'Staff'})`;
        }).join('\n');

        return {
          answer: `### 🌟 Top 5 Highest Compensated Employees\n${topRows}`,
          suggestedActions: [
            { label: 'View Salary Structures', path: '/salary-structures' },
          ],
        };
      }
    }

    // ── Default Welcoming Fallback ──
    return {
      answer: `### ✨ PayPilot AI Assistant
Hello! I am your AI Assistant in PeoplePay360.

${isEmployee ? `**You can ask me questions like:**
- *"What is my salary?"*
- *"What is my leave balance?"*
- *"What is Java?"*
- *"Explain TDS and EPF deductions"*` : `**You can ask me questions like:**
- *"What is our total payroll expenditure this month?"*
- *"What is the salary of Arjun Reddy?"*
- *"Show department-wise compensation breakdown"*
- *"What is Java?"*`}`,
      suggestedActions: isEmployee ? [
        { label: '💰 Check My Salary', query: 'What is my salary?' },
        { label: '🌴 My Leave Balance', query: 'What is my leave balance?' },
      ] : [
        { label: '💰 Total Payroll Spend', query: 'What is our total payroll expenditure this month?' },
        { label: '🛡️ Audit Anomaly Score', query: 'Detect payroll anomalies' },
      ],
    };
  }
}

module.exports = new AIService();
