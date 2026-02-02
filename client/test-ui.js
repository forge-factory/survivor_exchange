#!/usr/bin/env node
/**
 * UI Testing Script for Forge
 * Takes screenshots of the app for visual verification
 */

const { chromium } = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        console.log('✓ Server is ready');
        return true;
      }
    } catch (e) {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server failed to start');
}

async function takeScreenshots() {
  const screenshotDir = path.join(__dirname, 'test-screenshots');
  
  // Clean old screenshots
  if (fs.existsSync(screenshotDir)) {
    fs.rmSync(screenshotDir, { recursive: true });
  }
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('Starting Next.js dev server...');
  const serverProcess = exec('npm run dev', { cwd: __dirname });
  
  // Wait for server
  console.log('Waiting for server to start...');
  await waitForServer('http://localhost:3000');
  
  console.log('\nTaking screenshots...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Screenshot 1: Homepage
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000); // Wait for hydration
  await page.screenshot({ 
    path: path.join(screenshotDir, '01-homepage.png'),
    fullPage: true 
  });
  console.log('✓ Screenshot: Homepage');
  
  // Screenshot 2: Bid tab
  const bidTab = await page.$('text=Bid on a collection');
  if (bidTab) {
    await bidTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-bid-tab.png'),
      fullPage: true 
    });
    console.log('✓ Screenshot: Bid tab');
  }
  
  // Screenshot 3: Auction card (if exists)
  const auctionCards = await page.$$('[data-testid="auction-card"], .auction-card, [class*="collection"]');
  if (auctionCards.length > 0) {
    await auctionCards[0].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-auction-detail.png'),
      fullPage: true 
    });
    console.log('✓ Screenshot: Auction detail');
  }
  
  await browser.close();
  
  // Kill server
  serverProcess.kill();
  
  console.log(`\n✅ Screenshots saved to: ${screenshotDir}`);
  console.log('Files:');
  fs.readdirSync(screenshotDir).forEach(file => {
    console.log(`  - ${file}`);
  });
  
  return screenshotDir;
}

// Run if called directly
if (require.main === module) {
  takeScreenshots().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { takeScreenshots };
