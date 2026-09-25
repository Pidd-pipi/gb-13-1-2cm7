import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Book } from './Book';
import { Message } from './Message';
import { Review } from './Review';
import { Favorite } from './Favorite';
import { PurchaseRequest } from './PurchaseRequest';

export type UserRole = 'student' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  studentId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  contactInfo: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: ['student', 'admin'], default: 'student' })
  role: UserRole;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  positiveRatingRate: number;

  @Column({ default: 0 })
  totalReviews: number;

  @Column({ default: 0 })
  positiveReviews: number;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Book, book => book.seller)
  books: Book[];

  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, message => message.receiver)
  receivedMessages: Message[];

  @OneToMany(() => Review, review => review.reviewer)
  givenReviews: Review[];

  @OneToMany(() => Review, review => review.reviewee)
  receivedReviews: Review[];

  @OneToMany(() => Favorite, favorite => favorite.user)
  favorites: Favorite[];

  @OneToMany(() => PurchaseRequest, request => request.requester)
  purchaseRequests: PurchaseRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
