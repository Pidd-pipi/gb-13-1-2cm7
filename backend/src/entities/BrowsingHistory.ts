import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('browsing_history')
export class BrowsingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('idx_browse_user')
  userId: string;

  @Column()
  bookId: string;

  @CreateDateColumn()
  @Index('idx_browse_created')
  viewedAt: Date;
}
