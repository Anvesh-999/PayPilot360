const employeeService = require('../services/employee.service');
const { capturePreviousValue } = require('../middleware/audit');

const create = async (req, res, next) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await employeeService.list(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const employee = await employeeService.getById(req.params.id);
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await employeeService.getById(req.params.id);
    capturePreviousValue(req, existing);
    const employee = await employeeService.update(req.params.id, req.body);
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

const terminate = async (req, res, next) => {
  try {
    const employee = await employeeService.terminate(req.params.id);
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await employeeService.getSummary(req.params.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, getById, update, terminate, getSummary };
