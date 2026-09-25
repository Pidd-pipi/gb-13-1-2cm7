/**
 * 成交-评价流程集成测试
 * 使用 sql.js 内存数据库 + 真实实体与控制器，验证：
 * 1. 卖家标记售出时必须从聊过这本书的同学中选定买家
 * 2. 买家确认收货后双方各有一次评价机会
 * 3. 未成交 / 非交易双方 / 重复提交均被拒绝
 * 4. 好评率随首次评价更新
 *
 * 运行：npx ts-node --transpile-only scripts/integration-test.ts
 */
import 'reflect-metadata';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { entities } from '../src/entities';
import { User } from '../src/entities/User';
import { Book } from '../src/entities/Book';
import { Message } from '../src/entities/Message';
import { Transaction } from '../src/entities/Transaction';

// sql.js 不支持 MySQL 的 enum 列，测试时映射为 varchar（仅影响测试环境）
getMetadataArgsStorage().columns.forEach((col) => {
  if (col.options.type === 'enum') {
    (col.options as any).type = 'varchar';
    (col.options as any).length = 50;
    delete (col.options as any).enum;
  }
});

// 用内存库替换全局 AppDataSource（控制器在调用时才取 repository，替换生效）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const databaseModule = require('../src/config/database');

let passed = 0;
let failed = 0;

const check = (name: string, cond: boolean, extra?: any) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
};

const mockRes = () => {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
};

const req = (userId: string, params: any = {}, body: any = {}, query: any = {}) =>
  ({ userId, params, body, query } as any);

