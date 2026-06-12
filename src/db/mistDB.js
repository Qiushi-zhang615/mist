import Dexie from 'dexie'

/**
 * mist 数据库
 * 使用 Dexie.js 封装 IndexedDB
 */
class MistDatabase extends Dexie {
  constructor() {
    super('mist_database')
    
    this.version(1).stores({
      mistakes: '++id, subject, knowledgePoint, difficulty, mastery, createdAt, updatedAt, nextReviewAt',
      knowledgeTree: '++id, subject, parentId, name, order',
      settings: 'key',
      reviewLogs: '++id, mistakeId, reviewedAt, result'
    })
    
    this.mistakes = this.table('mistakes')
    this.knowledgeTree = this.table('knowledgeTree')
    this.settings = this.table('settings')
    this.reviewLogs = this.table('reviewLogs')
  }
}

export const mistDB = new MistDatabase()

/**
 * 艾宾浩斯遗忘曲线复习间隔（天）
 * 1, 2, 4, 7, 15, 30
 */
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]

/**
 * 计算下次复习时间
 * @param {number} reviewCount - 已复习次数
 * @param {Date} baseDate - 基准日期
 * @returns {Date}
 */
export function calcNextReview(reviewCount, baseDate = new Date()) {
  const interval = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)]
  const next = new Date(baseDate)
  next.setDate(next.getDate() + interval)
  return next
}

/**
 * 获取今日待复习错题
 */
export async function getTodayReviews() {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  
  return await mistDB.mistakes
    .where('nextReviewAt')
    .belowOrEqual(now)
    .and(m => m.mastery < 100)
    .toArray()
}

/**
 * 获取待复习数量
 */
export async function getReviewStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const allPending = await mistDB.mistakes
    .where('nextReviewAt')
    .belowOrEqual(new Date())
    .and(m => m.mastery < 100)
    .count()
    
  const todayCount = await mistDB.mistakes
    .where('nextReviewAt')
    .between(today, tomorrow)
    .and(m => m.mastery < 100)
    .count()
    
  return { today: todayCount, total: allPending }
}

/**
 * 记录复习结果
 * @param {number} mistakeId 
 * @param {boolean} isCorrect - 是否答对
 */
export async function recordReview(mistakeId, isCorrect) {
  const mistake = await mistDB.mistakes.get(mistakeId)
  if (!mistake) return
  
  const now = new Date()
  const newCount = (mistake.reviewCount || 0) + 1
  
  // 掌握度计算：答对+20，答错-10，最低0最高100
  let newMastery = (mistake.mastery || 0) + (isCorrect ? 20 : -10)
  newMastery = Math.max(0, Math.min(100, newMastery))
  
  await mistDB.transaction('rw', [mistDB.mistakes, mistDB.reviewLogs], async () => {
    await mistDB.mistakes.update(mistakeId, {
      reviewCount: newCount,
      mastery: newMastery,
      lastReviewedAt: now,
      nextReviewAt: calcNextReview(newCount, now),
      updatedAt: now
    })
    
    await mistDB.reviewLogs.add({
      mistakeId,
      reviewedAt: now,
      result: isCorrect ? 'correct' : 'wrong'
    })
  })
}

/**
 * 导出所有数据为 JSON
 */
export async function exportAllData() {
  const [mistakes, knowledgeTree, settings] = await Promise.all([
    mistDB.mistakes.toArray(),
    mistDB.knowledgeTree.toArray(),
    mistDB.settings.toArray()
  ])
  
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mistakes,
    knowledgeTree,
    settings
  }
}

/**
 * 从 JSON 导入数据
 */
export async function importAllData(data) {
  if (!data.mistakes) throw new Error('无效的数据格式')
  
  await mistDB.transaction('rw', [mistDB.mistakes, mistDB.knowledgeTree, mistDB.settings], async () => {
    await mistDB.mistakes.clear()
    await mistDB.knowledgeTree.clear()
    await mistDB.settings.clear()
    
    if (data.mistakes?.length) await mistDB.mistakes.bulkAdd(data.mistakes)
    if (data.knowledgeTree?.length) await mistDB.knowledgeTree.bulkAdd(data.knowledgeTree)
    if (data.settings?.length) await mistDB.settings.bulkAdd(data.settings)
  })
}

/**
 * 默认知识点体系（高中数理化）
 */
export const DEFAULT_KNOWLEDGE_TREE = [
  // 数学
  { subject: '数学', name: '集合与逻辑', order: 1 },
  { subject: '数学', name: '函数', order: 2 },
  { subject: '数学', name: '三角函数', order: 3 },
  { subject: '数学', name: '数列', order: 4 },
  { subject: '数学', name: '不等式', order: 5 },
  { subject: '数学', name: '平面向量', order: 6 },
  { subject: '数学', name: '立体几何', order: 7 },
  { subject: '数学', name: '解析几何', order: 8 },
  { subject: '数学', name: '导数', order: 9 },
  { subject: '数学', name: '概率统计', order: 10 },

  // 物理
  { subject: '物理', name: '力学', order: 1 },
  { subject: '物理', name: '运动学', order: 2 },
  { subject: '物理', name: '牛顿定律', order: 3 },
  { subject: '物理', name: '能量动量', order: 4 },
  { subject: '物理', name: '电场', order: 5 },
  { subject: '物理', name: '磁场', order: 6 },
  { subject: '物理', name: '电磁感应', order: 7 },
  { subject: '物理', name: '光学', order: 8 },
  { subject: '物理', name: '热学', order: 9 },
  { subject: '物理', name: '近代物理', order: 10 },

  // 化学
  { subject: '化学', name: '化学计量', order: 1 },
  { subject: '化学', name: '元素周期律', order: 2 },
  { subject: '化学', name: '化学反应速率', order: 3 },
  { subject: '化学', name: '化学平衡', order: 4 },
  { subject: '化学', name: '电解质溶液', order: 5 },
  { subject: '化学', name: '电化学', order: 6 },
  { subject: '化学', name: '有机化学', order: 7 },
  { subject: '化学', name: '物质结构', order: 8 }
]

/**
 * 初始化默认知识点
 */
export async function initDefaultKnowledge() {
  const count = await mistDB.knowledgeTree.count()
  if (count === 0) {
    await mistDB.knowledgeTree.bulkAdd(DEFAULT_KNOWLEDGE_TREE.map((item, i) => ({
      ...item,
      parentId: null,
      order: i
    })))
  }
}
