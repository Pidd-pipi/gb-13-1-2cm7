import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Favorite } from '../entities/Favorite';
import { Book } from '../entities/Book';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const toggleFavorite = async (req: AuthenticatedRequest, res: Response) => {
  const { bookId } = req.body;

  const favoriteRepository = AppDataSource.getRepository(Favorite);
  const existing = await favoriteRepository.findOne({
    where: { userId: req.userId, bookId },
  });

  if (existing) {
    await favoriteRepository.delete({ id: existing.id });
    return res.json({ message: '已取消收藏', isFavorite: false });
  }

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id: bookId } });
  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  const favorite = favoriteRepository.create({
    userId: req.userId!,
    bookId,
  });
  await favoriteRepository.save(favorite);

  res.json({ message: '收藏成功', isFavorite: true });
};

export const getFavorites = async (req: AuthenticatedRequest, res: Response) => {
  const favoriteRepository = AppDataSource.getRepository(Favorite);
  const favorites = await favoriteRepository.find({
    where: { userId: req.userId },
    relations: ['book', 'book.seller'],
    order: { createdAt: 'DESC' },
    select: {
      book: {
        id: true,
        title: true,
        price: true,
        images: true,
        condition: true,
        status: true,
        seller: {
          id: true,
          name: true,
          department: true,
        },
      },
    },
  });

  res.json(favorites.map(f => f.book));
};

export const getBrowsingHistory = async (req: AuthenticatedRequest, res: Response) => {
  const historyRepository = AppDataSource.getRepository('BrowsingHistory');
  const histories = await historyRepository
    .createQueryBuilder('history')
    .innerJoinAndMapOne('history.book', 'Book', 'book', 'history.bookId = book.id')
    .innerJoinAndMapOne('book.seller', 'User', 'seller', 'book.sellerId = seller.id')
    .where('history.userId = :userId', { userId: req.userId })
    .orderBy('history.viewedAt', 'DESC')
    .take(50)
    .getMany();

  res.json(histories);
};
