import { Request, Response } from 'express';
import { In, ILike, FindOperator, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Book, BookStatus, SubjectCategory, BookCondition } from '../entities/Book';
import { User } from '../entities/User';
import { Favorite } from '../entities/Favorite';
import { BrowsingHistory } from '../entities/BrowsingHistory';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { minioService } from '../services/minio.service';

export const createBook = async (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    author,
    isbn,
    originalPrice,
    price,
    condition,
    tradeMethod,
    campus,
    category,
    description,
  } = req.body;

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: '请上传至少一张图片' });
  }
  if (files.length > 5) {
    return res.status(400).json({ message: '最多上传5张图片' });
  }

  try {
    const imageUrls: string[] = [];
    for (const file of files) {
      const objectName = `books/${req.userId}-${Date.now()}-${file.originalname}`;
      const url = await minioService.uploadFile(file.buffer, objectName, file.mimetype);
      imageUrls.push(url);
    }

    const bookRepository = AppDataSource.getRepository(Book);
    const book = bookRepository.create({
      title,
      author,
      isbn,
      originalPrice: parseFloat(originalPrice),
      price: parseFloat(price),
      condition,
      images: imageUrls,
      tradeMethod,
      campus,
      category,
      description,
      sellerId: req.userId!,
      status: 'available' as BookStatus,
    });

    await bookRepository.save(book);
    res.status(201).json({ message: '发布成功', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '发布失败' });
  }
};

export const getBooks = async (req: Request, res: Response) => {
  const {
    keyword,
    category,
    minPrice,
    maxPrice,
    condition,
    sort = 'createdAt',
    order = 'DESC',
    page = 1,
    limit = 20,
  } = req.query;

  const bookRepository = AppDataSource.getRepository(Book);
  const where: any = { status: 'available' };

  if (keyword) {
    where.title = ILike(`%${keyword}%`);
  }
  if (category) {
    where.category = category as SubjectCategory;
  }
  if (condition) {
    where.condition = condition as BookCondition;
  }
  if (minPrice || maxPrice) {
    if (minPrice && maxPrice) {
      where.price = Between(parseFloat(minPrice as string), parseFloat(maxPrice as string));
    } else if (minPrice) {
      where.price = MoreThanOrEqual(parseFloat(minPrice as string));
    } else {
      where.price = LessThanOrEqual(parseFloat(maxPrice as string));
    }
  }

  const [books, total] = await bookRepository.findAndCount({
    where,
    relations: ['seller'],
    order: { [sort as string]: order as 'ASC' | 'DESC' },
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    take: parseInt(limit as string),
    select: {
      seller: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        positiveRatingRate: true,
      },
    },
  });

  res.json({
    books,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
};

export const getBookById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as AuthenticatedRequest).userId;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({
    where: { id },
    relations: ['seller'],
    select: {
      seller: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        contactInfo: true,
        positiveRatingRate: true,
        totalReviews: true,
      },
    },
  });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (userId && userId !== book.sellerId) {
    const historyRepository = AppDataSource.getRepository(BrowsingHistory);
    const history = historyRepository.create({
      userId,
      bookId: book.id,
    });
    await historyRepository.save(history);
  }

  res.json(book);
};

export const updateBookStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  book.status = status;
  await bookRepository.save(book);

  res.json({ message: '状态更新成功', book });
};

export const deleteBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  await bookRepository.delete({ id });
  res.json({ message: '删除成功' });
};

export const getMyBooks = async (req: AuthenticatedRequest, res: Response) => {
  const bookRepository = AppDataSource.getRepository(Book);
  const books = await bookRepository.find({
    where: { sellerId: req.userId },
    order: { createdAt: 'DESC' },
  });

  res.json(books);
};

export const getRecommendBooks = async (req: AuthenticatedRequest, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  const bookRepository = AppDataSource.getRepository(Book);
  let books: Book[];

  if (user?.department) {
    books = await bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.seller', 'seller')
      .where('book.status = :status', { status: 'available' })
      .andWhere('book.sellerId != :userId', { userId: req.userId })
      .andWhere('seller.department = :department', { department: user.department })
      .orderBy('book.createdAt', 'DESC')
      .take(10)
      .getMany();
  } else {
    books = await bookRepository.find({
      where: { status: 'available' },
      relations: ['seller'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  res.json(books);
};
