#!/usr/bin/env node
/**
 * Quick Screenshot Tool
 * Usage: node screenshot.js [url] [output-file]
 * Example: node screenshot.js http://localhost:3000 test.png
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function takeScreenshot(url = 'http://localhost:3000', outputFile = 'screenshot.png') {
  console.log(`Taking screenshot of ${url}...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for React hydration
  
  const outputPath = path.join(__dirname, outputFile);
  await page.screenshot({ 
    path: outputPath,
    fullPage: true 
  });
  
  await browser.close();
  
  console.log(`✅ Screenshot saved: ${outputPath}`);
  return outputPath;
}

// Run if called directly
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  const output = process.argv[3] || `screenshot-${Date.now()}.png`;
  
  takeScreenshot(url, output).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { takeScreenshot };
