import nodemailer from 'nodemailer';
import { config } from '../config';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const mailOptions = {
      from: config.smtp.from,
      to,
      subject: '校园二手书交易平台 - 邮箱验证码',
      text: `您的验证码是：${code}，5分钟内有效。`,
      html: `<p>您的验证码是：<strong>${code}</strong>，5分钟内有效。</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('发送邮件失败');
    }
  }
}

export const emailService = new EmailService();
