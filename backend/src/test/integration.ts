/* eslint-disable */
// 端到端校验：成交 -> 确认收货 -> 双方互评 的完整规则。
// 使用 sql.js 内存数据库替换 MySQL，跑真实的 Express 路由与控制器。
process.env.NODE_ENV = 'test';

import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { AppDataSource } from '../config/database';
import { entities } from '../entities';
import express from 'express';
import routes from '../routes';
import { User } from '../entities/User';
import { Book } from '../entities/Book';
import { Message } from '../entities/Message';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// sqljs 不支持 MySQL 的 enum/timestamp，在内存库中映射为通用类型
for (const col of getMetadataArgsStorage().columns) {
  const opts = col.options as any;
  if (opts.type === 'enum') {
    opts.type = 'varchar';
    opts.enum = undefined;
  } else if (opts.type === 'timestamp') {
    opts.type = 'datetime';
  }
}

const sqlite = new DataSource({
  type: 'sqljs',
  location: ':memory:',
  autoSave: false,
  synchronize: true,
  entities,
  logging: false,
} as any);

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, cond: boolean, detail = '') => {
  results.push({ name, pass: cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const tokenFor = (id: string) => jwt.sign({ userId: id }, config.jwt.secret, { expiresIn: '1h' });

const seed = async () => {
  const userRepo = sqlite.getRepository(User);
  const seller = await userRepo.save(
    userRepo.create({
      studentId: 'S001',
      email: 'seller@x.edu',
      password: 'x',
      name: '卖家甲',
      department: '计算机',
    })
  );
  const buyer = await userRepo.save(
    userRepo.create({ studentId: 'B001', email: 'buyer@x.edu', password: 'x', name: '买家乙' })
  );
  const outsider = await userRepo.save(
    userRepo.create({ studentId: 'O001', email: 'out@x.edu', password: 'x', name: '路人丙' })
  );

  const bookRepo = sqlite.getRepository(Book);
  const book = await bookRepo.save(
    bookRepo.create({
      title: '算法导论',
      author: 'CLRS',
      originalPrice: 128,
      price: 40,
      condition: 'good',
      images: ['http://img/1.jpg'],
      tradeMethod: 'meetup',
      campus: '东区',
      category: 'science',
      sellerId: seller.id,
      status: 'available',
    })
  );

  // 另一个卖家的书，buyer 去聊过（不同的书）
  const otherBook = await bookRepo.save(
    bookRepo.create({
      title: '线性代数',
      author: '同济',
      originalPrice: 30,
      price: 10,
      condition: 'fair',
      images: ['http://img/2.jpg'],
      tradeMethod: 'meetup',
      campus: '西区',
      category: 'science',
      sellerId: outsider.id,
      status: 'available',
    })
  );

  const msgRepo = sqlite.getRepository(Message);
  // buyer 与 seller 围绕 book 聊过（双向各一条）
  await msgRepo.save([
    msgRepo.create({ senderId: buyer.id, receiverId: seller.id, bookId: book.id, content: '在吗' }),
    msgRepo.create({ senderId: seller.id, receiverId: buyer.id, bookId: book.id, content: '在' }),
    // buyer 与 outsider 围绕 otherBook 聊过
    msgRepo.create({ senderId: buyer.id, receiverId: outsider.id, bookId: otherBook.id, content: '书还在吗' }),
  ]);

  return { seller, buyer, outsider, book, otherBook };
};

const main = async () => {
  // 把内存库接到 AppDataSource
  (AppDataSource as any).manager = sqlite.manager;
  (AppDataSource as any).isInitialized = true;
  for (const key of Object.keys(AppDataSource)) {
    // @ts-ignore
    if (typeof (AppDataSource as any)[key] === 'function') {
      // @ts-ignore
      const orig = (AppDataSource as any)[key].bind(AppDataSource);
      // @ts-ignore
      (AppDataSource as any)[key] = (...args: any[]) => {
        const mapped = orig(...args);
        return mapped;
      };
    }
  }
  // getRepository / transaction 直接走 sqlite
  (AppDataSource as any).getRepository = (t: any) => sqlite.getRepository(t);
  (AppDataSource as any).transaction = (cb: any) => sqlite.transaction(cb as any);
  (AppDataSource as any).createQueryBuilder = (...args: any[]) => (sqlite as any).createQueryBuilder(...args);

  await sqlite.initialize();

  const { seller, buyer, outsider, book, otherBook } = await seed();

  const app = express();
  app.use(express.json());
  app.use('/api', routes);

  const server = app.listen(3999);
  const base = 'http://127.0.0.1:3999/api';
  const req = async (method: string, path: string, userId?: string, body?: any) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userId) headers.Authorization = `Bearer ${tokenFor(userId)}`;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  };

  // 1. 候选买家：只包含围绕该书聊过的 buyer，不含 outsider / seller
  const r1 = await req('GET', `/books/${book.id}/buyer-candidates`, seller.id);
  check('卖家可查询该书聊过的同学', r1.status === 200);
  check(
    '候选列表只含买家乙',
    Array.isArray(r1.json) && r1.json.length === 1 && r1.json[0].id === buyer.id,
    `got=${JSON.stringify(r1.json?.map((u: any) => u.id))}`
  );

  // 非卖家不能查候选
  const r1b = await req('GET', `/books/${book.id}/buyer-candidates`, outsider.id);
  check('非卖家查询候选被拒(403)', r1b.status === 403);

  // 2. 直接调旧状态接口标 sold 被拒绝
  const r2 = await req('PUT', `/books/${book.id}/status`, seller.id, { status: 'sold' });
  check('未指定买家直接标记售出被拒', r2.status === 400);

  // 3. 非卖家标记售出被拒
  const r3 = await req('POST', `/books/${book.id}/sold`, outsider.id, { buyerId: buyer.id });
  check('非卖家标记售出被拒(403)', r3.status === 403);

  // 4. 选择没聊过这本书的 outsider 被拒
  const r4 = await req('POST', `/books/${book.id}/sold`, seller.id, { buyerId: outsider.id });
  check('未就该书聊过天的买家被拒', r4.status === 400, r4.json?.message);

  // 5. 合法成交
  const r5 = await req('POST', `/books/${book.id}/sold`, seller.id, { buyerId: buyer.id });
  check('卖家从聊过的同学中选定买家成交', r5.status === 201, r5.json?.message);
  const txId = r5.json?.transaction?.id;
  check('返回交易记录 id', !!txId);

  // 书状态变为 sold
  const bookAfter = await sqlite.getRepository(Book).findOneBy({ id: book.id });
  check('书籍状态已更新为 sold', bookAfter?.status === 'sold');

  // 6. 重复成交被拒
  const r6 = await req('POST', `/books/${book.id}/sold`, seller.id, { buyerId: buyer.id });
  check('重复成交被拒', r6.status === 400);

  // 已成交的书不能删除、也不能改回其他状态
  const r6b = await req('DELETE', `/books/${book.id}`, seller.id);
  check('已成交书籍删除被拒', r6b.status === 400, r6b.json?.message);
  const r6c = await req('PUT', `/books/${book.id}/status`, seller.id, { status: 'available' });
  check('已成交书籍改状态被拒', r6c.status === 400);

  // 7. 确认收货前评价被拒（买卖双方都不行）
  const r7a = await req('POST', '/reviews', buyer.id, { transactionId: txId, type: 'positive' });
  check('未确认收货时买家评价被拒', r7a.status === 400, r7a.json?.message);
  const r7b = await req('POST', '/reviews', seller.id, { transactionId: txId, type: 'positive' });
  check('未确认收货时卖家评价被拒', r7b.status === 400);

  // 8. 非交易双方评价被拒
  const r8 = await req('POST', '/reviews', outsider.id, { transactionId: txId, type: 'positive' });
  check('非交易双方评价被拒(403)', r8.status === 403, r8.json?.message);

  // 9. 非买家确认收货被拒
  const r9 = await req('PUT', `/transactions/${txId}/confirm`, seller.id);
  check('卖家代替确认收货被拒(403)', r9.status === 403);

  // 10. 买家确认收货
  const r10 = await req('PUT', `/transactions/${txId}/confirm`, buyer.id);
  check('买家确认收货成功', r10.status === 200, r10.json?.message);
  check('交易状态为 completed', r10.json?.transaction?.status === 'completed');

  // 重复确认
  const r10b = await req('PUT', `/transactions/${txId}/confirm`, buyer.id);
  check('重复确认收货被拒', r10b.status === 400);

  // 11. 买家评价卖家（好评）
  const r11 = await req('POST', '/reviews', buyer.id, {
    transactionId: txId,
    type: 'positive',
    content: '书很新',
  });
  check('买家评价卖家成功', r11.status === 201);

  // 好评率随首次评价更新：seller 1 条评价、100%
  const sellerAfter = await sqlite.getRepository(User).findOneBy({ id: seller.id });
  check(
    '卖家好评率随首评更新为 100%',
    sellerAfter!.totalReviews === 1 && sellerAfter!.positiveReviews === 1 && Number(sellerAfter!.positiveRatingRate) === 100,
    `total=${sellerAfter!.totalReviews} pos=${sellerAfter!.positiveReviews} rate=${sellerAfter!.positiveRatingRate}`
  );

  // 重复评价被拒
  const r11b = await req('POST', '/reviews', buyer.id, { transactionId: txId, type: 'negative' });
  check('买家重复评价被拒', r11b.status === 400, r11b.json?.message);

  // 12. 卖家评价买家（差评）
  const r12 = await req('POST', '/reviews', seller.id, {
    transactionId: txId,
    type: 'negative',
    content: '爽约一次',
  });
  check('卖家评价买家成功', r12.status === 201);
  const buyerAfter = await sqlite.getRepository(User).findOneBy({ id: buyer.id });
  check(
    '买家收到差评，好评率 0%',
    buyerAfter!.totalReviews === 1 && buyerAfter!.positiveReviews === 0 && Number(buyerAfter!.positiveRatingRate) === 0,
    `rate=${buyerAfter!.positiveRatingRate}`
  );
  // 卖家也不能重复
  const r12b = await req('POST', '/reviews', seller.id, { transactionId: txId, type: 'neutral' });
  check('卖家重复评价被拒', r12b.status === 400);

  // 13. 我的交易：买家视角
  const r13 = await req('GET', '/my/transactions', buyer.id);
  const buyerTx = r13.json?.transactions?.find((t: any) => t.id === txId);
  check(
    '买家看到交易且双方评价状态正确',
    r13.status === 200 &&
      buyerTx?.role === 'buyer' &&
      buyerTx?.buyerReviewed === true &&
      buyerTx?.sellerReviewed === true &&
      buyerTx?.canReview === false,
    JSON.stringify(buyerTx && { role: buyerTx.role, b: buyerTx.buyerReviewed, s: buyerTx.sellerReviewed })
  );

  // 14. 我的交易：卖家视角
  const r14 = await req('GET', '/my/transactions', seller.id);
  const sellerTx = r14.json?.transactions?.find((t: any) => t.id === txId);
  check(
    '卖家看到交易 role=seller 且书信息正确',
    sellerTx?.role === 'seller' && sellerTx?.book?.title === '算法导论' && sellerTx?.book?.cover === 'http://img/1.jpg',
    JSON.stringify(sellerTx?.book)
  );

  // 15. 评价不存在的交易
  const r15 = await req('POST', '/reviews', buyer.id, {
    transactionId: '00000000-0000-0000-0000-000000000000',
    type: 'positive',
  });
  check('评价不存在的交易被拒(404)', r15.status === 404);

  // 16. outsider 围绕 otherBook 与 outsider? seller 身份的边界：
  // outsider 作为 otherBook 卖家，试图把买自己书的 buyer 选错到 book 上 —— 已在 #4 覆盖。
  // 额外：buyer 就 otherBook 被 outsider 成交，验证各交易互不干扰
  const r16 = await req('POST', `/books/${otherBook.id}/sold`, outsider.id, { buyerId: buyer.id });
  check('另一本书可独立成交', r16.status === 201);
  const tx2 = r16.json?.transaction?.id;
  await req('PUT', `/transactions/${tx2}/confirm`, buyer.id);
  // buyer 对 tx2 的卖家 outsider 留好评
  await req('POST', '/reviews', buyer.id, { transactionId: tx2, type: 'positive' });
  const outsiderAfter = await sqlite.getRepository(User).findOneBy({ id: outsider.id });
  check('路人卖家好评率独立统计为 100%', outsiderAfter!.totalReviews === 1 && Number(outiderSafe(outsiderAfter)) === 100);
  // buyer 此时累计：差评1（来自 seller）—— 好评率不受自己发出的评价影响
  const buyerFinal = await sqlite.getRepository(User).findOneBy({ id: buyer.id });
  check('买家好评率只统计收到的评价(仍 0%)', Number(buyerFinal!.positiveRatingRate) === 0);

  // 待评价数：seller 对 tx2 无分，但 seller 不是 tx2 当事方之一？是 outsider&buyer。buyer 已评 tx2，outsider 未评
  const rOut = await req('GET', '/my/transactions', outsider.id);
  check(
    '路人卖家有待评价记录计数=1',
    rOut.json?.pendingReviewCount === 1 &&
      rOut.json.transactions.find((t: any) => t.id === tx2)?.canReview === true,
    `count=${rOut.json?.pendingReviewCount}`
  );

  server.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED:', failed.map(f => f.name).join('; '));
    process.exit(1);
  }
  process.exit(0);
};

function outiderSafe(u: User | null) {
  return u ? u.positiveRatingRate : -1;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
