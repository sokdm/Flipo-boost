const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createTask,
  startTask,
  stopTask,
  getTasks,
  getTask,
  deleteTask
} = require('../controllers/taskController');

router.use(auth);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/:id/start', startTask);
router.post('/:id/stop', stopTask);
router.delete('/:id', deleteTask);

module.exports = router;