async function main() {
  const dataSource = new DataSource({
    type: 'sqljs',
    autoSave: false,
    synchronize: true,
    logging: false,
    entities,
  });
  await dataSource.initialize();
  databaseModule.AppDataSource = dataSource;

  // 替换后再加载控制器，确保拿到同一个模块实例
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bookController = require('../src/controllers/book.controller');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reviewController = require('../src/controllers/review.controller');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const transactionController = require('../src/controllers/transaction.controller');

  const userRepo = dataSource.getRepository(User);
  const bookRepo = dataSource.getRepository(Book);
  const messageRepo = dataSource.getRepository(Message);
  const txRepo = dataSource.getRepository(Transaction);

  // ---------- 准备数据 ----------
  const seller = await userRepo.save(userRepo.create({
    studentId: 'S001', email: 'seller@campus.edu', password: 'x', name: '卖家小王', isVerified: true,
  }));
  const buyer = await userRepo.save(userRepo.create({
    studentId: 'S002', email: 'buyer@campus.edu', password: 'x', name: '买家小李', isVerified: true,
  }));
  const stranger = await userRepo.save(userRepo.create({
    studentId: 'S003', email: 'stranger@campus.edu', password: 'x', name: '路人小张', isVerified: true,
  }));

  const book = await bookRepo.save(bookRepo.create({
    title: '高等数学（第七版）', author: '同济大学', originalPrice: 45, price: 20,
    condition: 'good', images: ['http://img/1.jpg'], tradeMethod: 'meetup',
    campus: '主校区', category: 'science', status: 'available', sellerId: seller.id,
  }));

  const bookNoChat = await bookRepo.save(bookRepo.create({
    title: '大学英语', author: '外教社', originalPrice: 38, price: 15,
    condition: 'new', images: ['http://img/2.jpg'], tradeMethod: 'shipping',
    campus: '主校区', category: 'humanities', status: 'available', sellerId: seller.id,
  }));

  console.log('\n【1】标记售出必须选定聊过这本书的买家');

  let res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'sold' }), res);
  check('缺少 buyerId 被拒绝', res.statusCode === 400, res.body);

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'sold', buyerId: buyer.id }), res);
  check('买家没聊过这本书被拒绝', res.statusCode === 400, res.body);

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'sold', buyerId: seller.id }), res);
  check('不能选自己当买家', res.statusCode === 400, res.body);

  // 买家就这本书联系卖家
  await messageRepo.save(messageRepo.create({
    senderId: buyer.id, receiverId: seller.id, bookId: book.id, content: '这本书还在吗？',
  }));

  res = mockRes();
  await bookController.getBookChatUsers(req(seller.id, { id: book.id }), res);
  check('候选买家列表只包含聊过这本书的同学',
    res.statusCode === 200 && res.body.length === 1 && res.body[0].id === buyer.id, res.body);

  res = mockRes();
  await bookController.getBookChatUsers(req(stranger.id, { id: book.id }), res);
  check('非卖家不能查看候选买家', res.statusCode === 403, res.body);

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'sold', buyerId: buyer.id }), res);
  check('选定聊过的买家后标记售出成功', res.statusCode === 200, res.body);

  let tx = await txRepo.findOne({ where: { bookId: book.id } });
  check('生成待确认的交易记录', !!tx && tx.status === 'pending_confirm' && tx.buyerId === buyer.id && tx.sellerId === seller.id);
  const freshBook = await bookRepo.findOne({ where: { id: book.id } });
  check('书籍状态变为已售出', freshBook?.status === 'sold');

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'sold', buyerId: buyer.id }), res);
  check('重复标记售出被拒绝', res.statusCode === 400, res.body);

  console.log('\n【2】确认收货前不能评价');

  res = mockRes();
  await reviewController.createReview(req(buyer.id, {}, { bookId: book.id, type: 'positive', content: '书很新' }), res);
  check('买家确认收货前评价被拒绝', res.statusCode === 400, res.body);

  console.log('\n【3】确认收货');

  res = mockRes();
  await transactionController.confirmTransaction(req(seller.id, { id: tx!.id }), res);
  check('卖家不能确认收货', res.statusCode === 403, res.body);

  res = mockRes();
  await transactionController.confirmTransaction(req(stranger.id, { id: tx!.id }), res);
  check('无关人员不能确认收货', res.statusCode === 403, res.body);

  res = mockRes();
  await transactionController.confirmTransaction(req(buyer.id, { id: tx!.id }), res);
  check('买家确认收货成功', res.statusCode === 200, res.body);

  res = mockRes();
  await transactionController.confirmTransaction(req(buyer.id, { id: tx!.id }), res);
  check('重复确认收货被拒绝', res.statusCode === 400, res.body);

  console.log('\n【4】评价权限与一次性');

  res = mockRes();
  await reviewController.createReview(req(stranger.id, {}, { bookId: book.id, type: 'positive' }), res);
  check('非交易双方评价被拒绝', res.statusCode === 403, res.body);

  res = mockRes();
  await reviewController.createReview(req(buyer.id, {}, { bookId: bookNoChat.id, type: 'positive' }), res);
  check('未成交的书籍评价被拒绝', res.statusCode === 400, res.body);

  res = mockRes();
  await reviewController.createReview(req(buyer.id, {}, { bookId: book.id, type: 'positive', content: '书很新，交易愉快' }), res);
  check('买家评价卖家成功', res.statusCode === 201, res.body);

  let sellerFresh = await userRepo.findOne({ where: { id: seller.id } });
  check('卖家好评率随首次评价更新为 100',
    sellerFresh!.totalReviews === 1 && Number(sellerFresh!.positiveRatingRate) === 100,
    { total: sellerFresh!.totalReviews, rate: sellerFresh!.positiveRatingRate });

  res = mockRes();
  await reviewController.createReview(req(buyer.id, {}, { bookId: book.id, type: 'negative' }), res);
  check('买家重复评价被拒绝', res.statusCode === 400, res.body);

  res = mockRes();
  await reviewController.createReview(req(seller.id, {}, { bookId: book.id, type: 'negative', content: '买家迟到' }), res);
  check('卖家回评买家成功', res.statusCode === 201, res.body);

  const buyerFresh = await userRepo.findOne({ where: { id: buyer.id } });
  check('买家收到差评后好评率为 0',
    buyerFresh!.totalReviews === 1 && Number(buyerFresh!.positiveRatingRate) === 0,
    { total: buyerFresh!.totalReviews, rate: buyerFresh!.positiveRatingRate });

  res = mockRes();
  await reviewController.createReview(req(seller.id, {}, { bookId: book.id, type: 'positive' }), res);
  check('卖家重复评价被拒绝', res.statusCode === 400, res.body);

  console.log('\n【5】个人中心交易记录与双方评价状态');

  res = mockRes();
  await transactionController.getMyTransactions(req(buyer.id), res);
  const buyerTx = res.body?.[0];
  check('买家能看到交易记录及双方评价状态',
    res.statusCode === 200 && buyerTx && buyerTx.buyerReviewed === true && buyerTx.sellerReviewed === true
    && buyerTx.book?.title === '高等数学（第七版）' && buyerTx.seller?.name === '卖家小王', res.body);

  res = mockRes();
  await transactionController.getMyTransactions(req(stranger.id), res);
  check('无关人员没有交易记录', res.statusCode === 200 && res.body.length === 0, res.body);

  console.log('\n【6】取消未完成的交易');

  await messageRepo.save(messageRepo.create({
    senderId: buyer.id, receiverId: seller.id, bookId: bookNoChat.id, content: '英语书还有吗',
  }));
  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: bookNoChat.id }, { status: 'sold', buyerId: buyer.id }), res);
  check('第二本书标记售出成功', res.statusCode === 200, res.body);

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: bookNoChat.id }, { status: 'available' }), res);
  check('未确认收货前可恢复可购买（交易取消）', res.statusCode === 200, res.body);
  const cancelledTx = await txRepo.findOne({ where: { bookId: bookNoChat.id } });
  check('取消后交易记录已删除', cancelledTx === null);

  res = mockRes();
  await bookController.updateBookStatus(req(seller.id, { id: book.id }, { status: 'available' }), res);
  check('已完成的交易不能恢复状态', res.statusCode === 400, res.body);

  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  await dataSource.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('测试执行出错：', err);
  process.exit(1);
});
