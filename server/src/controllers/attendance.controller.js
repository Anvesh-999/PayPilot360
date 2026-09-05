const attendanceService = require('../services/attendance.service');

const checkIn = async (req, res, next) => {
  try {
    const result = await attendanceService.checkIn(req.user.employeeId, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const checkOut = async (req, res, next) => {
  try {
    const result = await attendanceService.checkOut(req.user.employeeId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const list = async (req, res, next) => {
  try {
    const result = await attendanceService.list(req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const manualCorrection = async (req, res, next) => {
  try {
    const result = await attendanceService.manualCorrection(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = { checkIn, checkOut, list, manualCorrection };
