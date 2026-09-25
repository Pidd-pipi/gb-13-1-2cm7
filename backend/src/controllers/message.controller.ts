import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Message } from '../entities/Message';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { minioService } from '../services/minio.service';

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  const { receiverId, bookId, content } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!content && (!files || files.length === 0)) {
    return res.status(400).json({ message: '消息内容不能为空' });
  }

  try {
    let imageUrls: string[] | undefined;
    if (files && files.length > 0) {
      imageUrls = [];
      for (const file of files) {
        const objectName = `messages/${req.userId}-${Date.now()}-${file.originalname}`;
        const url = await minioService.uploadFile(file.buffer, objectName, file.mimetype);
        imageUrls.push(url);
      }
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const newMessage = messageRepository.create({
      senderId: req.userId!,
      receiverId,
      bookId,
      content: content || '',
      imageUrls,
    });

    await messageRepository.save(newMessage);
    res.status(201).json({ message: '发送成功', data: newMessage });
  } catch (error) {
    res.status(500).json({ message: '发送失败' });
  }
};

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  const messageRepository = AppDataSource.getRepository(Message);
  const userId = req.userId!;

  const messages = await messageRepository
    .createQueryBuilder('message')
    .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
    .orderBy('message.createdAt', 'DESC')
    .getMany();

  const conversationMap = new Map<string, Message>();
  messages.forEach((msg) => {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const key = `${otherId}-${msg.bookId || 'general'}`;
    if (!conversationMap.has(key)) {
      conversationMap.set(key, msg);
    }
  });

  res.json(Array.from(conversationMap.values()));
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  const { otherUserId, bookId } = req.query;

  const messageRepository = AppDataSource.getRepository(Message);
  const userId = req.userId!;

  const where: any = [
    { senderId: userId, receiverId: otherUserId },
    { senderId: otherUserId, receiverId: userId },
  ];

  if (bookId) {
    where.forEach((w: any) => (w.bookId = bookId));
  }

  const messages = await messageRepository.find({
    where,
    order: { createdAt: 'ASC' },
  });

  await messageRepository.update(
    { receiverId: userId, senderId: otherUserId as string, isRead: false },
    { isRead: true }
  );

  res.json(messages);
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
  const messageRepository = AppDataSource.getRepository(Message);
  const count = await messageRepository.count({
    where: { receiverId: req.userId, isRead: false },
  });

  res.json({ count });
};
