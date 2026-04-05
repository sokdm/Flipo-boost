const Task = require('../models/Task');
const taskExecutor = require('../services/automation/taskExecutor');
const logger = require('../../utils/logger');

exports.createTask = async (req, res) => {
  try {
    console.log('Creating task with data:', req.body);
    const { platform, service, targetUrl, quantity, settings } = req.body;

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (e) {
      console.log('Invalid URL:', targetUrl);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate platform
    const validPlatforms = ['tiktok', 'youtube', 'instagram', 'facebook', 'linkedin', 'x'];
    if (!validPlatforms.includes(platform)) {
      console.log('Invalid platform:', platform);
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate service
    const validServices = ['followers', 'likes', 'comments', 'views', 'shares', 'subscribers', 'retweets'];
    if (!validServices.includes(service)) {
      console.log('Invalid service:', service);
      return res.status(400).json({ error: 'Invalid service' });
    }

    // Validate quantity
    if (!quantity || quantity < 1 || quantity > 10000) {
      console.log('Invalid quantity:', quantity);
      return res.status(400).json({ error: 'Quantity must be between 1 and 10000' });
    }

    // Check user credits
    const user = req.user;
    const estimatedCost = Math.ceil(quantity / 10);
    console.log('User credits:', user.credits, 'Cost:', estimatedCost);
    
    if (user.credits < estimatedCost) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    const task = await Task.create({
      userId: user._id,
      platform,
      service,
      targetUrl,
      quantity: parseInt(quantity),
      settings: settings || {},
      logs: [{
        message: 'Task created and pending',
        type: 'info',
        timestamp: new Date()
      }]
    });

    console.log('Task created:', task._id);

    // Deduct credits
    user.credits -= estimatedCost;
    await user.save();

    logger.info(`Task created: ${task._id} by user ${user._id}`);

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task: ' + error.message });
  }
};

exports.startTask = async (req, res) => {
  try {
    console.log('Starting task:', req.params.id);
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'running') {
      return res.status(400).json({ error: 'Task is already running' });
    }

    // Start execution in background
    taskExecutor.executeTask(task._id);

    res.json({
      success: true,
      message: 'Task started',
      task
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
};

exports.stopTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const stopped = taskExecutor.stopTask(task._id);
    
    if (stopped) {
      task.status = 'paused';
      task.logs.push({
        message: 'Task stopped by user',
        type: 'warning',
        timestamp: new Date()
      });
      await task.save();
    }

    res.json({
      success: true,
      message: stopped ? 'Task stopped' : 'Task was not running',
      task
    });
  } catch (error) {
    console.error('Stop task error:', error);
    res.status(500).json({ error: 'Failed to stop task' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.user._id);
    const tasks = await Task.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log('Found tasks:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'running') {
      taskExecutor.stopTask(task._id);
    }

    await Task.deleteOne({ _id: task._id });

    res.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
