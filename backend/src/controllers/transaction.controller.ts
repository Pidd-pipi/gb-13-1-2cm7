import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

// 买家确认收货
export const confirmTransaction = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepository.findOne({ where: { id } });

  if (!transaction) {
    return res.status(404).json({ message: '交易不存在' });
  }

  if (transaction.buyerId !== req.userId) {
    return res.status(403).json({ message: '只有买家可以确认收货' });
  }

  if (transaction.status === 'completed') {
    return res.status(400).json({ message: '请勿重复确认收货' });
  }

  transaction.status = 'completed';
  transaction.confirmedAt = new Date();
  await transactionRepository.save(transaction);

  res.json({ message: '确认收货成功，现在可以评价对方了', transaction });
};

// 我的交易记录（买到的 + 卖出的），包含双方评价状态
export const getMyTransactions = async (req: AuthenticatedRequest, res: Response) => {
  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transactions = await transactionRepository.find({
    where: [{ sellerId: req.userId }, { buyerId: req.userId }],
    relations: ['book', 'seller', 'buyer'],
    order: { createdAt: 'DESC' },
    select: {
      book: {
        id: true,
        title: true,
        price: true,
        images: true,
        status: true,
      },
      seller: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      buyer: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  });

  res.json(transactions);
};
