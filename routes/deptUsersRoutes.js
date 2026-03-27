const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  listDeptUsers,
  createDeptUser,
  updateDeptUser,
  toggleDeptUserStatus,
  checkDeptUserExists
} = require('../controllers/deptUsersController');

// All require auth
router.get('/',           verifyToken, listDeptUsers);
router.post('/',          verifyToken, createDeptUser);
router.put('/:sno',       verifyToken, updateDeptUser);
router.patch('/:sno/status', verifyToken, toggleDeptUserStatus);
router.get('/check',      verifyToken, checkDeptUserExists);

module.exports = router;