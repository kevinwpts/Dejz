const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Click "Testa demo direkt" if present
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent.includes('Testa demo direkt')) {
        b.click();
        break;
      }
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Find navigation button for Analys
  const clicked = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    for (const item of navItems) {
      if (item.textContent && (item.textContent.includes('Analys') || item.textContent.includes('Analysis'))) {
        item.click();
        return item.textContent.trim();
      }
    }
    return null;
  });
  console.log('Clicked nav item:', clicked);
  
  await new Promise(r => setTimeout(r, 1500));
  
  // Find category rows
  const rows = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h3'));
    const catHeader = headers.find(h => h.textContent.includes('Kategorier') || h.textContent.includes('Categories'));
    if (!catHeader) return [];
    const section = catHeader.closest('.select-none');
    if (!section) return [];
    return Array.from(section.querySelectorAll('.cursor-pointer')).map(r => r.innerText);
  });
  console.log('Found category rows:', rows);

  // Click row 0
  await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h3'));
    const catHeader = headers.find(h => h.textContent.includes('Kategorier') || h.textContent.includes('Categories'));
    const section = catHeader.closest('.select-none');
    const clickable = section.querySelectorAll('.cursor-pointer');
    if (clickable[0]) clickable[0].click();
  });

  await new Promise(r => setTimeout(r, 500));

  // Take screenshot or check bounding box of transactions
  const txBox = await page.evaluate(() => {
    const txHeaders = Array.from(document.querySelectorAll('span, div')).filter(el => el.textContent === 'Transaktioner' || el.textContent === 'Transactions');
    if (txHeaders.length === 0) return 'No Transaktioner text';
    const txH = txHeaders[0];
    const rect = txH.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height, visible: rect.height > 0 };
  });
  console.log('Transactions header bounding rect:', txBox);

  await browser.close();
})().catch(e => {
  console.error('Mobile script error:', e);
  process.exit(1);
});
