// Ebbinghaus Forgetting Curve Algorithm
// Review intervals based on spaced repetition research

export interface StudyInput {
  planName: string; // 计划名称
  totalAmount: number;
  planDays: number;
  startDate: Date;
  unitPrefix: string; // 单元命名前缀，如 "List", "Unit", "Chapter"
  shuffle?: 'normal' | 'random' | 'reverse';
  // 重新规划专用参数
  isReplan?: boolean; // 是否为重新规划
  completedUnits?: number[]; // 已完成的单元编号
  completedLearningDates?: Map<number, Date>; // 已完成单元的原始学习日期
  originalEndDate?: Date; // 原计划的结束日期
  currentVersion?: number; // 当前版本号
}

export interface UnitRange {
  start: number;
  end: number;
  id: string; // 唯一标识符，用于复选框状态管理
  completed?: boolean; // 是否完成
}

export interface ReviewTask {
  date: Date;
  day: number; // Day number
  newLearning: UnitRange[]; // 新学习的单元范围
  review: UnitRange[]; // 复习的单元范围
  totalUnits: number; // Total units for this day
  unitPrefix: string; // Unit prefix for display
}

export interface StudyPlan {
  planName: string;
  unitPrefix: string;
  totalAmount: number;
  planDays: number;
  startDate: Date;
  tasks: ReviewTask[];
  totalDays: number;
  dailyAverage: number;
  version?: number; // 版本号
  originalEndDate?: Date; // 原计划结束日期（重新规划时使用）
  remainingDaysText?: string; // 剩余天数文本
}

// Standard Ebbinghaus intervals (in days): 1, 2, 4, 7, 15
const REVIEW_INTERVALS = [1, 2, 4, 7, 15];

/**
 * Calculate review schedule based on Ebbinghaus forgetting curve
 */
export function generateStudyPlan(input: StudyInput): StudyPlan {
  const { 
    planName, 
    totalAmount, 
    planDays, 
    startDate, 
    unitPrefix, 
    shuffle = 'normal',
    isReplan = false,
    completedUnits = [],
    completedLearningDates = new Map(),
    originalEndDate,
    currentVersion = 0
  } = input;
  
  // 如果是重新规划
  if (isReplan) {
    return generateReplan(input);
  }
  
  // 正常生成计划逻辑
  // Generate unit indices
  let units = Array.from({ length: totalAmount }, (_, i) => i + 1);
  
  // Apply shuffle if needed
  if (shuffle === 'random') {
    units = shuffleArray(units);
  } else if (shuffle === 'reverse') {
    units = units.reverse();
  }
  
  // Calculate units per day for new learning
  const unitsPerDay = Math.ceil(totalAmount / planDays);
  
  // Initialize tasks array
  const tasks: ReviewTask[] = [];
  
  // Track which units need to be reviewed on which days
  const reviewSchedule: Map<number, number[]> = new Map();
  
  // Generate new learning schedule
  let currentIndex = 0;
  for (let day = 0; day < planDays && currentIndex < totalAmount; day++) {
    const dayUnits: number[] = [];
    const remaining = totalAmount - currentIndex;
    const daysLeft = planDays - day;
    const todayAmount = Math.ceil(remaining / daysLeft);
    
    for (let i = 0; i < todayAmount && currentIndex < totalAmount; i++) {
      dayUnits.push(units[currentIndex]);
      currentIndex++;
    }
    
    // Schedule reviews for these newly learned units
    for (const interval of REVIEW_INTERVALS) {
      const reviewDay = day + interval;
      if (reviewDay < planDays) {
        if (!reviewSchedule.has(reviewDay)) {
          reviewSchedule.set(reviewDay, []);
        }
        reviewSchedule.get(reviewDay)!.push(...dayUnits);
      }
    }
    
    // Create task for this day
    const taskDate = new Date(startDate);
    taskDate.setDate(taskDate.getDate() + day);
    
    const newLearning = groupUnitsIntoRanges(dayUnits, unitPrefix, 'new', day);
    const reviewUnits = reviewSchedule.get(day) || [];
    const review = groupUnitsIntoRanges(reviewUnits, unitPrefix, 'review', day);
    
    tasks.push({
      date: taskDate,
      day: day + 1,
      newLearning,
      review,
      totalUnits: dayUnits.length + reviewUnits.length,
      unitPrefix
    });
  }
  
  // Calculate total days (including review-only days)
  const maxReviewDay = Math.max(...Array.from(reviewSchedule.keys()), planDays - 1);
  const totalDays = Math.min(maxReviewDay + 1, planDays);
  
  // Calculate daily average
  const dailyAverage = Math.ceil(totalAmount / planDays);
  
  return {
    planName,
    unitPrefix,
    totalAmount,
    planDays,
    startDate,
    tasks,
    totalDays,
    dailyAverage,
    version: 1.0
  };
}

