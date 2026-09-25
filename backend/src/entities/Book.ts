import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from './User';
import { Favorite } from './Favorite';
import { Message } from './Message';

export type BookCondition = 'new' | 'like_new' | 'good' | 'fair';
export type BookStatus = 'available' | 'reserved' | 'sold';
export type TradeMethod = 'meetup' | 'shipping';
export type SubjectCategory = 'science' | 'humanities' | 'business' | 'arts' | 'other';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('idx_book_title')
  title: string;

  @Column()
  @Index('idx_book_author')
  author: string;

  @Column({ nullable: true })
  @Index('idx_book_isbn')
  isbn: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Index('idx_book_price')
  price: number;

  @Column({ type: 'enum', enum: ['new', 'like_new', 'good', 'fair'] })
  condition: BookCondition;

  @Column('simple-array')
  images: string[];

  @Column({ type: 'enum', enum: ['meetup', 'shipping'] })
  tradeMethod: TradeMethod;

  @Column()
  campus: string;

  @Column({ type: 'enum', enum: ['science', 'humanities', 'business', 'arts', 'other'] })
  @Index('idx_book_category')
  category: SubjectCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['available', 'reserved', 'sold'], default: 'available' })
  @Index('idx_book_status')
  status: BookStatus;

  @ManyToOne(() => User, user => user.books)
  seller: User;

  @Column()
  sellerId: string;

  @OneToMany(() => Favorite, favorite => favorite.book)
  favorites: Favorite[];

  @OneToMany(() => Message, message => message.book)
  messages: Message[];

  @CreateDateColumn()
  @Index('idx_book_created')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
