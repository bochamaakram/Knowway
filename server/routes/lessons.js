const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessonsController');
const auth = require('../middleware/auth');

// Public - Get lessons list for a course
router.get('/course/:courseId', lessonsController.getLessons);

// Public - Get single lesson
router.get('/:id', lessonsController.getLesson);

// Protected - Create lesson
router.post('/', auth, lessonsController.createLesson);

// Protected - Update lesson
router.put('/:id', auth, lessonsController.updateLesson);

// Protected - Delete lesson
router.delete('/:id', auth, lessonsController.deleteLesson);

module.exports = router;
