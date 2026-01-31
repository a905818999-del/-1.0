
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Translation Dictionary (UI Labels)
 */
const translations = {
  zh: {
    title: "封禁数据处理中心 Pro",
    subtitle: "支持多格式识别与泰语佛历换算",
    fixNotice: "已更新泰语公告模板与佛历日期逻辑",
    settings: "设置",
    exportCsv: "导出 CSV",
    dataSource: "数据源",
    clickToUpload: "点击上传 TXT 或 CSV 文件",
    executeAnalysis: "执行分析",
    processingOverview: "处理概览",
    uniqueUid: "唯一 UID",
    filteredRecords: "已去重",
    totalValid: "有效条目",
    config: "参数配置",
    inputSeparator: "TXT 分隔符",
    sortBy: "排序依据",
    sortDuration: "封禁时长",
    sortDate: "封禁日期",
    announcementLimit: "公告名单长度",
    done: "完成配置",
    tabPreview: "数据预览",
    tabAnnouncement: "公告生成器",
    previewNote: "预览 (显示前30条)",
    waitingData: "等待处理数据",
    copyAll: "复制全文",
    copied: "已复制到剪贴板",
    placeholderAnnouncement: "处理完数据后此处会自动生成公告...",
    tipNote: "提示：泰语公告会自动切换为佛历年份（公历+543）。列表会自动对齐显示。",
    langToggle: "EN / 中文",
    totalLines: "原始行数",
    days: "天",
    seconds: "秒",
    reasonStats: "封禁原因统计",
    durationStats: "封禁时长分布",
    exportColumns: "导出字段勾选",
    glossary: "专用词典 (原因翻译)",
    glossaryKey: "原文 (如：全图透视)",
    glossaryAdd: "手动添加",
    targetLang: "目标语言",
    targetLangs: {
      tw: "台服 (繁体)",
      th: "泰语",
      vn: "越南语",
      en: "英语"
    },
    glossaryEmpty: "词典为空，分析数据后将自动从源数据中扩充",
    years: "年",
    tableHeaders: {
      nickname: "角色昵称",
      reason: "处罚原因",
      duration: "封禁时长"
    },
    footerLinkText: "详情可点击查看：",
    durationLabels: {
      "5m": "5分钟",
      "1h": "1小时",
      "1d": "1天",
      "3d": "3天",
      "7d": "7天",
      "30d": "1个月",
      "mid": "长期"
    }
  },
  en: {
    title: "Ban Data Processor Pro",
    subtitle: "Hybrid Support & Buddhist Calendar",
    fixNotice: "Updated Thai template and Buddhist year logic",
    settings: "Settings",
    exportCsv: "Export CSV",
    dataSource: "Data Source",
    clickToUpload: "Upload TXT or CSV files",
    executeAnalysis: "Run Analysis",
    processingOverview: "Overview",
    uniqueUid: "Unique UID",
    filteredRecords: "Deduplicated",
    totalValid: "Valid Records",
    config: "Configuration",
    inputSeparator: "TXT Separator",
    sortBy: "Sort By",
    sortDuration: "Duration",
    sortDate: "Ban Date",
    announcementLimit: "List Rows Limit",
    done: "Done",
    tabPreview: "Preview",
    tabAnnouncement: "Announcement Gen",
    previewNote: "Preview (Top 30)",
    waitingData: "Waiting for data...",
    copyAll: "Copy All",
    copied: "Copied to clipboard",
    placeholderAnnouncement: "Announcement will be generated here...",
    tipNote: "Tip: Thai announcements use the Buddhist year. Lists are auto-aligned.",
    langToggle: "中文 / EN",
    totalLines: "Total Lines",
    days: "Days",
    seconds: "Secs",
    reasonStats: "Reason Breakdown",
    durationStats: "Duration Stats",
    exportColumns: "Export Columns",
    glossary: "Glossary (Translations)",
    glossaryKey: "Raw Key (e.g. Map Hack)",
    glossaryAdd: "Add Manual",
    targetLang: "Target Lang",
    targetLangs: {
      tw: "Taiwan (Trad)",
      th: "Thai",
      vn: "Vietnamese",
      en: "English"
    },
    glossaryEmpty: "Glossary is empty. Auto-expands from data sources.",
    years: "Y",
    tableHeaders: {
      nickname: "Player Name",
      reason: "Offense",
      duration: "Duration"
    },
    footerLinkText: "Details link:",
    durationLabels: {
      "5m": "5m",
      "1h": "1h",
      "1d": "1d",
      "3d": "3d",
      "7d": "7d",
      "30d": "30d",
      "mid": "Long-term"
    }
  }
};

