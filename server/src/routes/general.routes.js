const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const { validate } = require('../validators/auth.validator');
const { departmentSchema, jobPositionSchema, workingScheduleSchema } = require('../validators/schemas');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticateJWT);

// ─── Departments ────────────────────────────────────────

router.get('/departments', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: departments });
  } catch (error) { next(error); }
});

router.post('/departments', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), validate(departmentSchema), async (req, res, next) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    res.status(201).json({ success: true, data: dept });
  } catch (error) { next(error); }
});

router.put('/departments/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), async (req, res, next) => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: dept });
  } catch (error) { next(error); }
});

router.delete('/departments/:id', authorizeRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Department deleted' } });
  } catch (error) { next(error); }
});

// ─── Job Positions ──────────────────────────────────────

router.get('/job-positions', async (req, res, next) => {
  try {
    const positions = await prisma.jobPosition.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { title: 'asc' },
    });
    res.json({ success: true, data: positions });
  } catch (error) { next(error); }
});

router.post('/job-positions', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), validate(jobPositionSchema), async (req, res, next) => {
  try {
    const pos = await prisma.jobPosition.create({ data: req.body });
    res.status(201).json({ success: true, data: pos });
  } catch (error) { next(error); }
});

router.put('/job-positions/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), async (req, res, next) => {
  try {
    const pos = await prisma.jobPosition.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: pos });
  } catch (error) { next(error); }
});

router.delete('/job-positions/:id', authorizeRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    await prisma.jobPosition.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Position deleted' } });
  } catch (error) { next(error); }
});

// ─── Working Schedules ──────────────────────────────────

router.get('/working-schedules', async (req, res, next) => {
  try {
    const schedules = await prisma.workingSchedule.findMany({
      include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: schedules });
  } catch (error) { next(error); }
});

router.post('/working-schedules', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), validate(workingScheduleSchema), async (req, res, next) => {
  try {
    const { scheduleDays, ...scheduleData } = req.body;

    const schedule = await prisma.$transaction(async (tx) => {
      const sched = await tx.workingSchedule.create({ data: scheduleData });

      if (scheduleDays && scheduleDays.length > 0) {
        await tx.scheduleDay.createMany({
          data: scheduleDays.map(d => ({
            workingScheduleId: sched.id,
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            breakMinutes: d.breakMinutes || 0,
          })),
        });

        // Auto-calc total weekly hours
        let totalMinutes = 0;
        for (const d of scheduleDays) {
          const [sh, sm] = d.startTime.split(':').map(Number);
          const [eh, em] = d.endTime.split(':').map(Number);
          totalMinutes += (eh * 60 + em) - (sh * 60 + sm) - (d.breakMinutes || 0);
        }
        await tx.workingSchedule.update({
          where: { id: sched.id },
          data: { totalWeeklyHours: totalMinutes / 60 },
        });
      }

      return tx.workingSchedule.findUnique({
        where: { id: sched.id },
        include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.get('/working-schedules/:id', async (req, res, next) => {
  try {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!schedule) throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.put('/working-schedules/:id', authorizeRole(['SUPER_ADMIN', 'HR_MANAGER']), async (req, res, next) => {
  try {
    const { scheduleDays, ...scheduleData } = req.body;

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.workingSchedule.update({ where: { id: req.params.id }, data: scheduleData });

      if (scheduleDays) {
        await tx.scheduleDay.deleteMany({ where: { workingScheduleId: req.params.id } });
        if (scheduleDays.length > 0) {
          await tx.scheduleDay.createMany({
            data: scheduleDays.map(d => ({
              workingScheduleId: req.params.id,
              dayOfWeek: d.dayOfWeek,
              startTime: d.startTime,
              endTime: d.endTime,
              breakMinutes: d.breakMinutes || 0,
            })),
          });

          let totalMinutes = 0;
          for (const d of scheduleDays) {
            const [sh, sm] = d.startTime.split(':').map(Number);
            const [eh, em] = d.endTime.split(':').map(Number);
            totalMinutes += (eh * 60 + em) - (sh * 60 + sm) - (d.breakMinutes || 0);
          }
          await tx.workingSchedule.update({
            where: { id: req.params.id },
            data: { totalWeeklyHours: totalMinutes / 60 },
          });
        }
      }

      return tx.workingSchedule.findUnique({
        where: { id: req.params.id },
        include: { scheduleDays: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });

    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
});

router.delete('/working-schedules/:id', authorizeRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    await prisma.workingSchedule.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Schedule deleted' } });
  } catch (error) { next(error); }
});

// ─── Notifications ──────────────────────────────────────

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });
    res.json({ success: true, data: { items: notifications, unreadCount } });
  } catch (error) { next(error); }
});

router.put('/notifications/:id/read', async (req, res, next) => {
  try {
    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, data: notif });
  } catch (error) { next(error); }
});

router.put('/notifications/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) { next(error); }
});

// ─── Audit Logs ─────────────────────────────────────────

router.get('/audit-logs', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'HR_MANAGER']), async (req, res, next) => {
  try {
    const { entity, entityId, userId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    // Scope for non-admin
    if (req.user.roleName === 'HR_MANAGER') {
      where.entity = { in: ['Employee', 'Contract', 'Attendance', 'LeaveRequest'] };
    } else if (req.user.roleName === 'PAYROLL_MANAGER') {
      where.entity = { in: ['SalaryRule', 'SalaryStructure', 'Payrun', 'Payslip'] };
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { items, page: parseInt(page), pageSize: parseInt(pageSize), total } });
  } catch (error) { next(error); }
});

module.exports = router;
