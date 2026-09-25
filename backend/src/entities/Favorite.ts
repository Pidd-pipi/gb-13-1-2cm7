import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, Index, Unique } from 'typeorm';
import { User } from './User';
import { Book } from './Book';

@Entity('favorites')
@Unique(['userId', 'bookId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.favorites)
  user: User;

  @Column()
  @Index('idx_fav_user')
  userId: string;

  @ManyToOne(() => Book, book => book.favorites)
  book: Book;

  @Column()
  bookId: string;

  @CreateDateColumn()
  createdAt: Date;
}
