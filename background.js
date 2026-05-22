chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 1. خيار BT4G المباشر
    chrome.contextMenus.create({
      id: "searchBT4G",
      title: "ابحث في BT4G عن '%s'",
      contexts: ["selection"]
    });

    // 2. خيار YTS الذكي
    chrome.contextMenus.create({
      id: "searchYTS",
      title: "ابحث في YTS عن '%s'",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText.trim();
  
  // أولاً: تنفيذ البحث الأساسي (BT4G أو YTS) وجعله هو التاب النشطة
  if (info.menuItemId === "searchBT4G") {
    const query = encodeURIComponent(selectedText);
    chrome.tabs.create({ url: `https://bt4gprx.com/search/${query}`, active: true });
  } 
  else if (info.menuItemId === "searchYTS") {
    // تنظيف النص واستبدال النقط بمسافات لفصل الكلمات
    let cleanText = selectedText.replace(/[\._]/g, ' ');
    // البحث عن سنة (4 أرقام تبدأ بـ 19 أو 20)
    const yearMatch = cleanText.match(/\b(19|20)\d{2}\b/);

    if (yearMatch) {
      const year = yearMatch[0];
      // قطع النص المكتوب حتى الوصول للسنة 
      let titleUntilYear = cleanText.split(year)[0].trim();
      
      // تحويل الاسم المصفى إلى slug نظيف تماماً
      const titleSlug = titleUntilYear
        .toLowerCase()
        .replace(/[^\w\s]/g, '')   // حذف كل الرموز والأقواس تماماً
        .trim()                    // إزالة أي مسافات زائدة
        .replace(/\s+/g, '-');     // تحويل المسافات لشرطة واحدة فقط
      
      chrome.tabs.create({ url: `https://yts.bz/movies/${titleSlug}-${year}`, active: true });
    } else {
      const query = encodeURIComponent(selectedText);
      chrome.tabs.create({ url: `https://yts.bz/browse-movies/${query}/all/all/0/latest/0/all`, active: true });
    }
  }

  // ثانياً: فتح رابط Subsource تلقائياً في الخلفية (مع منع التكرار)
  openSubsource(selectedText);
});

// دالة معالجة نص البحث وتوليد رابط Subsource
// تم تحويلها إلى async لتتمكن من البحث في التابات المفتوحة
async function openSubsource(text) {
  let cleanText = text.replace(/[\._]/g, ' ');
  let subsourceUrl = ""; // متغير لتخزين الرابط النهائي
  
  // تعبير نمطي للبحث عن صيغ المسلسلات (الحلقة اختيارية هنا)
  const tvMatch = cleanText.match(/(.*?)\s*\b[sS](\d+)(?:\s*[eE]\d+)?\b/i) || cleanText.match(/(.*?)\s*\bSeason\s*(\d+)\b/i);
  
  if (tvMatch) {
    // --- حالة المسلسل ---
    let rawTitle = tvMatch[1].trim();
    let seasonNumber = parseInt(tvMatch[2], 10);
    
    const yearInTitleMatch = rawTitle.match(/\b(19|20)\d{2}\b/);
    
    let titleSlug = rawTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    if (seasonNumber === 1 && !yearInTitleMatch) {
      const currentYear = new Date().getFullYear();
      titleSlug = `${titleSlug}-${currentYear}`;
    } else if (yearInTitleMatch) {
      titleSlug = titleSlug.replace(/-?\b(19|20)\d{2}\b/, '').replace(/-+/g, '-').replace(/-$/, '');
      titleSlug = `${titleSlug}-${yearInTitleMatch[0]}`;
    }

    subsourceUrl = `https://subsource.net/subtitles/${titleSlug}/season-${seasonNumber}`;

  } else {
    // --- حالة الفيلم ---
    const yearMatch = cleanText.match(/\b(19|20)\d{2}\b/);
    
    if (yearMatch) {
      const year = yearMatch[0];
      let titleUntilYear = cleanText.split(year)[0].trim();
      
      const titleSlug = titleUntilYear
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
        
      subsourceUrl = `https://subsource.net/subtitles/${titleSlug}-${year}`;
    } else {
      // تنظيف إضافي إذا لم تكن هناك سنة لحذف كلمات الجودة
      let fallbackTitle = cleanText.split(/\b(720p|1080p|2160p|4k|webrip|bluray|x264|x265)\b/i)[0].trim();
      const titleSlug = fallbackTitle
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      
      subsourceUrl = `https://subsource.net/subtitles/${titleSlug}`;
    }
  }

  // --- التحقق من عدم وجود التاب مسبقاً ---
  if (subsourceUrl) {
    // جلب جميع التابات المفتوحة حالياً في المتصفح
    const openTabs = await chrome.tabs.query({});
    
    // التحقق مما إذا كان هناك تاب يحمل نفس الرابط (استخدمنا startsWith لتجنب مشاكل العلامة / في نهاية الرابط)
    const isTabAlreadyOpen = openTabs.some(tab => tab.url && tab.url.startsWith(subsourceUrl));

    if (!isTabAlreadyOpen) {
      // إذا لم يكن الرابط مفتوحاً، قم بفتحه في الخلفية
      chrome.tabs.create({ url: subsourceUrl, active: false });
    }
  }
}