const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const progressController = require('../controllers/progressController');

// All routes require authentication
router.use(auth);

// Get progress for a course
router.get('/course/:courseId', progressController.getCourseProgress);

// Mark lesson as complete
router.post('/lesson/:lessonId/complete', progressController.markLessonComplete);

// Mark lesson as incomplete
router.delete('/lesson/:lessonId/complete', progressController.markLessonIncomplete);

module.exports = router;
