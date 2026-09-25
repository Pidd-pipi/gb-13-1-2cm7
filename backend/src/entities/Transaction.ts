import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { User } from './User';
import { Book } from './Book';

export type TransactionStatus = 'pending_confirm' | 'completed';

@Entity('transactions')
@Unique(['bookId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Book)
  book: Book;

  @Column()
  @Index('idx_transaction_book')
  bookId: string;

  @ManyToOne(() => User)
  seller: User;

  @Column()
  @Index('idx_transaction_seller')
  sellerId: string;

  @ManyToOne(() => User)
  buyer: User;

  @Column()
  @Index('idx_transaction_buyer')
  buyerId: string;

  // pending_confirm: 卖家已选定买家，等待买家确认收货
  // completed: 买家已确认收货，双方可互评
  @Column({ type: 'enum', enum: ['pending_confirm', 'completed'], default: 'pending_confirm' })
  @Index('idx_transaction_status')
  status: TransactionStatus;

  @Column({ default: false })
  sellerReviewed: boolean;

  @Column({ default: false })
  buyerReviewed: boolean;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