/**
 * Generate replan based on completed and uncompleted units
 */
function generateReplan(input: StudyInput): StudyPlan {
  const {
    planName,
    totalAmount,
    startDate, // 这是新的开始日期（当前日期+1天）
    unitPrefix,
    shuffle = 'normal',
    completedUnits = [],
    completedLearningDates = new Map(),
    originalEndDate,
    currentVersion = 0
  } = input;
  
  // 计算新版本号
  const newVersion = currentVersion + 1;
  const newPlanName = `${planName.replace(/ v\d+\.\d+$/, '')} v${newVersion}.0`;
  
  // 计算剩余天数（从新开始日期到原结束日期）
  // 至少保留1天，确保即使逾期也能生成计划
  const remainingDays = originalEndDate
    ? Math.max(1, Math.ceil((originalEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;
  
  // 生成剩余天数文本
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 检查是否已逾期
  const isOverdue = originalEndDate && startDate > originalEndDate;

  const remainingDaysText = originalEndDate
    ? isOverdue
      ? `共：${remainingDays} 天（已逾期）`
      : `共：${remainingDays} 天（从 ${formatDate(startDate)} 到 ${formatDate(originalEndDate)}）`
    : `共：${remainingDays} 天`;
  
  // 识别未完成的单元
  const allUnits = Array.from({ length: totalAmount }, (_, i) => i + 1);
  const uncompletedUnits = allUnits.filter(u => !completedUnits.includes(u));
  
  // 对未完成单元应用排序
  let sortedUncompletedUnits = [...uncompletedUnits];
  if (shuffle === 'random') {
    sortedUncompletedUnits = shuffleArray(sortedUncompletedUnits);
  } else if (shuffle === 'reverse') {
    sortedUncompletedUnits = sortedUncompletedUnits.reverse();
  }
  
  // 计算每日新学习量
  const dailyNewAmount = uncompletedUnits.length > 0 
    ? Math.ceil(uncompletedUnits.length / remainingDays)
    : 0;
  
  // 初始化任务数组
  const tasks: ReviewTask[] = [];
  
  // 复习调度表
  const reviewSchedule: Map<number, number[]> = new Map();
  
  // 为已完成单元安排复习
  // 已完成单元的复习基于其原始学习日期，但都从新计划的第一天开始安排
  // 收集因为超出remainingDays而无法安排的复习单元
  const overflowReviewUnits: number[] = [];

  for (const unit of completedUnits) {
    const learningDate = completedLearningDates.get(unit);
    if (!learningDate) continue;

    // 计算从原始学习日期到新开始日期的天数差
    const daysSinceLearning = Math.floor((startDate.getTime() - learningDate.getTime()) / (1000 * 60 * 60 * 24));

    // 根据艾宾浩斯曲线安排复习
    // 无论过了多少天，都要安排复习
    // 复习从新计划的第一天开始，按照艾宾浩斯间隔依次安排
    for (let i = 0; i < REVIEW_INTERVALS.length; i++) {
      const reviewDayOffset = i; // 复习依次安排在第1天、第2天、第4天、第7天、第15天

      if (reviewDayOffset < remainingDays) {
        if (!reviewSchedule.has(reviewDayOffset)) {
          reviewSchedule.set(reviewDayOffset, []);
        }
        reviewSchedule.get(reviewDayOffset)!.push(unit);
      } else {
        // 如果超出remainingDays，收集到overflowReviewUnits
        if (!overflowReviewUnits.includes(unit)) {
          overflowReviewUnits.push(unit);
        }
      }
    }
  }

  // 将无法安排的复习单元合并到第一天的复习中
  if (overflowReviewUnits.length > 0) {
    if (!reviewSchedule.has(0)) {
      reviewSchedule.set(0, []);
    }
    const firstDayReview = reviewSchedule.get(0)!;
    for (const unit of overflowReviewUnits) {
      if (!firstDayReview.includes(unit)) {
        firstDayReview.push(unit);
      }
    }
  }
  
  // 为未完成单元安排新学习和复习
  let currentIndex = 0;
  for (let day = 0; day < remainingDays; day++) {
    const dayNewUnits: number[] = [];
    
    // 分配新学习单元
    if (currentIndex < sortedUncompletedUnits.length) {
      const remaining = sortedUncompletedUnits.length - currentIndex;
      const daysLeft = remainingDays - day;
      const todayAmount = Math.ceil(remaining / daysLeft);
      
      for (let i = 0; i < todayAmount && currentIndex < sortedUncompletedUnits.length; i++) {
        dayNewUnits.push(sortedUncompletedUnits[currentIndex]);
        currentIndex++;
      }
    }
    
    // 为今天新学习的单元安排复习
    for (const unit of dayNewUnits) {
      for (const interval of REVIEW_INTERVALS) {
        const reviewDay = day + interval;
        if (reviewDay < remainingDays) {
          if (!reviewSchedule.has(reviewDay)) {
            reviewSchedule.set(reviewDay, []);
          }
          reviewSchedule.get(reviewDay)!.push(unit);
        }
      }
    }
    
    // 创建当天任务
    const taskDate = new Date(startDate);
    taskDate.setDate(taskDate.getDate() + day);
    
    const newLearning = groupUnitsIntoRanges(dayNewUnits, unitPrefix, 'new', day);
    const reviewUnits = reviewSchedule.get(day) || [];
    const review = groupUnitsIntoRanges(reviewUnits, unitPrefix, 'review', day);
    
    tasks.push({
      date: taskDate,
      day: day + 1,
      newLearning,
      review,
      totalUnits: dayNewUnits.length + reviewUnits.length,
      unitPrefix
    });
  }
  
  // 计算平均每日学习量
  const dailyAverage = uncompletedUnits.length > 0
    ? Math.ceil(uncompletedUnits.length / remainingDays)
    : 0;
  
  return {
    planName: newPlanName,
    unitPrefix,
    totalAmount,
    planDays: remainingDays,
    startDate,
    tasks,
    totalDays: remainingDays,
    dailyAverage,
    version: newVersion,
    originalEndDate,
    remainingDaysText
  };
}

/**
 * Group consecutive units into ranges
 */
function groupUnitsIntoRanges(units: number[], unitPrefix: string, type: 'new' | 'review' = 'new', day?: number): UnitRange[] {
  if (units.length === 0) return [];

  // Sort units
  const sortedUnits = [...units].sort((a, b) => a - b);

  const ranges: UnitRange[] = [];
  let start = sortedUnits[0];
  let end = sortedUnits[0];

  for (let i = 1; i < sortedUnits.length; i++) {
    if (sortedUnits[i] === end + 1) {
      end = sortedUnits[i];
    } else {
      ranges.push({
        start,
        end,
        id: `${type}-${day || 0}-${unitPrefix}-${start}-${end}`,
        completed: false
      });
      start = sortedUnits[i];
      end = sortedUnits[i];
    }
  }

  // Push the last range
  ranges.push({
    start,
    end,
    id: `${type}-${day || 0}-${unitPrefix}-${start}-${end}`,
    completed: false
  });

  return ranges;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Format date for calendar display
 */
export function formatCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format unit range for display
 */
export function formatUnitRange(range: UnitRange, unitPrefix: string): string {
  if (range.start === range.end) {
    return `${unitPrefix} ${range.start}`;
  }
  return `${unitPrefix} ${range.start}-${range.end}`;
}