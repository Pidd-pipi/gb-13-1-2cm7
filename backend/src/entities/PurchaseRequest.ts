import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';

export type SubjectCategory = 'science' | 'humanities' | 'business' | 'arts' | 'other';
export type RequestStatus = 'active' | 'closed';

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bookTitle: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  isbn: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expectedPrice: number;

  @Column({ type: 'simple-array', nullable: true })
  conditions: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['science', 'humanities', 'business', 'arts', 'other'] })
  @Index('idx_request_category')
  category: SubjectCategory;

  @Column()
  campus: string;

  @Column({ type: 'enum', enum: ['active', 'closed'], default: 'active' })
  status: RequestStatus;

  @ManyToOne(() => User, user => user.purchaseRequests)
  requester: User;

  @Column()
  @Index('idx_request_requester')
  requesterId: string;

  @CreateDateColumn()
  @Index('idx_request_created')
  createdAt: Date;
}
