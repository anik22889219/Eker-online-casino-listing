# -*- coding: utf-8 -*-
"""
collect_logos.py

This Python script connects to your Firestore database, retrieves all casino listings,
extracts the domain names from their affiliate links, finds their high-quality brand logos,
and updates their logo URL fields in Firestore.

To run this script:
1. Install dependencies: pip install firebase-admin requests urllib3
2. Download a service account JSON file from the Firebase Console (Project Settings > Service Accounts > Generate New Private Key).
3. Save the service account JSON key as 'serviceAccountKey.json' in this folder.
4. Run the script: python collect_logos.py
"""

import os
import sys
import re
from urllib.parse import urlparse
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import requests

# Disable SSL warnings for scraper fallbacks
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 1. Initialize Firebase Admin SDK
service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not os.path.exists(service_account_path):
    print("\033[91mError: serviceAccountKey.json not found!\033[0m")
    print("Please download your private key JSON file from Firebase Console and save it as:")
    print(service_account_path)
    print("\nAlternative: You can specify the file location in your python script.")
    sys.exit(1)

cred = credentials.Certificate(service_account_path)
firebase_admin.initialize_app(cred)

db = firestore.client()
casinos_ref = db.collection('casinos')

def get_domain_from_url(url_str):
    """
    Extracts clean domain name from a URL (e.g. "https://www.example.com/click" -> "example.com")
    """
    try:
        parsed_url = urlparse(url_str)
        domain = parsed_url.netloc
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except Exception:
        return None

def get_logo_from_apis(domain):
    """
    Strategy 1: Fetch logo using Logo/Favicon APIs (Highly reliable, bypasses Cloudflare)
    """
    providers = [
        {
            "name": "Clearbit Logo API",
            "url": f"https://logo.clearbit.com/{domain}"
        },
        {
            "name": "Google Favicon API",
            "url": f"https://www.google.com/s2/favicons?sz=128&domain={domain}"
        }
    ]

    for provider in providers:
        try:
            # Validate that the logo URL is live and serves an image
            response = requests.head(provider["url"], timeout=4, allow_redirects=True)
            content_type = response.headers.get('content-type', '')
            if response.status_code == 200 and 'image' in content_type:
                print(f"  [✓] Logo found via {provider['name']}")
                return provider["url"]
        except Exception:
            pass
    return None

def get_logo_from_scraper(url_str):
    """
    Strategy 2: Fallback HTML Scraper (Fetches metadata, og:image, touch-icons, and tags)
    """
    try:
        print(f"  [~] Crawling HTML of: {url_str}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        response = requests.get(url_str, headers=headers, timeout=8, verify=False)
        if response.status_code != 200:
            return None

        html = response.text
        parsed_url = urlparse(url_str)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        def resolve_url(target):
            if not target:
                return None
            target = target.strip()
            if target.startswith('http://') or target.startswith('https://'):
                return target
            if target.startswith('//'):
                return f"{parsed_url.scheme}:{target}"
            if target.startswith('/'):
                return f"{base_url}{target}"
            return f"{base_url}/{target}"

        # 1. Search for Apple Touch Icon
        apple_match = re.search(r'<link[^>]*?rel=["\'](?:shortcut )?apple-touch-icon(?:-precomposed)?["\'][^>]*?href=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if apple_match:
            resolved = resolve_url(apple_match.group(1))
            if resolved:
                return resolved

        # 2. Search for og:image
        og_match = re.search(r'<meta[^>]*?(?:name|property)=["\']og:image["\'][^>]*?content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if og_match:
            resolved = resolve_url(og_match.group(1))
            if resolved:
                return resolved

        # 3. Search img tags with 'logo' or 'brand' in source/alt
        img_tags = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html, re.IGNORECASE)
        for src in img_tags:
            if 'logo' in src.lower() or 'brand' in src.lower():
                resolved = resolve_url(src)
                if resolved:
                    return resolved

        # 4. Standard favicon search
        fav_match = re.search(r'<link[^>]*?rel=["\'](?:shortcut )?icon["\'][^>]*?href=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if fav_match:
            resolved = resolve_url(fav_match.group(1))
            if resolved:
                return resolved

        # 5. Hardcoded Favicon location
        return f"{base_url}/favicon.ico"

    except Exception as e:
        print(f"  [✗] Custom scraper failed: {str(e)}")
        return None

def process_casinos():
    print("\n==================================================")
    print("   STARTING AUTOMATED BRAND LOGO COLLECTION (PYTHON)")
    print("==================================================\n")

    try:
        docs = list(casinos_ref.stream())
        if not docs:
            print("No casino documents found in Firestore!")
            return

        print(f"Found {len(docs)} listing(s) to analyze.\n")

        updated_count = 0
        skipped_count = 0

        for doc in docs:
            data = doc.to_dict()
            casino_name = data.get('casinoName', 'Unnamed Casino')
            affiliate_link = data.get('affiliateLink')

            print(f"Analyzing: \"{casino_name}\"...")

            if not affiliate_link:
                print("  [!] Skipping: No affiliate link available.")
                skipped_count += 1
                continue

            domain = get_domain_from_url(affiliate_link)
            if not domain:
                print("  [!] Skipping: Invalid affiliate link URL structure.")
                skipped_count += 1
                continue

            print(f"  Domain: {domain}")
            logo_url = None

            # 1. Try Free APIs first (Fast, reliable, bypasses Cloudflare blocks)
            logo_url = get_logo_from_apis(domain)

            # 2. Fallback to custom scraper
            if not logo_url:
                logo_url = get_logo_from_scraper(affiliate_link)

            if logo_url:
                print(f"  [✓] Logo Resolved: {logo_url}")

                # Update Firestore Document
                doc.reference.update({
                    'casinoLogo': logo_url,
                    'logoStatus': 'found',
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })

                print("  [★] Firestore updated successfully!")
                updated_count += 1
            else:
                print("  [✗] Could not automatically locate any brand logo.")
                skipped_count += 1
            print("-" * 50)

        print("\n==================================================")
        print("   COLLECTION COMPLETE")
        print("==================================================")
        print(f"Successfully updated: {updated_count} listings")
        print(f"Skipped / Failed:     {skipped_count} listings")
        print("==================================================\n")

    except Exception as e:
        print(f"Critical Error during script execution: {str(e)}")

if __name__ == '__main__':
    process_casinos()
