const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listReferences, createReference, toggleStatus, checkExists
} = require('../controllers/geReferenceController');

router.get('/',              verifyToken, listReferences);
router.get('/check',         verifyToken, checkExists);
router.post('/',             verifyToken, createReference);
router.patch('/:sno/status', verifyToken, toggleStatus);

module.exports = router;