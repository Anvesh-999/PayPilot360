const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payslip.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.list);
router.get('/:id', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.getById);
router.get('/:id/pdf', authorizeRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER', 'EMPLOYEE']), ctrl.downloadPdf);

module.exports = router;
