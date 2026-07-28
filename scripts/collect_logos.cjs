/**
 * collect_logos.js
 * 
 * This Node.js script connects to your Firestore database, retrieves all casino listings,
 * extracts the domain names from their affiliate links, finds their high-quality brand logos,
 * and updates their logo URL fields in Firestore.
 * 
 * To run this script:
 * 1. Install dependencies: npm install firebase-admin axios
 * 2. Set up your Google Application Credentials or download a service account JSON file
 *    from the Firebase Console (Project Settings > Service Accounts > Generate New Private Key).
 * 3. Save the service account JSON key as 'serviceAccountKey.json' in this folder.
 * 4. Run the script: node collect_logos.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: serviceAccountKey.json not found!');
  console.log('Please download your private key JSON file from Firebase Console and save it as:');
  console.log(serviceAccountPath);
  console.log('\nAlternative: You can initialize the script using your environment variables.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = getFirestore();
const casinosCollection = db.collection('casinos');

/**
 * Extracts clean domain name from a URL (e.g. "https://www.example.com/click?id=12" -> "example.com")
 */
function getDomainFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (error) {
    return null;
  }
}

/**
 * Strategy 1: Fetch logo using Logo/Favicon APIs (Highly reliable, bypasses Cloudflare)
 */
async function getLogoFromApis(domain) {
  const providers = [
    {
      name: 'Google FaviconV2 API',
      url: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
    },
    {
      name: 'Clearbit Logo API',
      url: `https://logo.clearbit.com/${domain}`
    },
    {
      name: 'Google Standard Favicon API',
      url: `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
    },
    {
      name: 'Favicon Kit API',
      url: `https://api.faviconkit.com/${domain}/144`
    },
    {
      name: 'DuckDuckGo Icon API',
      url: `https://icons.duckduckgo.com/ip3/${domain}.ico`
    }
  ];

  for (const provider of providers) {
    try {
      // Validate that the logo URL is actually live and serving an image
      const response = await axios.head(provider.url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const contentType = response.headers['content-type'] || '';
      const contentLength = parseInt(response.headers['content-length'] || '0', 10);
      if (response.status === 200 && contentType.includes('image') && contentLength > 300) {
        console.log(`  [✓] Logo found via ${provider.name} (length: ${contentLength})`);
        return provider.url;
      }
    } catch (e) {
      // Try a quick GET in case HEAD is blocked by the provider or returns incorrect content-length
    }
    
    // Always run the GET fallback if HEAD didn't succeed with high confidence
    try {
      const response = await axios.get(provider.url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' }, responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'] || '';
      const contentLength = response.data ? response.data.length : 0;
      if (response.status === 200 && contentType.includes('image') && contentLength > 300) {
        console.log(`  [✓] Logo found via ${provider.name} (GET fallback) (length: ${contentLength})`);
        return provider.url;
      }
    } catch (err) {
      // Keep trying next provider
    }
  }
  return null;
}

/**
 * Validates whether a scraped URL actually exists and returns an image
 */
async function checkUrlIsLiveImage(url) {
  if (!url) return false;
  // Ignore base64/data URLs as they are typically empty spacer placeholders
  if (url.startsWith('data:')) {
    return false;
  }
  try {
    const response = await axios.head(url, { 
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    const contentType = response.headers['content-type'] || '';
    if (response.status === 200 && (contentType.includes('image') || contentType.includes('octet-stream') || url.endsWith('.ico') || url.endsWith('.png') || url.endsWith('.svg'))) {
      return true;
    }
  } catch (e) {
    try {
      const response = await axios.get(url, { 
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (response.status === 200 && response.data) {
        return true;
      }
    } catch (err) {}
  }
  return false;
}

/**
 * Strategy 2: Fallback custom HTML Scraper (Fetches metadata, og:image, touch-icons, logo elements)
 */
async function getLogoFromScraper(urlStr) {
  try {
    console.log(`  [~] Crawling HTML of: ${urlStr}`);
    const response = await axios.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const html = response.data;
    const urlObj = new URL(urlStr);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    // Resolve relative paths to absolute URLs
    const resolveUrl = (target) => {
      if (!target) return null;
      if (target.startsWith('http://') || target.startsWith('https://')) return target;
      if (target.startsWith('//')) return `${urlObj.protocol}${target}`;
      return new URL(target, baseUrl).href;
    };

    // 1. Search for custom Apple Touch Icon
    const appleTouchMatch = html.match(/<link[^>]*?rel=["'](?:shortcut )?apple-touch-icon(?:-precomposed)?["'][^>]*?href=["']([^"']+)["']/i);
    if (appleTouchMatch && appleTouchMatch[1]) {
      const resolved = resolveUrl(appleTouchMatch[1].trim());
      if (await checkUrlIsLiveImage(resolved)) return resolved;
    }

    // 2. Search for OG:Image
    const ogImageMatch = html.match(/<meta[^>]*?(?:name|property)=["']og:image["'][^>]*?content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      const resolved = resolveUrl(ogImageMatch[1].trim());
      if (await checkUrlIsLiveImage(resolved)) return resolved;
    }

    // 3. Robust Search for elements containing "logo" or "brand" in img tag attributes (handles lazy loading)
    const imgRegex = /<img([^>]+)>/gi;
    let match;
    const candidates = [];
    
    while ((match = imgRegex.exec(html)) !== null) {
      const attrsStr = match[1];
      
      const srcMatch = attrsStr.match(/src=["']([^"']+)["']/i);
      const dataSrcMatch = attrsStr.match(/(?:data-src|data-lazy-src|data-original|lazy-src|srcset)=["']([^"']+)["']/i);
      const altMatch = attrsStr.match(/alt=["']([^"']+)["']/i);
      const classMatch = attrsStr.match(/class=["']([^"']+)["']/i);

      const alt = altMatch ? altMatch[1].toLowerCase() : '';
      const className = classMatch ? classMatch[1].toLowerCase() : '';
      const src = srcMatch ? srcMatch[1] : '';
      const dataSrc = dataSrcMatch ? dataSrcMatch[1] : '';

      // Prioritize data-src/lazy-src for sites using lazy loaders
      let imgUrl = '';
      if (dataSrc && !dataSrc.startsWith('data:')) {
        imgUrl = dataSrc;
      } else if (src && !src.startsWith('data:')) {
        imgUrl = src;
      }

      if (imgUrl) {
        const lowerUrl = imgUrl.toLowerCase();
        const isLogo = lowerUrl.includes('logo') || alt.includes('logo') || className.includes('logo') ||
                       lowerUrl.includes('brand') || alt.includes('brand') || className.includes('brand');
        
        if (isLogo) {
          const resolved = resolveUrl(imgUrl.trim());
          if (resolved) {
            candidates.push(resolved);
          }
        }
      }
    }

    // Test candidates sequentially
    for (const cand of candidates) {
      if (await checkUrlIsLiveImage(cand)) {
        return cand;
      }
    }

    // 4. Fallback: Search in Mobile App/SPA Bundles (Extremely powerful for modern casinos)
    try {
      console.log(`  [~] Attempting Mobile SPA CSS deep search...`);
      const mobileIndexUrl = `${baseUrl}/m/index.html`;
      const mobileRes = await axios.get(mobileIndexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        },
        timeout: 5000
      });
      if (mobileRes.status === 200) {
        const mHtml = mobileRes.data;
        const cssMatches = mHtml.match(/href=["']([^"']+\.css)["']/gi);
        if (cssMatches) {
          for (const matchStr of cssMatches) {
            const cssPath = matchStr.match(/href=["']([^"']+\.css)["']/i)[1];
            let fullCssUrl = cssPath;
            if (cssPath.startsWith('/')) {
              fullCssUrl = `${baseUrl}${cssPath}`;
            } else if (!cssPath.startsWith('http')) {
              fullCssUrl = `${baseUrl}/m/${cssPath}`;
            }
            
            console.log(`    [~] Scanning compiled CSS: ${fullCssUrl}`);
            try {
              const cssRes = await axios.get(fullCssUrl, { timeout: 4000 });
              if (cssRes.status === 200) {
                const cssContent = cssRes.data;
                const logoUrlMatch = cssContent.match(/url\(([^)]+?logo[^)]+?)\)/i);
                if (logoUrlMatch) {
                  let cleanedLogoPath = logoUrlMatch[1].replace(/['"]/g, '').trim();
                  let resolvedLogoUrl = cleanedLogoPath;
                  if (cleanedLogoPath.startsWith('/')) {
                    resolvedLogoUrl = `${baseUrl}${cleanedLogoPath}`;
                  } else if (!cleanedLogoPath.startsWith('http')) {
                    resolvedLogoUrl = `${baseUrl}/m/${cleanedLogoPath}`;
                  }
                  
                  if (await checkUrlIsLiveImage(resolvedLogoUrl)) {
                    console.log(`    [✓] High-res SPA logo extracted from CSS: ${resolvedLogoUrl}`);
                    return resolvedLogoUrl;
                  }
                }
              }
            } catch (cssErr) {
              // Ignore single CSS errors and continue
            }
          }
        }
      }
    } catch (mobileErr) {
      // Ignore mobile SPA search errors and continue
    }

    // 5. Fallback Standard Favicon Link
    const faviconMatch = html.match(/<link[^>]*?rel=["'](?:shortcut )?icon["'][^>]*?href=["']([^"']+)["']/i);
    if (faviconMatch && faviconMatch[1]) {
      const resolved = resolveUrl(faviconMatch[1].trim());
      if (await checkUrlIsLiveImage(resolved)) return resolved;
    }

    // 5. Hardcoded Favicon location check
    const defaultFavicon = `${baseUrl}/favicon.ico`;
    if (await checkUrlIsLiveImage(defaultFavicon)) {
      return defaultFavicon;
    }

    return null;
  } catch (error) {
    console.log(`  [✗] Custom scraper failed: ${error.message}`);
    return null;
  }
}

/**
 * Main Execution Function
 */
async function processCasinos() {
  console.log('\n==================================================');
  console.log('   STARTING AUTOMATED BRAND LOGO COLLECTION');
  console.log('==================================================\n');

  try {
    const snapshot = await casinosCollection.get();
    if (snapshot.empty) {
      console.log('No casino documents found in Firestore!');
      return;
    }

    console.log(`Found ${snapshot.size} listing(s) to analyze.\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const casinoName = data.casinoName || 'Unnamed Casino';
      const affiliateLink = data.affiliateLink;

      console.log(`Analyzing: "${casinoName}"...`);

      if (!affiliateLink) {
        console.log(`  [!] Skipping: No affiliate link available.`);
        skippedCount++;
        continue;
      }

      const domain = getDomainFromUrl(affiliateLink);
      if (!domain) {
        console.log(`  [!] Skipping: Invalid affiliate link URL structure.`);
        skippedCount++;
        continue;
      }

      console.log(`  Domain: ${domain}`);
      let logoUrl = null;

      // 1. Try Free APIs first (Fast, reliable, bypasses Cloudflare blocks)
      logoUrl = await getLogoFromApis(domain);

      // 2. Fallback to scraping the target website directly if API has nothing
      if (!logoUrl) {
        logoUrl = await getLogoFromScraper(affiliateLink);
      }

      if (logoUrl) {
        console.log(`  [✓] Logo Resolved: ${logoUrl}`);
        
        // Update Firestore Document
        await casinosCollection.doc(doc.id).update({
          casinoLogo: logoUrl,
          logoStatus: 'found',
          updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`  [★] Firestore updated successfully!`);
        updatedCount++;
      } else {
        console.log(`  [✗] Could not automatically locate any brand logo.`);
        skippedCount++;
      }
      console.log('--------------------------------------------------');
    }

    console.log('\n==================================================');
    console.log('   COLLECTION COMPLETE');
    console.log('==================================================');
    console.log(`Successfully updated: ${updatedCount} listings`);
    console.log(`Skipped / Failed:     ${skippedCount} listings`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('Critical Error during script execution:', error);
  } finally {
    process.exit(0);
  }
}

// Start processing
processCasinos();
