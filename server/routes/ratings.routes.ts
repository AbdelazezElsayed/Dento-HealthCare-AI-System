import { Router } from 'express';
import { RatingRepo } from '../repositories/rating.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import { NotificationService } from '../services/notification.service';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import logger from '../utils/logger';

const router = Router();

// Validation schema for creating a rating
const createRatingSchema = z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(1, 'Comment is required').max(1000, 'Comment too long')
});

// Get all ratings
router.get('/', async (_req, res) => {
    try {
        res.json(await RatingRepo.findAll());
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch ratings', error: err.message });
    }
});

// Get ratings by doctor
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        res.json(await RatingRepo.findByDoctor(req.params.doctorId));
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch doctor ratings', error: err.message });
    }
});

// Get ratings by patient
router.get('/patient/:patientId', requireAuth, async (req, res) => {
    try {
        if (req.session.userId !== req.params.patientId && req.session.userType !== 'admin')
            return res.status(403).json({ message: 'Access denied' });
        res.json(await RatingRepo.findByPatient(req.params.patientId));
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch patient ratings', error: err.message });
    }
});

// Create a new rating
router.post('/', requireAuth, validateBody(createRatingSchema), async (req, res) => {
    try {
        const { doctorId, rating, comment } = req.body;
        const patientId = req.session.userId!;

        const newRating = await RatingRepo.create({ doctorId, patientId, rating, comment, createdAt: new Date(), updatedAt: new Date() });

        // ✅ Update doctor's average rating stats
        const stats = await RatingRepo.getDoctorStats(doctorId);
        await DoctorRepo.updateRatingStats(doctorId, stats.avgRating, stats.count);

        // ✅ Notify doctor of new rating
        await NotificationService.onRatingSubmitted({ doctorId, rating, comment, ratingId: newRating.id });

        logger.info(`Rating created: ${newRating.id} by patient ${patientId} for doctor ${doctorId}`);
        res.status(201).json(newRating);
    } catch (err: any) {
        res.status(400).json({ message: 'Failed to create rating', error: err.message });
    }
});

// Update a rating (only by the rating author)
router.put('/:id', requireAuth, validateBody(createRatingSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const existing = await RatingRepo.findById(id);
        if (!existing) return res.status(404).json({ message: 'Rating not found' });
        if (existing.patientId !== req.session.userId)
            return res.status(403).json({ message: 'You can only update your own ratings' });

        res.json(await RatingRepo.update(id, { rating, comment }));
    } catch (err: any) {
        res.status(400).json({ message: 'Failed to update rating', error: err.message });
    }
});

// Delete a rating (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await RatingRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Rating not found' });
        if (existing.patientId !== req.session.userId && req.session.userType !== 'admin')
            return res.status(403).json({ message: 'You can only delete your own ratings' });

        await RatingRepo.softDelete(req.params.id);
        res.json({ message: 'Rating deleted successfully' });
    } catch (err: any) {
        res.status(400).json({ message: 'Failed to delete rating', error: err.message });
    }
});

export default router;
