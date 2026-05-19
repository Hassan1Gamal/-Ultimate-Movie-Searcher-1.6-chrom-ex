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
        .replace(/[^\w\s]/g, '')   // حذف كل الرموز والأقواس تماماً (بما فيها : و ( و ) )
        .trim()                    // إزالة أي مسافات زائدة في الأطراف
        .replace(/\s+/g, '-');     // تحويل المسافات لشرطة واحدة فقط
      
      // فتح الرابط المباشر النظيف (مثال: movies/avatar-fire-and-ash-2025)
      chrome.tabs.create({ url: `https://yts.bz/movies/${titleSlug}-${year}`, active: true });
    } else {
      // حالة عدم وجود سنة: استخدام رابط الـ browse-movies العادي كاحتياط
      const query = encodeURIComponent(selectedText);
      chrome.tabs.create({ url: `https://yts.bz/browse-movies/${query}/all/all/0/latest/0/all`, active: true });
    }
  }

  // ثانياً: فتح رابط Subsource تلقائياً في الخلفية
  openSubsource(selectedText);
});

// دالة معالجة نص البحث وتوليد رابط Subsource
function openSubsource(text) {
  let cleanText = text.replace(/[\._]/g, ' ');
  
  // تعبير نمطي للبحث عن صيغ المسلسلات
  const tvMatch = cleanText.match(/(.*?)\s*[sS](\d+)\s*[eE]\d+/i) || cleanText.match(/(.*?)\s*Season\s*(\d+)/i);
  
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

    const subsourceUrl = `https://subsource.net/subtitles/${titleSlug}/season-${seasonNumber}`;
    chrome.tabs.create({ url: subsourceUrl, active: false });

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
        
      const subsourceUrl = `https://subsource.net/subtitles/${titleSlug}-${year}`;
      chrome.tabs.create({ url: subsourceUrl, active: false });
    } else {
      const titleSlug = cleanText
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      
      const subsourceUrl = `https://subsource.net/subtitles/${titleSlug}`;
      chrome.tabs.create({ url: subsourceUrl, active: false });
    }
  }
}