import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, Unique } from 'typeorm';
import { User } from './User';

export type ReviewType = 'positive' | 'neutral' | 'negative';

@Entity('reviews')
@Unique(['reviewerId', 'revieweeId', 'bookId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.givenReviews)
  reviewer: User;

  @Column()
  @Index('idx_review_reviewer')
  reviewerId: string;

  @ManyToOne(() => User, user => user.receivedReviews)
  reviewee: User;

  @Column()
  @Index('idx_review_reviewee')
  revieweeId: string;

  @Column({ nullable: true })
  bookId: string;

  @Column({ type: 'enum', enum: ['positive', 'neutral', 'negative'] })
  type: ReviewType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
