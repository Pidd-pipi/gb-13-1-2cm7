import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { redisService } from '../services/redis.service';
import { emailService } from '../services/email.service';
import { config } from '../config';

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const authValidators = {
  sendCode: [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('studentId').notEmpty().withMessage('请输入学号'),
  ],
  register: [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('studentId').notEmpty().withMessage('请输入学号'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('验证码格式错误'),
  ],
  login: [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
};

export const sendVerificationCode = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, studentId } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  
  const existingUser = await userRepository.findOne({ where: [{ email }, { studentId }] });
  if (existingUser) {
    return res.status(400).json({ message: '用户已存在' });
  }

  const code = generateVerificationCode();
  await redisService.set(`verify:${email}`, code, 300);

  try {
    await emailService.sendVerificationCode(email, code);
  } catch (error) {
    return res.status(500).json({ message: '发送验证码失败' });
  }

  res.json({ message: '验证码已发送' });
};

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, studentId, password, code } = req.body;

  const storedCode = await redisService.get(`verify:${email}`);
  if (!storedCode || storedCode !== code) {
    return res.status(400).json({ message: '验证码错误或已过期' });
  }

  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOne({ where: [{ email }, { studentId }] });
  if (existingUser) {
    return res.status(400).json({ message: '用户已存在' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = userRepository.create({
    email,
    studentId,
    password: hashedPassword,
    isVerified: true,
  });

  await userRepository.save(user);
  await redisService.del(`verify:${email}`);

  const token = jwt.sign(
    { userId: user.id },
    config.jwt.secret as Secret,
    { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] },
  );

  res.status(201).json({
    message: '注册成功',
    token,
    user: {
      id: user.id,
      email: user.email,
      studentId: user.studentId,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: '邮箱或密码错误' });
  }

  const token = jwt.sign(
    { userId: user.id },
    config.jwt.secret as Secret,
    { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] },
  );

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      email: user.email,
      studentId: user.studentId,
      name: user.name,
      department: user.department,
      avatarUrl: user.avatarUrl,
      positiveRatingRate: user.positiveRatingRate,
    },
  });
};
