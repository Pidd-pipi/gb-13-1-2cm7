import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Review } from '../entities/Review';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { minioService } from '../services/minio.service';

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: req.userId },
    select: ['id', 'email', 'studentId', 'name', 'department', 'contactInfo', 'avatarUrl', 'positiveRatingRate', 'totalReviews', 'createdAt'],
  });

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  res.json(user);
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, department, contactInfo } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (name) user.name = name;
  if (department) user.department = department;
  if (contactInfo) user.contactInfo = contactInfo;

  await userRepository.save(user);

  res.json({ message: '资料更新成功', user });
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: '请上传文件' });
  }

  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.userId } });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const objectName = `avatars/${req.userId}-${Date.now()}-${file.originalname}`;
    const avatarUrl = await minioService.uploadFile(file.buffer, objectName, file.mimetype);

    user.avatarUrl = avatarUrl;
    await userRepository.save(user);

    res.json({ message: '头像上传成功', avatarUrl });
  } catch (error) {
    res.status(500).json({ message: '上传失败' });
  }
};

export const getUserReviews = async (req: AuthenticatedRequest, res: Response) => {
  const reviewRepository = AppDataSource.getRepository(Review);
  const reviews = await reviewRepository.find({
    where: { revieweeId: req.userId },
    relations: ['reviewer'],
    order: { createdAt: 'DESC' },
    select: {
      id: true,
      type: true,
      content: true,
      createdAt: true,
      reviewer: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  });

  res.json(reviews);
};