interface GlossaryEntry {
  key: string;
  tw: string;
  th: string;
  vn: string;
  en: string;
}

interface AppSettings {
  inputSeparator: string;
  outputSeparator: string;
  sortBy: 'duration' | 'time' | 'uid';
  sortOrder: 'asc' | 'desc';
  exportColumns: string[];
  glossary: GlossaryEntry[];
  announcementListLimit: number;
}

const DEFAULT_COLUMNS = ['UID', 'Nickname', 'Strategy', 'Duration(s)', 'Duration(d)', 'Reason', 'Time'];

const DEFAULT_SETTINGS: AppSettings = {
  inputSeparator: '|',
  outputSeparator: ',',
  sortBy: 'duration',
  sortOrder: 'desc',
  exportColumns: DEFAULT_COLUMNS,
  glossary: [
    { key: "全图透视", tw: "全圖透視", th: "แฮ็กแมพ", vn: "Hack bản đồ", en: "Map Hack" }
  ],
  announcementListLimit: 50
};

interface BanRecord {
  uid: string;
  nickname: string;
  strategyId: string;
  duration: number;
  durationDays: string;
  reason: string;
  banTime: string;
}

const App: React.FC = () => {
  const [lang, setLang] = useState<'zh' | 'en'>(() => (localStorage.getItem('ban_tool_lang') as any) || 'zh');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ban_tool_settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    // Backwards compatibility for new field
    if (parsed.announcementListLimit === undefined) {
      parsed.announcementListLimit = 50;
    }
    return parsed;
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<BanRecord[]>([]);
  const [stats, setStats] = useState({ totalLines: 0, validRecords: 0, uniqueUids: 0, removedCount: 0, dateRange: { start: '', end: '' }, strategyCount: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'announcement'>('preview');
  const [targetLang, setTargetLang] = useState<'tw' | 'th' | 'vn' | 'en'>('th');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => {
    const keys = key.split('.');
    let result: any = translations[lang];
    for (const k of keys) {
      if (result[k] === undefined) return key;
      result = result[k];
    }
    return result;
  };

  useEffect(() => {
    localStorage.setItem('ban_tool_settings', JSON.stringify(settings));
    localStorage.setItem('ban_tool_lang', lang);
  }, [settings, lang]);

  const translateReason = (rawReason: string) => {
    const entry = settings.glossary.find(g => g.key === rawReason);
    if (!entry) return rawReason;
    return entry[targetLang] || rawReason;
  };

  /**
   * Helper to format duration based on year unit conversion
   */
  const formatDurationDisplay = (durationSeconds: number, currentTargetLang: 'tw' | 'th' | 'vn' | 'en') => {
    const totalDays = Math.floor(durationSeconds / 86400);
    if (totalDays >= 365) {
      const years = Math.floor(totalDays / 365);
      const yearSuffix: Record<string, string> = {
        tw: '年',
        th: ' ปี',
        vn: ' năm',
        en: 'y'
      };
      return `${years}${yearSuffix[currentTargetLang] || 'y'}`;
    }
    return totalDays.toString();
  };

  /**
   * 泰语佛历日期转换 (佛历年 = 公历年 + 543)
   */
  const getThaiBuddhistDate = (dateStr: string) => {
    if (!dateStr) return '';
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear() + 543;
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'DD MMM YYYY';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const date = new Date(cleanStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'DD MMM YYYY'; }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    let allValidRecords: BanRecord[] = [];
    let totalLineCount = 0;

    const readFilesPromises = files.map(file => new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        totalLineCount += lines.length;

        if (lines.length === 0) { resolve(); return; }

        const firstLine = lines[0].toLowerCase();
        const isOfficialCsv = firstLine.includes('tcid') && (firstLine.includes('startdate') || firstLine.includes('raw'));

        lines.forEach((line, index) => {
          if (isOfficialCsv && index === 0) return;

          if (isOfficialCsv) {
            const parts = line.split(/\t|,/).map(p => p.trim());
            if (parts.length >= 9) {
              const strategyId = parts[0];
              const startDateStr = parts[1];
              const endDateStr = parts[2];
              const uid = parts[4];
              const rawReason = parts[8];
              const sourceInfo = parts[9];

              try {
                const start = new Date(startDateStr);
                const end = new Date(endDateStr);
                const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
                const finalReason = rawReason && rawReason.length > 0 ? rawReason : sourceInfo;

                allValidRecords.push({
                  uid,
                  nickname: "N/A",
                  strategyId,
                  duration: durationSeconds,
                  durationDays: Math.floor(durationSeconds / 86400).toString(),
                  reason: finalReason || "Unknown",
                  banTime: startDateStr.split('.')[0].replace('T', ' ')
                });
              } catch (err) {
                console.warn("Invalid date in CSV line:", line);
              }
            }
          } else {
            const parts = line.split(settings.inputSeparator).map(p => p.trim());
            if (parts.length >= 6) {
              const uid = parts[0];
              const banTime = parts[parts.length - 1];
              const reason = parts[parts.length - 2];
              const duration = parseInt(parts[parts.length - 3]) || 0;
              const strategyId = parts[parts.length - 4];
              const nickname = parts.slice(1, parts.length - 4).join(settings.inputSeparator);
              allValidRecords.push({ 
                uid, nickname, strategyId, duration, 
                durationDays: Math.floor(duration / 86400).toString(),
                reason, banTime 
              });
            }
          }
        });
        resolve();
      };
      reader.readAsText(file);
    }));

    await Promise.all(readFilesPromises);

    const uidMap = new Map<string, BanRecord>();
    const strats = new Set<string>();
    allValidRecords.forEach(r => {
      const existing = uidMap.get(r.uid);
      if (!existing || r.duration > existing.duration) uidMap.set(r.uid, r);
      strats.add(r.strategyId);
    });

    const uniqueRecords = Array.from(uidMap.values()).sort((a, b) => {
      let c = 0;
      if (settings.sortBy === 'duration') c = a.duration - b.duration;
      else if (settings.sortBy === 'time') c = a.banTime.localeCompare(b.banTime);
      else c = a.uid.localeCompare(b.uid);
      return settings.sortOrder === 'desc' ? -c : c;
    });

    const uniqueReasonsFound = new Set(uniqueRecords.map(r => r.reason).filter(Boolean));
    const existingKeys = new Set(settings.glossary.map(g => g.key));
    const newEntries: GlossaryEntry[] = [];
    uniqueReasonsFound.forEach(reason => {
      if (!existingKeys.has(reason)) {
        newEntries.push({ key: reason, tw: '', th: '', vn: '', en: '' });
      }
    });

    if (newEntries.length > 0) {
      setSettings(prev => ({ ...prev, glossary: [...prev.glossary, ...newEntries] }));
    }

    const times = uniqueRecords.map(r => {
        const d = new Date(r.banTime.includes(' ') ? r.banTime.replace(' ', 'T') : r.banTime).getTime();
        return isNaN(d) ? 0 : d;
    }).filter(t => t > 0);
    
    setProcessedData(uniqueRecords);
    setStats({
      totalLines: totalLineCount,
      validRecords: allValidRecords.length,
      uniqueUids: uniqueRecords.length,
      removedCount: allValidRecords.length - uniqueRecords.length,
      dateRange: { 
        start: times.length > 0 ? new Date(Math.min(...times)).toISOString().split('T')[0] : '', 
        end: times.length > 0 ? new Date(Math.max(...times)).toISOString().split('T')[0] : '' 
      },
      strategyCount: strats.size
    });
    setIsProcessing(false);
  };

  const visualStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const reasonMap = new Map<string, number>();
    const durationBuckets: Record<string, number> = {};
    processedData.forEach(r => {
      reasonMap.set(r.reason, (reasonMap.get(r.reason) || 0) + 1);
      const ySec = 31536000;
      let bk = r.duration <= 300 ? "5m" : r.duration <= 3600 ? "1h" : r.duration <= 86400 ? "1d" : r.duration <= 259200 ? "3d" : r.duration <= 604800 ? "7d" : r.duration <= 2592000 ? "30d" : r.duration < ySec ? "mid" : `${Math.round(r.duration / ySec)}y`;
      durationBuckets[bk] = (durationBuckets[bk] || 0) + 1;
    });
    const sortedDurations = Object.entries(durationBuckets).sort(([a], [b]) => {
      const order = ["5m", "1h", "1d", "3d", "7d", "30d", "mid"];
      const iA = order.indexOf(a), iB = order.indexOf(b);
      if (iA !== -1 && iB !== -1) return iA - iB;
      if (iA !== -1) return -1; if (iB !== -1) return 1;
      return parseInt(a) - parseInt(b);
    });
    return { 
      reasonList: Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count, percent: (count/processedData.length*100).toFixed(1) })).sort((a,b) => b.count-a.count),
      durationBuckets: sortedDurations
    };
  }, [processedData]);

  const announcementText = useMemo(() => {
    if (processedData.length === 0) return "";
    
    const sDate = formatDisplayDate(stats.dateRange.start);
    const eDate = formatDisplayDate(stats.dateRange.end);
    const sDateTh = getThaiBuddhistDate(stats.dateRange.start);
    const eDateTh = getThaiBuddhistDate(stats.dateRange.end);
    
    // Header terms
    const headers = translations[lang].tableHeaders;
    const hNick = targetLang === 'th' ? "ชื่อผู้เล่น" : headers.nickname;
    const hReason = targetLang === 'th' ? "ข้อหา" : headers.reason;
    const hDur = targetLang === 'th' ? "ระยะเวลาการแบน" : headers.duration;

    // Helper to pad strings for visual alignment
    const pad = (str: string, length: number) => {
        let s = str || "";
        // Naive visible length estimate
        return s.padEnd(length, ' ');
    };

    // Generate Example Table Rows
    const exampleRecords = processedData.slice(0, settings.announcementListLimit); // Use configurable limit
    let tableRows = exampleRecords.map(r => {
        const trReason = translateReason(r.reason);
        const displayDur = formatDurationDisplay(r.duration, targetLang);
        return `${pad(r.nickname, 20)} ${pad(trReason, 20)} ${displayDur}`;
    }).join('\n');

    const footerUrl = "https://toxicmanagement.rov.garena.in.th/";
    const footerLinkText = translations[lang].footerLinkText;

    const templates: Record<string, string> = {
      tw: `處罰公告：針對違規玩家的處罰清單 (${sDate} - ${eDate})\n本次共計封鎖 ${stats.uniqueUids} 個帳號。\n\n${pad("角色昵稱", 20)} ${pad("处罚原因", 20)} 封禁时长\n${"-".repeat(50)}\n${tableRows}\n\n${footerLinkText}\n${footerUrl}`,
      th: `ประกาศลงโทษแบนผู้เล่นที่ทำผิดกฎ ตั้งแต่วันที่ ${sDateTh} ถึง ${eDateTh} - ${stats.uniqueUids} ไอดี\n\n${pad("ชื่อผู้เล่น", 20)} ${pad("ข้อหา", 20)} ระยะเวลาการแบน\n${"-".repeat(50)}\n${tableRows}\n\nรายละเอียดเพิ่มเติมคลิก:\n${footerUrl}`,
      vn: `Thông báo xử phạt người chơi vi phạm từ ngày ${sDate} đến ${eDate} - ${stats.uniqueUids} tài khoản\n\n${pad("Tên người chơi", 20)} ${pad("Lý do", 20)} Ngày khóa\n${"-".repeat(50)}\n${tableRows}\n\n${footerLinkText}\n${footerUrl}`,
      en: `Penalty Announcement: Ban list from ${sDate} to ${eDate} - Total ${stats.uniqueUids} IDs\n\n${pad("Player Name", 20)} ${pad("Offense", 20)} Ban Duration\n${"-".repeat(50)}\n${tableRows}\n\n${footerLinkText}\n${footerUrl}`
    };

    return templates[targetLang] || templates['en'];
  }, [processedData, stats, targetLang, settings.glossary, lang, settings.announcementListLimit]);

  const exportToCSV = () => {
    if (processedData.length === 0) return;
    const headerMap: Record<string, string> = { UID: 'uid', Nickname: 'nickname', Strategy: 'strategyId', 'Duration(s)': 'duration', 'Duration(d)': 'durationDays', Reason: 'reason', Time: 'banTime' };
    const selectedCols = settings.exportColumns;
    const headerRow = selectedCols.join(settings.outputSeparator);
    const rows = processedData.map(r => selectedCols.map(c => `"${String((r as any)[headerMap[c]]).replace(/"/g, '""')}"`).join(settings.outputSeparator));
    const content = "\uFEFF" + [headerRow, ...rows].join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ban_export_${new Date().getTime()}.csv`;
    link.click();
  };

  const updateGlossary = (idx: number, field: keyof GlossaryEntry, val: string) => {
    const next = [...settings.glossary];
    next[idx] = { ...next[idx], [field]: val };
    setSettings(prev => ({ ...prev, glossary: next }));
  };

  const addGlossary = () => {
    setSettings(prev => ({ ...prev, glossary: [{ key: '', tw: '', th: '', vn: '', en: '' }, ...prev.glossary] }));
  };

  const removeGlossary = (idx: number) => {
    setSettings(prev => ({ ...prev, glossary: prev.glossary.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto overflow-x-hidden">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 glass-card shadow-2xl">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{t('title')}</h1>
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="px-2 py-1 bg-slate-700/50 rounded border border-slate-600 text-[10px] font-bold text-slate-400 uppercase tracking-tighter transition-all hover:bg-slate-600/50">{t('langToggle')}</button>
          </div>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')} <span className="text-emerald-500/80 font-mono ml-2">V3.1</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 text-sm border border-slate-600/50 shadow-lg"><i className="fa-solid fa-gear"></i> {t('settings')}</button>
          <button onClick={exportToCSV} disabled={processedData.length === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-blue-900/40"><i className="fa-solid fa-file-export"></i> {t('exportCsv')}</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 shadow-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold flex items-center gap-2"><i className="fa-solid fa-cloud-arrow-up text-blue-400"></i> {t('dataSource')}</h2>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group relative overflow-hidden">
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} multiple accept=".txt,.csv" className="hidden" />
              <div className="relative z-10">
                <i className="fa-solid fa-file-lines text-4xl text-slate-500 group-hover:text-blue-400 mb-2 block transition-transform group-hover:scale-110"></i>
                <p className="text-slate-300 text-sm">{t('clickToUpload')}</p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-y-auto text-[10px] text-slate-400 font-mono border border-slate-800 custom-scrollbar">
                {files.map((f, i) => <div key={i} className="flex justify-between border-b border-slate-800 last:border-0 py-1"><span>{f.name}</span><span>{(f.size/1024).toFixed(0)}K</span></div>)}
              </div>
            )}
            <button onClick={processFiles} disabled={files.length === 0 || isProcessing} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95">
              {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>} {t('executeAnalysis')}
            </button>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 shadow-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold flex items-center gap-2"><i className="fa-solid fa-chart-pie text-emerald-400"></i> {t('processingOverview')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('totalValid')}</p>
                <p className="text-2xl font-mono text-slate-300 tracking-tight">{stats.validRecords.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('uniqueUid')}</p>
                <p className="text-2xl font-mono text-emerald-400 tracking-tight">{stats.uniqueUids.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 col-span-2 shadow-inner">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('filteredRecords')}</p>
                <p className="text-2xl font-mono text-rose-400 tracking-tight">{stats.removedCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {showSettings ? (
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6 h-[calc(100vh-180px)] overflow-hidden shadow-2xl border border-slate-700/50">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xl font-semibold flex items-center gap-2"><i className="fa-solid fa-sliders text-amber-400"></i> {t('config')}</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">Basic Settings</h3>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('inputSeparator')}</label>
                      <input type="text" value={settings.inputSeparator} onChange={e => setSettings({...settings, inputSeparator: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('announcementLimit')}</label>
                      <input type="number" value={settings.announcementListLimit} onChange={e => setSettings({...settings, announcementListLimit: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t('sortBy')}</label>
                      <select value={settings.sortBy} onChange={e => setSettings({...settings, sortBy: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none">
                        <option value="duration">{t('sortDuration')}</option>
                        <option value="time">{t('sortDate')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">{t('exportColumns')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {DEFAULT_COLUMNS.map(col => (
                        <label key={col} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-900/50 rounded border border-slate-700/50 hover:bg-slate-800 transition-all active:scale-95">
                          <input type="checkbox" checked={settings.exportColumns.includes(col)} onChange={() => {
                            const next = settings.exportColumns.includes(col) ? settings.exportColumns.filter(c => c !== col) : [...settings.exportColumns, col];
                            setSettings({...settings, exportColumns: next});
                          }} className="accent-blue-500 h-4 w-4" />
                          <span className="text-xs text-slate-300">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center sticky top-0 bg-slate-800/90 backdrop-blur-lg p-2 rounded-lg z-20 border border-slate-700/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('glossary')}</h3>
                    <button onClick={addGlossary} className="text-[10px] px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full hover:bg-blue-600/30 transition-all font-bold tracking-tight">{t('glossaryAdd')}</button>
                  </div>
                  {settings.glossary.length === 0 ? (
                    <p className="text-center text-slate-600 text-sm py-12 italic">{t('glossaryEmpty')}</p>
                  ) : (
                    <div className="space-y-3">
                      {settings.glossary.map((g, i) => (
                        <div key={i} className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 relative group hover:border-slate-500/50 transition-colors">
                          <button onClick={() => removeGlossary(i)} className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full text-[12px] hidden group-hover:flex items-center justify-center shadow-xl z-10 border border-rose-400 hover:bg-rose-400"><i className="fa-solid fa-xmark"></i></button>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div className="md:col-span-1">
                              <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase tracking-widest">Original Key</label>
                              <input type="text" value={g.key} onChange={e => updateGlossary(i, 'key', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-amber-400 outline-none focus:border-amber-500 font-mono shadow-inner" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 md:col-span-4 gap-2">
                              {['tw', 'th', 'vn', 'en'].map(langKey => (
                                <div key={langKey}>
                                  <label className="text-[9px] text-slate-500 mb-1 block uppercase font-bold tracking-widest">{langKey}</label>
                                  <input type="text" value={(g as any)[langKey]} onChange={e => updateGlossary(i, langKey as any, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 shadow-inner" placeholder="..." />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="shrink-0 mt-4 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl text-white">确认设置</button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl min-h-[650px] lg:h-[calc(100vh-180px)] flex flex-col overflow-hidden shadow-2xl border border-slate-700/50">
              <div className="flex border-b border-slate-700 bg-slate-800/40 shrink-0">
                <button onClick={() => setActiveTab('preview')} className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'preview' ? 'text-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t('tabPreview')}
                  {activeTab === 'preview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>}
                </button>
                <button onClick={() => setActiveTab('announcement')} className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'announcement' ? 'text-indigo-400 bg-indigo-400/5' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t('tabAnnouncement')}
                  {activeTab === 'announcement' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>}
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative bg-slate-900/20">
                {activeTab === 'preview' ? (
                  <div className="absolute inset-0 flex flex-col p-4 gap-6 overflow-y-auto custom-scrollbar pb-12">
                    {processedData.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50 shadow-inner">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-slate-800 pb-2">{t('reasonStats')} <span className="text-blue-400/80 font-normal">TOP 5</span></h3>
                            <div className="space-y-4">
                              {visualStats?.reasonList.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="group">
                                  <div className="flex justify-between text-[11px] mb-1.5"><span className="text-slate-300 truncate pr-2 group-hover:text-blue-300 transition-colors">{item.reason}</span><span className="text-slate-500 font-mono">{item.count} <span className="text-[9px] opacity-60">({item.percent}%)</span></span></div>
                                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner"><div className={`h-full bg-gradient-to-r transition-all duration-700 ${idx === 0 ? 'from-blue-500 to-indigo-500' : 'from-slate-600 to-slate-500'}`} style={{ width: `${item.percent}%` }}></div></div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50 flex flex-col shadow-inner">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">{t('durationStats')}</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[160px] pr-2 space-y-3">
                              {visualStats?.durationBuckets.map(([k, count]) => {
                                const p = (count as number/processedData.length*100).toFixed(1);
                                return (
                                  <div key={k} className="flex items-center gap-3">
                                    <span className="text-[9px] text-slate-400 w-16 text-right shrink-0 uppercase font-mono">{(k as string).endsWith('y') ? `${(k as string).replace('y', '')}${t('years')}` : t(`durationLabels.${k}`)}</span>
                                    <div className="flex-1 bg-slate-800 h-2.5 rounded relative overflow-hidden shadow-inner">
                                      <div className="h-full bg-blue-500/30 border-r-2 border-blue-400/50 transition-all duration-700" style={{ width: `${p}%` }}></div>
                                      <span className="absolute inset-0 flex items-center justify-end px-1.5 text-[8px] font-bold font-mono text-blue-300 drop-shadow-sm">{count}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden flex flex-col flex-1 shrink-0 shadow-2xl">
                           <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center shrink-0">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                               <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{t('tabPreview')}</span>
                             </div>
                             <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">TOTAL_UNIQUE: {processedData.length}</span>
                           </div>
                           <div className="overflow-x-auto custom-scrollbar">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead className="bg-slate-800/80 text-slate-400 uppercase sticky top-0 z-10 backdrop-blur-sm">
                                  <tr><th className="px-4 py-3 font-bold">UID</th><th className="px-4 py-3 font-bold">Nickname</th><th className="px-4 py-3 font-bold text-center">Duration</th><th className="px-4 py-3 font-bold">Reason</th><th className="px-4 py-3 font-bold">Time</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {processedData.slice(0, 30).map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                                      <td className="px-4 py-2.5 font-mono text-slate-500 group-hover:text-blue-400/70 transition-colors">{r.uid}</td>
                                      <td className="px-4 py-2.5 text-slate-200 truncate max-w-[120px]">{r.nickname}</td>
                                      <td className="px-4 py-2.5 text-blue-400 font-bold text-center bg-blue-400/5 font-mono uppercase">
                                        {formatDurationDisplay(r.duration, lang === 'zh' ? 'tw' : 'en')}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-400 italic truncate max-w-[180px]">{r.reason}</td>
                                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap font-mono">{r.banTime}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                           </div>
                           <div className="px-5 py-2 bg-slate-900/30 text-[9px] text-slate-600 border-t border-slate-800 text-center font-mono">--- LISTING TOP 30 ENTRIES FOR PERFORMANCE ---</div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-20 min-h-[400px] pointer-events-none select-none">
                        <i className="fa-solid fa-server text-8xl mb-6"></i>
                        <p className="text-lg font-bold tracking-tighter uppercase">{t('waitingData')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col gap-5 p-6 overflow-y-auto custom-scrollbar pb-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t('targetLang')}</span>
                        <div className="flex bg-slate-950/80 border border-slate-800 rounded-xl p-1 shadow-inner">
                          {['tw', 'th', 'vn', 'en'].map(l => (
                            <button key={l} onClick={() => setTargetLang(l as any)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all ${targetLang === l ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(announcementText); alert(t('copied')); }} className="px-5 py-2.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2 active:scale-95"><i className="fa-regular fa-copy"></i> {t('copyAll')}</button>
                    </div>
                    <div className="relative flex-1 min-h-[450px]">
                      <textarea readOnly value={announcementText} className="absolute inset-0 w-full h-full bg-slate-950/60 border border-slate-800 rounded-3xl p-8 text-[12px] md:text-sm text-slate-300 font-mono leading-relaxed resize-none focus:outline-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] custom-scrollbar whitespace-pre overflow-x-auto" placeholder={t('placeholderAnnouncement')} />
                    </div>
                    <div className="p-4 bg-indigo-900/10 rounded-2xl border border-indigo-800/20 text-xs text-indigo-300/60 leading-normal flex gap-3 items-start"><i className="fa-solid fa-circle-info mt-0.5 text-indigo-400"></i><span>{t('tipNote')}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
