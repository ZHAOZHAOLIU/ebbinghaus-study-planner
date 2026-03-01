/**
 * Apple Store Minimalist Design
 * Design: Clean, spacious, elegant with generous whitespace
 * Colors: Pure white + Apple blue (#007AFF) + soft grays
 * Typography: SF Pro style with system fonts
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Download, Sparkles, FileText, CheckCircle2, Languages, Plus, Trash2, FolderOpen } from 'lucide-react';
import { generateStudyPlan, type StudyPlan, type UnitRange, formatCalendarDate, formatUnitRange } from '@/lib/ebbinghaus';
import { exportToCSV, exportToPDF, exportToGoogleCalendar } from '@/lib/export';
import { toast } from 'sonner';

const PLANS_LIST_KEY = 'ebbinghaus-plans-list';
const CURRENT_PLAN_KEY = 'ebbinghaus-current-plan';
const LANGUAGE_KEY = 'ebbinghaus-language';

type Language = 'zh' | 'en';

interface SavedPlan {
  id: string;
  plan: StudyPlan;
  completedRanges: string[];
  createdAt: string;
}

// 国际化文本
const i18n = {
  zh: {
    title: '艾宾浩斯学习+复习计划表',
    subtitle: '基于科学记忆曲线，智能生成学习计划',
    planName: '计划名称',
    planNamePlaceholder: '例如：英语单词背诵计划、数学公式记忆计划',
    unitPrefix: '单元命名',
    unitPrefixPlaceholder: '例如：List、Unit、Chapter',
    unitPrefixHint: '用于表格中显示，如"List 1-10"',
    totalAmount: '学习总量',
    totalAmountHint: '需要学习的单元总数',
    planDays: '计划天数',
    planDaysHint: '完成学习的天数',
    startDate: '开始日期',
    studyOrder: '学习顺序',
    orderNormal: '顺序学习',
    orderRandom: '随机乱序',
    orderReverse: '逆序学习',
    generatePlan: '生成学习+复习计划',
    progress: '学习进度',
    totalDays: '共 {0} 天，平均每日 {1} 个单元',
    exportCSV: '导出 CSV',
    exportPDF: '导出 PDF',
    exportGoogleCalendar: '导入 Google Calendar',
    day: 'Day',
    newLearning: '新学习',
    review: '复习',
    units: '共 {0} 单元',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    errorPlanName: '请输入计划名称',
    errorUnitPrefix: '请输入单元命名',
    errorTotalAmount: '请输入有效的学习总量',
    errorPlanDays: '请输入有效的计划天数',
    csvExported: 'CSV文件已导出',
    pdfExported: 'PDF文件已生成',
    icsExported: 'ICS文件已导出，可导入Google Calendar',
    featureAlgorithm: '科学算法',
    featureAlgorithmDesc: '基于艾宾浩斯记忆曲线，优化记忆效果',
    featureCalendar: '日历集成',
    featureCalendarDesc: '一键导入Google Calendar，自动提醒',
    featureExport: '多格式导出',
    featureExportDesc: '支持CSV、PDF、ICS多种格式导出',
    copyright: '© 2026 艾宾浩斯复习计划表. 基于科学记忆曲线的智能学习工具.',
    myPlans: '我的计划',
    newPlan: '新建计划',
    deletePlan: '删除计划',
    loadPlan: '加载计划',
    confirmDelete: '确定要删除这个计划吗？',
    planSaved: '计划已保存',
    planDeleted: '计划已删除',
    planLoaded: '计划已加载',
    noPlans: '暂无保存的计划',
    motto: '强者，从不盲目努力！',
    totalLearning: '总学习量',
    unitsLabel: '个单元',
    streakDays: '连续打卡',
    daysLabel: '天',
    completionRate: '完成率',
    replan: '重新规划',
    replanSuccess: '重新规划成功！剩余 {0} 个单元，从明天开始',
    replanError: '重新规划失败，请稍后再试',
    allTasksCompleted: '所有任务已完成，无需重新规划',
  },
  en: {
    title: 'Ebbinghaus Study & Review Planner',
    subtitle: 'Generate personalized study and review plans based on scientific memory curves',
    planName: 'Plan Name',
    planNamePlaceholder: 'e.g., English Vocabulary, Math Formulas',
    unitPrefix: 'Unit Prefix',
    unitPrefixPlaceholder: 'e.g., List, Unit, Chapter',
    unitPrefixHint: 'Display format like "List 1-10"',
    totalAmount: 'Total Units',
    totalAmountHint: 'Number of units to study',
    planDays: 'Plan Days',
    planDaysHint: 'Days to complete the study',
    startDate: 'Start Date',
    studyOrder: 'Study Order',
    orderNormal: 'Sequential',
    orderRandom: 'Random',
    orderReverse: 'Reverse',
    generatePlan: 'Generate Study Plan',
    progress: 'Progress',
    totalDays: 'Total {0} days, average {1} units per day',
    exportCSV: 'Export CSV',
    exportPDF: 'Export PDF',
    exportGoogleCalendar: 'Import to Google Calendar',
    day: 'Day',
    newLearning: 'New',
    review: 'Review',
    units: 'Total {0} units',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    errorPlanName: 'Please enter plan name',
    errorUnitPrefix: 'Please enter unit prefix',
    errorTotalAmount: 'Please enter valid total amount',
    errorPlanDays: 'Please enter valid plan days',
    csvExported: 'CSV file exported',
    pdfExported: 'PDF file generated',
    icsExported: 'ICS file exported, can be imported to Google Calendar',
    featureAlgorithm: 'Scientific Algorithm',
    featureAlgorithmDesc: 'Based on Ebbinghaus forgetting curve for optimal memory',
    featureCalendar: 'Calendar Integration',
    featureCalendarDesc: 'One-click import to Google Calendar with reminders',
    featureExport: 'Multiple Export Formats',
    featureExportDesc: 'Support CSV, PDF, ICS export formats',
    copyright: '© 2026 Ebbinghaus Study Planner. Intelligent learning tool based on scientific memory curves.',
    myPlans: 'My Plans',
    newPlan: 'New Plan',
    deletePlan: 'Delete Plan',
    loadPlan: 'Load Plan',
    confirmDelete: 'Are you sure you want to delete this plan?',
    planSaved: 'Plan saved',
    planDeleted: 'Plan deleted',
    planLoaded: 'Plan loaded',
    noPlans: 'No saved plans',
    motto: 'The strong never work blindly!',
    totalLearning: 'Total Learning',
    unitsLabel: 'units',
    streakDays: 'Streak',
    daysLabel: 'days',
    completionRate: 'Completion',
    replan: 'Replan',
    replanSuccess: 'Replan successful! {0} units remaining, starting tomorrow',
    replanError: 'Replan failed, please try again later',
    allTasksCompleted: 'All tasks completed, no need to replan',
  }
};

export default function Home() {
  // Form state
  const [planName, setPlanName] = useState('');
  const [unitPrefix, setUnitPrefix] = useState('');
  const [totalAmount, setTotalAmount] = useState('100');
  const [planDays, setPlanDays] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [shuffle, setShuffle] = useState<'normal' | 'random' | 'reverse'>('normal');
  
  // Plan state
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [completedRanges, setCompletedRanges] = useState<Set<string>>(new Set());
  
  // Multi-plan management
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [showPlansList, setShowPlansList] = useState(false);
  
  // Language state
  const [language, setLanguage] = useState<Language>('zh');
  const t = i18n[language];

  // Load saved plans on mount
  useEffect(() => {
    const savedPlansStr = localStorage.getItem(PLANS_LIST_KEY);
    if (savedPlansStr) {
      try {
        const plans: SavedPlan[] = JSON.parse(savedPlansStr);
        // Convert date strings back to Date objects
        plans.forEach(p => {
          p.plan.tasks.forEach(task => {
            task.date = new Date(task.date);
          });
        });
        setSavedPlans(plans);
      } catch (e) {
        console.error('Failed to load saved plans:', e);
      }
    }
    
    const currentId = localStorage.getItem(CURRENT_PLAN_KEY);
    if (currentId) {
      setCurrentPlanId(currentId);
    }
    
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage === 'en' || savedLanguage === 'zh') {
      setLanguage(savedLanguage);
    }
  }, []);

  // Load current plan when currentPlanId changes
  useEffect(() => {
    if (currentPlanId) {
      const plan = savedPlans.find(p => p.id === currentPlanId);
      if (plan) {
        setStudyPlan(plan.plan);
        setCompletedRanges(new Set(plan.completedRanges));
        setPlanName(plan.plan.planName);
        setUnitPrefix(plan.plan.tasks[0]?.unitPrefix || '');
        setTotalAmount(plan.plan.totalAmount.toString());
        setPlanDays(plan.plan.tasks.length.toString());
      }
    }
  }, [currentPlanId, savedPlans]);

  // Save completed ranges whenever they change
  useEffect(() => {
    if (studyPlan && currentPlanId) {
      const updatedPlans = savedPlans.map(p => 
        p.id === currentPlanId 
          ? { ...p, completedRanges: Array.from(completedRanges) }
          : p
      );
      localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(updatedPlans));
    }
  }, [completedRanges, currentPlanId]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const handleGenerate = () => {
    if (!planName.trim()) {
      toast.error(t.errorPlanName);
      return;
    }
    if (!unitPrefix.trim()) {
      toast.error(t.errorUnitPrefix);
      return;
    }
    if (!totalAmount || parseInt(totalAmount) <= 0) {
      toast.error(t.errorTotalAmount);
      return;
    }
    if (!planDays || parseInt(planDays) <= 0) {
      toast.error(t.errorPlanDays);
      return;
    }

    const plan = generateStudyPlan({
      planName: planName.trim(),
      totalAmount: parseInt(totalAmount),
      planDays: parseInt(planDays),
      startDate: new Date(startDate),
      unitPrefix: unitPrefix.trim(),
      shuffle
    });

    setStudyPlan(plan);
    setCompletedRanges(new Set());
    
    // Save as new plan
    const newPlanId = `plan-${Date.now()}`;
    const newSavedPlan: SavedPlan = {
      id: newPlanId,
      plan,
      completedRanges: [],
      createdAt: new Date().toISOString(),
    };
    
    const updatedPlans = [...savedPlans, newSavedPlan];
    setSavedPlans(updatedPlans);
    setCurrentPlanId(newPlanId);
    localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(updatedPlans));
    localStorage.setItem(CURRENT_PLAN_KEY, newPlanId);
    
    toast.success(t.planSaved);
  };

  const handleLoadPlan = (planId: string) => {
    setCurrentPlanId(planId);
    localStorage.setItem(CURRENT_PLAN_KEY, planId);
    setShowPlansList(false);
    toast.success(t.planLoaded);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm(t.confirmDelete)) {
      const updatedPlans = savedPlans.filter(p => p.id !== planId);
      setSavedPlans(updatedPlans);
      localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(updatedPlans));
      
      if (currentPlanId === planId) {
        setCurrentPlanId(null);
        setStudyPlan(null);
        setCompletedRanges(new Set());
        localStorage.removeItem(CURRENT_PLAN_KEY);
      }
      
      toast.success(t.planDeleted);
    }
  };

  const handleNewPlan = () => {
    setCurrentPlanId(null);
    setStudyPlan(null);
    setCompletedRanges(new Set());
    setPlanName('');
    setUnitPrefix('');
    setTotalAmount('100');
    setPlanDays('30');
    setStartDate(new Date().toISOString().split('T')[0]);
    setShuffle('normal');
    localStorage.removeItem(CURRENT_PLAN_KEY);
    setShowPlansList(false);
  };

  const toggleRangeCompletion = (rangeId: string) => {
    setCompletedRanges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rangeId)) {
        newSet.delete(rangeId);
      } else {
        newSet.add(rangeId);
      }
      return newSet;
    });
  };

  const calculateProgress = (): number => {
    if (!studyPlan) return 0;
    
    let totalRanges = 0;
    let completedCount = 0;
    
    studyPlan.tasks.forEach(task => {
      totalRanges += task.newLearning.length + task.review.length;
    });
    
    completedCount = completedRanges.size;
    
    return totalRanges > 0 ? Math.round((completedCount / totalRanges) * 100) : 0;
  };

  const handleExportCSV = () => {
    if (!studyPlan) return;
    exportToCSV(studyPlan, language);
    toast.success(t.csvExported);
  };

  const handleExportPDF = () => {
    if (!studyPlan) return;
    exportToPDF(studyPlan, language);
    toast.success(t.pdfExported);
  };

  const handleExportGoogleCalendar = () => {
    if (!studyPlan) return;
    exportToGoogleCalendar(studyPlan, language);
    toast.success(t.icsExported);
  };

  const handleReplan = () => {
    if (!studyPlan) return;
    
    // 获取所有已完成的单元编号
    const completedUnitNumbers = new Set<number>();
    studyPlan.tasks.forEach(task => {
      [...task.newLearning, ...task.review].forEach(range => {
        if (completedRanges.has(range.id)) {
          for (let i = range.start; i <= range.end; i++) {
            completedUnitNumbers.add(i);
          }
        }
      });
    });
    
    const uniqueCompletedUnits = Array.from(completedUnitNumbers).sort((a, b) => a - b);
    
    // 构建已完成单元的原始学习日期映射
    const completedLearningDates = new Map<number, Date>();
    studyPlan.tasks.forEach(task => {
      task.newLearning.forEach(range => {
        if (completedRanges.has(range.id)) {
          for (let i = range.start; i <= range.end; i++) {
            completedLearningDates.set(i, new Date(task.date));
          }
        }
      });
    });
    
    // 计算新开始日期（从真实的今天+1天开始）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 获取原计划结束日期
    const originalEndDate = new Date(studyPlan.tasks[studyPlan.tasks.length - 1].date);
    
    // 获取当前版本号
    const currentVersion = studyPlan.version || 1.0;
    
    // 生成重新规划
    try {
      const newPlan = generateStudyPlan({
        planName: studyPlan.planName.replace(/ v\d+\.\d+$/, ''), // 移除旧版本号
        unitPrefix: studyPlan.unitPrefix,
        totalAmount: studyPlan.totalAmount,
        planDays: 0, // 不使用，会自动计算
        startDate: tomorrow,
        shuffle: shuffle,
        isReplan: true,
        completedUnits: uniqueCompletedUnits,
        completedLearningDates,
        originalEndDate,
        currentVersion,
      });
      
      // 替换当前计划（不创建新计划）
      setStudyPlan(newPlan);
      setCompletedRanges(new Set());
      setPlanName(newPlan.planName);
      
      // 保存到localStorage
      if (currentPlanId) {
        const plansList: SavedPlan[] = JSON.parse(localStorage.getItem(PLANS_LIST_KEY) || '[]');
        const planIndex = plansList.findIndex(p => p.id === currentPlanId);
        if (planIndex !== -1) {
          plansList[planIndex] = {
            id: currentPlanId,
            plan: newPlan,
            completedRanges: [],
            createdAt: plansList[planIndex].createdAt,
          };
          localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(plansList));
        }
      }
      
      const uncompletedCount = studyPlan.totalAmount - uniqueCompletedUnits.length;
      toast.success(t.replanSuccess.replace('{0}', uncompletedCount.toString()));
    } catch (error) {
      toast.error(t.replanError);
      console.error(error);
    }
  };

  // Group tasks by week for calendar display
  const getWeeksFromTasks = () => {
    if (!studyPlan) return [];
    
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    
    // Get the day of week for the first task (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = studyPlan.tasks[0].date.getDay();
    
    // Add empty cells for days before the first task
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    // Add all tasks
    studyPlan.tasks.forEach(task => {
      currentWeek.push(task);
      
      // If we've reached Saturday (6) or it's the last task, start a new week
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Fill the last week with empty cells if needed
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="gap-2"
        >
          <Languages className="w-4 h-4" />
          {language === 'zh' ? 'English' : '中文'}
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden w-screen -ml-[50vw] left-1/2">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'url(/images/hero-gradient.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container relative py-20 md:py-32 mx-auto">
          <div className="mx-auto max-w-3xl text-center fade-in-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              {t.title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              {t.subtitle}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-6">
              {t.motto}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20">
        {/* Plan Management Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.myPlans}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewPlan}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t.newPlan}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPlansList(!showPlansList)}
                  className="gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  {t.myPlans} ({savedPlans.length})
                </Button>
              </div>
            </div>
            
            {showPlansList && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {savedPlans.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">{t.noPlans}</p>
                ) : (
                  savedPlans.map(plan => (
                    <div
                      key={plan.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        currentPlanId === plan.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{plan.plan.planName}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(plan.createdAt).toLocaleDateString()} · {plan.plan.tasks.length} {t.day}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {currentPlanId !== plan.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadPlan(plan.id)}
                          >
                            {t.loadPlan}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Form Section */}
        <Card className="max-w-4xl mx-auto p-8 bg-white shadow-sm mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="planName">{t.planName}</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder={t.planNamePlaceholder}
                className="h-11"
              />
            </div>

            {/* Unit Prefix */}
            <div className="space-y-2">
              <Label htmlFor="unitPrefix">{t.unitPrefix}</Label>
              <Input
                id="unitPrefix"
                value={unitPrefix}
                onChange={(e) => setUnitPrefix(e.target.value)}
                placeholder={t.unitPrefixPlaceholder}
                className="h-11"
              />
              <p className="text-sm text-gray-500">{t.unitPrefixHint}</p>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label htmlFor="totalAmount">{t.totalAmount}</Label>
              <Input
                id="totalAmount"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="100"
                className="h-11"
              />
              <p className="text-sm text-gray-500">{t.totalAmountHint}</p>
            </div>

            {/* Plan Days */}
            <div className="space-y-2">
              <Label htmlFor="planDays">{t.planDays}</Label>
              <Input
                id="planDays"
                type="number"
                value={planDays}
                onChange={(e) => setPlanDays(e.target.value)}
                placeholder="30"
                className="h-11"
              />
              <p className="text-sm text-gray-500">{t.planDaysHint}</p>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">{t.startDate}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Study Order */}
            <div className="space-y-2">
              <Label htmlFor="shuffle">{t.studyOrder}</Label>
              <Select value={shuffle} onValueChange={(value: any) => setShuffle(value)}>
                <SelectTrigger id="shuffle" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t.orderNormal}</SelectItem>
                  <SelectItem value="random">{t.orderRandom}</SelectItem>
                  <SelectItem value="reverse">{t.orderReverse}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            className="w-full mt-8 h-12 text-lg bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t.generatePlan}
          </Button>
        </Card>

        {/* Study Plan Display */}
        {studyPlan && (
          <div className="max-w-7xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t.progress}</span>
                <span className="text-sm font-bold text-blue-600">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>

            {/* Plan Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{studyPlan.planName}</h2>
              <p className="text-gray-600">
                {studyPlan.remainingDaysText || t.totalDays
                  .replace('{0}', studyPlan.tasks.length.toString())
                  .replace('{1}', Math.round((studyPlan.totalAmount * (1 + 4 * 0.5)) / studyPlan.tasks.length).toString())}
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium mb-1">{t.totalLearning}</p>
                    <p className="text-3xl font-bold text-blue-900">{studyPlan.totalAmount}</p>
                    <p className="text-xs text-blue-600 mt-1">{t.unitsLabel}</p>
                  </div>
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium mb-1">{t.streakDays}</p>
                    <p className="text-3xl font-bold text-green-900">
                      {(() => {
                        let streak = 0;
                        for (const task of studyPlan.tasks) {
                          const allCompleted = [...task.newLearning, ...task.review].every(r => completedRanges.has(r.id));
                          if (allCompleted && [...task.newLearning, ...task.review].length > 0) {
                            streak++;
                          } else if ([...task.newLearning, ...task.review].length > 0) {
                            break;
                          }
                        }
                        return streak;
                      })()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">{t.daysLabel}</p>
                  </div>
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium mb-1">{t.completionRate}</p>
                    <p className="text-3xl font-bold text-purple-900">{calculateProgress()}%</p>
                    <p className="text-xs text-purple-600 mt-1">
                      {completedRanges.size} / {studyPlan.tasks.reduce((sum, t) => sum + t.newLearning.length + t.review.length, 0)}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              <Button onClick={handleReplan} variant="default" className="gap-2 bg-orange-600 hover:bg-orange-700">
                <Sparkles className="w-4 h-4" />
                {t.replan}
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t.exportCSV}
              </Button>
              <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                {t.exportPDF}
              </Button>
              <Button onClick={handleExportGoogleCalendar} variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {t.exportGoogleCalendar}
              </Button>
            </div>

            {/* Calendar View */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {t.weekdays.map((day, idx) => (
                  <div key={idx} className="text-center font-semibold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              {getWeeksFromTasks().map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-2 mb-2">
                  {week.map((task, dayIdx) => (
                    <div
                      key={task ? `task-${task.day}-${task.date.getTime()}` : `empty-${weekIdx}-${dayIdx}`}
                      className={`min-h-[180px] p-3 rounded-lg border-2 flex flex-col ${
                        task
                          ? 'bg-white border-gray-200 hover:border-blue-300 transition-colors'
                          : 'bg-gray-50 border-transparent'
                      }`}
                    >
                      {task && (
                        <div className="flex flex-col flex-1">
                          {/* Date Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-xs text-gray-500">{formatCalendarDate(task.date)}</div>
                              <div className="text-sm font-bold text-blue-600">{t.day} {task.day}</div>
                            </div>
                          </div>

                          {/* New Learning */}
                          {task.newLearning.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-blue-600">{t.newLearning} ({task.newLearning.length})</div>
                              {task.newLearning.map((range: UnitRange) => (
                                <div key={range.id} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={completedRanges.has(range.id)}
                                    onCheckedChange={() => toggleRangeCompletion(range.id)}
                                    className="mt-0.5"
                                  />
                                  <span className={`text-xs ${completedRanges.has(range.id) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {formatUnitRange(range, task.unitPrefix)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Review */}
                          {task.review.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <div className="text-xs font-semibold text-orange-600">{t.review} ({task.review.length})</div>
                              {task.review.map((range: UnitRange) => (
                                <div key={range.id} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={completedRanges.has(range.id)}
                                    onCheckedChange={() => toggleRangeCompletion(range.id)}
                                    className="mt-0.5"
                                  />
                                  <span className={`text-xs ${completedRanges.has(range.id) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {formatUnitRange(range, task.unitPrefix)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Spacer to push Total Units to bottom */}
                          <div className="flex-1"></div>
                          
                          {/* Total Units */}
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                            {t.units.replace('{0}', task.totalUnits.toString())}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center space-y-4 fade-in-up">
                <div className="mx-auto w-32 h-32 flex items-center justify-center">
                  <img
                    src="/images/feature-algorithm.png"
                    alt="艾宾浩斯曲线"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold">{t.featureAlgorithm}</h3>
                <p className="text-muted-foreground">
                  {t.featureAlgorithmDesc}
                </p>
              </div>
              <div className="text-center space-y-4 fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="mx-auto w-32 h-32 flex items-center justify-center">
                  <img
                    src="/images/feature-calendar.png"
                    alt="日历集成"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold">{t.featureCalendar}</h3>
                <p className="text-muted-foreground">
                  {t.featureCalendarDesc}
                </p>
              </div>
              <div className="text-center space-y-4 fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="mx-auto w-32 h-32 flex items-center justify-center">
                  <img
                    src="/images/feature-export.png"
                    alt="多格式导出"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold">{t.featureExport}</h3>
                <p className="text-muted-foreground">
                  {t.featureExportDesc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          {t.copyright}
        </div>
      </footer>
    </div>
  );
}
