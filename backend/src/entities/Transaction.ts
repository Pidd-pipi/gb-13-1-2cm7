import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User';
import { Book } from './Book';

export type TransactionStatus = 'sold' | 'completed';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Book)
  @JoinColumn()
  book: Book;

  @Column({ unique: true })
  bookId: string;

  @ManyToOne(() => User, user => user.soldTransactions)
  seller: User;

  @Column()
  @Index('idx_tx_seller')
  sellerId: string;

  @ManyToOne(() => User, user => user.boughtTransactions)
  buyer: User;

  @Column()
  @Index('idx_tx_buyer')
  buyerId: string;

  // sold: 卖家已标记售出，等待买家确认收货；completed: 买家已确认
  @Column({ type: 'enum', enum: ['sold', 'completed'], default: 'sold' })
  @Index('idx_tx_status')
  status: TransactionStatus;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
