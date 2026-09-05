const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payslip.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/pdf', ctrl.downloadPdf);

module.exports = router;
