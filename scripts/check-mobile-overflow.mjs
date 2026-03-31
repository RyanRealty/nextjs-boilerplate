import { chromium } from 'playwright';

const SITE = 'https://ryanrealty.vercel.app';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
  });
  const page = await context.newPage();

  await page.goto(SITE + '/', { waitUntil: 'load', timeout: 60000 });

  // Dismiss modal if it appears (shouldn't with our fix, but just in case)
  await page.waitForTimeout(2000);
  const maybeLater = await page.$('button:has-text("Maybe later")');
  if (maybeLater) await maybeLater.click();
  
  const acceptBtn = await page.$('button:has-text("Accept All")');
  if (acceptBtn) await acceptBtn.click();

  await page.waitForTimeout(1000);

  // Find the overflowing elements
  const overflowing = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const results = [];
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 5 && rect.width > 0) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className?.toString()?.substring(0, 100) || '';
        const id = el.id || '';
        const text = el.textContent?.substring(0, 50) || '';
        results.push({
          tag,
          id,
          cls,
          text: text.replace(/\s+/g, ' ').trim(),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          docWidth,
          overflow: Math.round(rect.right - docWidth),
        });
      }
    }
    // Deduplicate by tag+class, keep most specific (smallest width)
    const seen = new Set();
    return results
      .sort((a, b) => a.width - b.width)
      .filter(r => {
        const key = r.tag + ':' + r.cls.substring(0, 30);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  });

  console.log('Overflowing elements on mobile homepage:');
  for (const el of overflowing) {
    console.log(`  ${el.tag}${el.id ? '#' + el.id : ''} class="${el.cls.substring(0, 60)}" right=${el.right}px overflow=${el.overflow}px width=${el.width}px`);
  }

  if (overflowing.length === 0) {
    console.log('  No overflowing elements found!');
  }

  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/mobile_overflow_debug.png', fullPage: false });

  await browser.close();
}

main().catch(console.error);
