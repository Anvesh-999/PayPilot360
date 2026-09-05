const prisma = require('../config/db');
const leaveService = require('../services/leave.service');

// Leave Types
const createLeaveType = async (req, res, next) => {
  try {
    const result = await leaveService.createLeaveType(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const listLeaveTypes = async (req, res, next) => {
  try {
    const result = await leaveService.listLeaveTypes();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const updateLeaveType = async (req, res, next) => {
  try {
    const result = await leaveService.updateLeaveType(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

// Leave Balances
const allocateBalance = async (req, res, next) => {
  try {
    const result = await leaveService.allocateBalance(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const listBalances = async (req, res, next) => {
  try {
    const result = await leaveService.listBalances(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getMyBalances = async (req, res, next) => {
  try {
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const emp = (req.user.userId && await prisma.employee.findFirst({ where: { userId: req.user.userId } })) ||
                  await prisma.employee.findFirst({ where: { employmentStatus: 'ACTIVE' } });
      employeeId = emp?.id;
    }
    const result = employeeId ? await leaveService.getBalances(employeeId) : [];
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

// Leave Requests
const submitRequest = async (req, res, next) => {
  try {
    let employeeId = req.user.employeeId || req.body.employeeId;
    if (!employeeId) {
      const emp = (req.user.userId && await prisma.employee.findFirst({ where: { userId: req.user.userId } })) ||
                  await prisma.employee.findFirst({ where: { employmentStatus: 'ACTIVE' } });
      employeeId = emp?.id;
    }
    const result = await leaveService.submitRequest(employeeId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const listRequests = async (req, res, next) => {
  try {
    const result = await leaveService.listRequests(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getRequest = async (req, res, next) => {
  try {
    const result = await leaveService.getRequestById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const approveRequest = async (req, res, next) => {
  try {
    const result = await leaveService.approveRequest(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const rejectRequest = async (req, res, next) => {
  try {
    const result = await leaveService.rejectRequest(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = {
  createLeaveType, listLeaveTypes, updateLeaveType,
  allocateBalance, listBalances, getMyBalances,
  submitRequest, listRequests, getRequest, approveRequest, rejectRequest,
};
