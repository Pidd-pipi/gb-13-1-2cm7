import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { PurchaseRequest, SubjectCategory } from '../entities/PurchaseRequest';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createPurchaseRequest = async (req: AuthenticatedRequest, res: Response) => {
  const {
    bookTitle,
    author,
    isbn,
    expectedPrice,
    conditions,
    description,
    category,
    campus,
  } = req.body;

  const requestRepository = AppDataSource.getRepository(PurchaseRequest);
  const request = requestRepository.create({
    bookTitle,
    author,
    isbn,
    expectedPrice: expectedPrice ? parseFloat(expectedPrice) : undefined,
    conditions,
    description,
    category,
    campus,
    requesterId: req.userId!,
  });

  await requestRepository.save(request);
  res.status(201).json({ message: '求购信息发布成功', request });
};

export const getPurchaseRequests = async (req: Request, res: Response) => {
  const { category, campus, page = 1, limit = 20 } = req.query;

  const where: any = { status: 'active' };
  if (category) {
    where.category = category as SubjectCategory;
  }
  if (campus) {
    where.campus = campus;
  }

  const requestRepository = AppDataSource.getRepository(PurchaseRequest);
  const [requests, total] = await requestRepository.findAndCount({
    where,
    relations: ['requester'],
    order: { createdAt: 'DESC' },
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    take: parseInt(limit as string),
    select: {
      requester: {
        id: true,
        name: true,
        department: true,
        avatarUrl: true,
        contactInfo: true,
      },
    },
  });

  res.json({
    requests,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
};

export const getMyPurchaseRequests = async (req: AuthenticatedRequest, res: Response) => {
  const requestRepository = AppDataSource.getRepository(PurchaseRequest);
  const requests = await requestRepository.find({
    where: { requesterId: req.userId },
    order: { createdAt: 'DESC' },
  });

  res.json(requests);
};

export const closePurchaseRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const requestRepository = AppDataSource.getRepository(PurchaseRequest);
  const request = await requestRepository.findOne({ where: { id } });

  if (!request) {
    return res.status(404).json({ message: '求购信息不存在' });
  }

  if (request.requesterId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  request.status = 'closed';
  await requestRepository.save(request);

  res.json({ message: '求购信息已关闭' });
};
