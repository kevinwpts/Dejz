const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  console.log('Page loaded');
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Find navigation button for Analys
  const clicked = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    for (const item of navItems) {
      if (item.textContent && (item.textContent.includes('Analys') || item.textContent.includes('Analysis'))) {
        item.click();
        return item.textContent;
      }
    }
    return null;
  });
  console.log('Clicked nav item:', clicked);
  
  await new Promise(r => setTimeout(r, 1500));
  
  // Find category row in the category list
  const categoryClickResult = await page.evaluate(() => {
    // Find all rows in the Card container that has "Kategorier"
    const headers = Array.from(document.querySelectorAll('h3'));
    const catHeader = headers.find(h => h.textContent.includes('Kategorier') || h.textContent.includes('Categories'));
    if (!catHeader) return 'No header found';
    
    const section = catHeader.closest('div.select-none');
    if (!section) return 'No section found';
    
    const rows = Array.from(section.querySelectorAll('.cursor-pointer'));
    if (rows.length === 0) return 'No rows found';
    
    // Click the first row
    rows[0].click();
    return 'Clicked row: ' + rows[0].innerText;
  });
  console.log('Category click result:', categoryClickResult);

  await new Promise(r => setTimeout(r, 1000));

  // Check what is rendered inside the expanded area
  const expandedDetails = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h3'));
    const catHeader = headers.find(h => h.textContent.includes('Kategorier') || h.textContent.includes('Categories'));
    if (!catHeader) return 'No header';
    const section = catHeader.closest('div.select-none');
    return section ? section.innerText : 'No section';
  });
  console.log('Section innerText after click:\n', expandedDetails);

  await browser.close();
})().catch(e => {
  console.error('Script error:', e);
  process.exit(1);
});
