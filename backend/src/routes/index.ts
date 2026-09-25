import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { sendVerificationCode, register, login, authValidators } from '../controllers/auth.controller';
import { getCurrentUser, updateProfile, uploadAvatar, getUserReviews } from '../controllers/user.controller';
import {
  createBook,
  getBooks,
  getBookById,
  updateBookStatus,
  deleteBook,
  getMyBooks,
  getRecommendBooks,
} from '../controllers/book.controller';
import { toggleFavorite, getFavorites, getBrowsingHistory } from '../controllers/favorite.controller';
import {
  createPurchaseRequest,
  getPurchaseRequests,
  getMyPurchaseRequests,
  closePurchaseRequest,
} from '../controllers/purchaseRequest.controller';
import { sendMessage, getConversations, getMessages, getUnreadCount } from '../controllers/message.controller';
import { createReview, getUserReviews as getUserReviewsPublic } from '../controllers/review.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/auth/send-code', authValidators.sendCode, sendVerificationCode);
router.post('/auth/register', authValidators.register, register);
router.post('/auth/login', authValidators.login, login);

router.get('/user/me', authMiddleware, getCurrentUser);
router.put('/user/profile', authMiddleware, updateProfile);
router.post('/user/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);
router.get('/user/reviews', authMiddleware, getUserReviews);

router.get('/books', getBooks);
router.get('/books/:id', getBookById);
router.post('/books', authMiddleware, upload.array('images', 5), createBook);
router.put('/books/:id/status', authMiddleware, updateBookStatus);
router.delete('/books/:id', authMiddleware, deleteBook);
router.get('/my/books', authMiddleware, getMyBooks);
router.get('/recommend/books', authMiddleware, getRecommendBooks);

router.post('/favorites/toggle', authMiddleware, toggleFavorite);
router.get('/favorites', authMiddleware, getFavorites);
router.get('/browsing-history', authMiddleware, getBrowsingHistory);

router.get('/purchase-requests', getPurchaseRequests);
router.post('/purchase-requests', authMiddleware, createPurchaseRequest);
router.get('/my/purchase-requests', authMiddleware, getMyPurchaseRequests);
router.put('/purchase-requests/:id/close', authMiddleware, closePurchaseRequest);

router.post('/messages', authMiddleware, upload.array('images', 5), sendMessage);
router.get('/messages/conversations', authMiddleware, getConversations);
router.get('/messages', authMiddleware, getMessages);
router.get('/messages/unread-count', authMiddleware, getUnreadCount);

router.post('/reviews', authMiddleware, createReview);
router.get('/reviews/user/:userId', (req, res) => {
  void getUserReviewsPublic(req, res);
});

export default router;
