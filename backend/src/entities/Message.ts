import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';
import { Book } from './Book';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  imageUrls: string[];

  @ManyToOne(() => User, user => user.sentMessages)
  sender: User;

  @Column()
  @Index('idx_msg_sender')
  senderId: string;

  @ManyToOne(() => User, user => user.receivedMessages)
  receiver: User;

  @Column()
  @Index('idx_msg_receiver')
  receiverId: string;

  @ManyToOne(() => Book, book => book.messages, { nullable: true })
  book: Book;

  @Column({ nullable: true })
  bookId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  @Index('idx_msg_created')
  createdAt: Date;
}
