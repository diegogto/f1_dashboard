#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
F1 Scale Models Scraper — Versión mejorada
Scrapes ck-modelcars.de and writes results to PostgreSQL.
"""

import os
import re
import math
import datetime
import time
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from lxml import html
import psycopg2
from psycopg2.extras import execute_batch

# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
BASE_URL = "https://ck-modelcars.de"
LISTING_URL = f"{BASE_URL}/en/l/t-gesamt/k-formel1/scale-1-1-43/a-900/sort-priceup/"
REQUEST_TIMEOUT = 15
MAX_WORKERS = 5          # Parallel page fetches
RETRY_ATTEMPTS = 3
RETRY_DELAY = 2

# ─── Cosine similarity (for WDC matching) ────────────────────────────────────
WORD = re.compile(r'\w+')

def get_cosine(vec1, vec2):
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum(vec1[x] * vec2[x] for x in intersection)
    sum1 = sum(v**2 for v in vec1.values())
    sum2 = sum(v**2 for v in vec2.values())
    denom = math.sqrt(sum1) * math.sqrt(sum2)
    return float(numerator) / denom if denom else 0.0

def text_to_vector(text):
    return Counter(WORD.findall(text))

def get_similarity(a, b):
    return get_cosine(
        text_to_vector(a.strip().lower()),
        text_to_vector(b.strip().lower()),
    )

# ─── HTTP helpers ─────────────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; F1ScrapeBot/2.0; +https://github.com/f1scraper)",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
})

def fetch(url: str) -> bytes | None:
    for attempt in range(RETRY_ATTEMPTS):
        try:
            resp = SESSION.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.content
        except Exception as e:
            if attempt < RETRY_ATTEMPTS - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                print(f"  ⚠ Failed to fetch {url}: {e}", file=sys.stderr)
                return None

# ─── XPath extractors ────────────────────────────────────────────────────────
def _text(tree, xpath: str, default="") -> str:
    nodes = tree.xpath(xpath)
    return nodes[0].text_content().strip() if nodes else default

def _attr(tree, xpath: str, default="") -> str:
    nodes = tree.xpath(xpath)
    return nodes[0].strip() if nodes else default

def parse_car_page(car_link: str) -> dict | None:
    content = fetch(f"{BASE_URL}{car_link}")
    if content is None:
        return None
    tree = html.fromstring(content)

    price_raw = _attr(tree, '//meta[@itemprop="price"]/@content')
    try:
        price = float(price_raw) if price_raw else None
    except ValueError:
        price = None

    year_raw = _text(tree, '//h6[contains(@class,"saison")]/span')
    try:
        year = int(float(year_raw)) if year_raw else None
    except ValueError:
        year = None

    brand_nodes = tree.xpath('//h2[contains(@class,"hersteller")]/span')
    brand = ""
    if brand_nodes:
        brand_span = brand_nodes[0]
        # Extract direct text nodes to avoid GPSR warning info in span
        direct_texts = [t.strip() for t in brand_span.xpath('text()') if t.strip()]
        brand = " ".join(direct_texts)
        if not brand:
            brand = brand_span.text_content().strip()

    return {
        "brand":    brand,
        "scale":    _text(tree, '//h2[contains(@class,"massstab")]/span'),
        "team":     _text(tree, '//h6[contains(@class,"team")]/span'),
        "driver":   _text(tree, '//h3[contains(@class,"fahrer")]/span'),
        "car":      _text(tree, '//h3[contains(@class,"fahrzeug")]/span'),
        "series":   _text(tree, '//h3[contains(@class,"serie")]/span'),
        "year":     year,
        "race":     _text(tree, '//h6[contains(@class,"full serie")]/span'),
        "article":  _text(tree, '//h2[contains(@class,"artikelnummer")]/span'),
        "price":    price,
        "currency": _attr(tree, '//meta[@itemprop="priceCurrency"]/@content', "EUR"),
        "link":     f"{BASE_URL}{car_link}",
    }

# ─── DB helpers ───────────────────────────────────────────────────────────────
def get_connection():
    return psycopg2.connect(DATABASE_URL)

def get_blacklist(cur) -> set:
    cur.execute('SELECT "ckArticleId" FROM "Model" WHERE "isBlacklisted" = true')
    return {row[0] for row in cur.fetchall()}

def upsert_model(cur, car: dict, is_champion: bool = False) -> int | None:
    """Insert or update a model. Returns the model id."""
    cur.execute(
        '''
        INSERT INTO "Model" (
            "ckArticleId", year, driver, team, car, series, race,
            brand, scale, link, currency, "isChampion", "isAvailable", "updatedAt"
        ) VALUES (
            %(article)s, %(year)s, %(driver)s, %(team)s, %(car)s, %(series)s, %(race)s,
            %(brand)s, %(scale)s, %(link)s, %(currency)s, %(is_champion)s, true, NOW()
        )
        ON CONFLICT ("ckArticleId") DO UPDATE SET
            year = EXCLUDED.year,
            driver = EXCLUDED.driver,
            team = EXCLUDED.team,
            car = EXCLUDED.car,
            series = EXCLUDED.series,
            race = EXCLUDED.race,
            brand = EXCLUDED.brand,
            scale = EXCLUDED.scale,
            link = EXCLUDED.link,
            currency = EXCLUDED.currency,
            "isChampion" = EXCLUDED."isChampion",
            "isAvailable" = true,
            "updatedAt" = NOW()
        RETURNING id
        ''',
        {**car, "is_champion": is_champion},
    )
    row = cur.fetchone()
    return row[0] if row else None

def insert_price(cur, model_id: int, price: float):
    cur.execute(
        'INSERT INTO "PriceHistory" ("modelId", price) VALUES (%s, %s)',
        (model_id, price),
    )

def get_last_price(cur, model_id: int) -> float | None:
    cur.execute(
        'SELECT price FROM "PriceHistory" WHERE "modelId" = %s ORDER BY "scrapedAt" DESC LIMIT 1',
        (model_id,),
    )
    row = cur.fetchone()
    return row[0] if row else None

def create_scraper_run(cur) -> int:
    cur.execute(
        'INSERT INTO "ScraperRun" (status) VALUES (\'running\') RETURNING id'
    )
    return cur.fetchone()[0]

def finish_scraper_run(cur, run_id: int, new_models: int, price_ups: int, price_downs: int, total: int, log: str):
    cur.execute(
        '''
        UPDATE "ScraperRun" SET
            status = 'success',
            "finishedAt" = NOW(),
            "newModels" = %s,
            "priceUps" = %s,
            "priceDowns" = %s,
            "totalScraped" = %s,
            log = %s
        WHERE id = %s
        ''',
        (new_models, price_ups, price_downs, total, log, run_id),
    )

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    start = datetime.datetime.now()
    print(f"🏎  F1 Scraper starting at {start.strftime('%Y-%m-%d %H:%M:%S')}")

    # Fetch listing page
    content = fetch(LISTING_URL)
    if content is None:
        print("❌ Failed to fetch listing page", file=sys.stderr)
        sys.exit(1)

    listing_html = html.fromstring(content)
    car_links = listing_html.xpath(
        '/html/body/div/div/section/div/div[contains(@class,"div_liste_punkt")]/a/@href'
    )
    total_found = len(car_links)
    print(f"📋 Found {total_found} cars on listing page")

    # Scrape individual pages in parallel
    cars = []
    failed = 0
    print(f"🔍 Fetching car details (workers={MAX_WORKERS})...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(parse_car_page, link): link for link in car_links}
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result:
                cars.append(result)
            else:
                failed += 1
            # Progress bar
            pct = i / total_found * 100
            bar = "█" * int(pct / 2) + "░" * (50 - int(pct / 2))
            print(f"\r  [{bar}] {pct:.0f}% ({i}/{total_found})", end="", flush=True)

    print(f"\n✅ Scraped {len(cars)} cars ({failed} failed)")

    # Write to DB
    new_models = 0
    price_ups = 0
    price_downs = 0
    log_lines = []

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            blacklist = get_blacklist(cur)
            run_id = create_scraper_run(cur)
            conn.commit()

            scraped_processed = []

            for car in cars:
                article = car.get("article", "")
                if not article or article in blacklist:
                    continue

                price = car.get("price")
                if price is None:
                    continue

                model_id = upsert_model(cur, car)
                if model_id is None:
                    continue

                scraped_processed.append(article)

                last_price = get_last_price(cur, model_id)
                insert_price(cur, model_id, price)

                if last_price is None:
                    new_models += 1
                    msg = f"🆕 New: {car.get('year','')} {car.get('driver','')} {car.get('car','')} ({article}) @ €{price}"
                    print(f"\033[33m  {msg}\033[0m")
                    log_lines.append(msg)
                elif price < last_price:
                    price_downs += 1
                    msg = f"📉 Down: {car.get('driver','')} ({article}) €{last_price} → €{price}"
                    print(f"\033[32m  {msg}\033[0m")
                    log_lines.append(msg)
                elif price > last_price:
                    price_ups += 1
                    msg = f"📈 Up: {car.get('driver','')} ({article}) €{last_price} → €{price}"
                    print(f"\033[31m  {msg}\033[0m")
                    log_lines.append(msg)

            # Mark models not in the scraped set as unavailable (isAvailable = False)
            if scraped_processed:
                cur.execute(
                    'UPDATE "Model" SET "isAvailable" = false WHERE "isBlacklisted" = false AND NOT ("ckArticleId" = ANY(%s))',
                    (scraped_processed,),
                )
                cur.execute('SELECT COUNT(*) FROM "Model" WHERE "isAvailable" = false AND "isBlacklisted" = false')
                unavail_count = cur.fetchone()[0]
                unavail_msg = f"ℹ️ Total unavailable models in DB: {unavail_count}"
                print(f"  {unavail_msg}")
                log_lines.append(unavail_msg)

            elapsed = (datetime.datetime.now() - start).total_seconds()
            summary = (
                f"Scraped {len(cars)} cars in {elapsed:.1f}s | "
                f"New: {new_models} | ↓: {price_downs} | ↑: {price_ups}"
            )
            log_lines.append(summary)
            finish_scraper_run(cur, run_id, new_models, price_ups, price_downs, len(cars), "\n".join(log_lines))
            conn.commit()

    finally:
        conn.close()

    elapsed = (datetime.datetime.now() - start).total_seconds()
    print(f"\n🏁 Done in {elapsed:.1f}s")
    print(f"   New: {new_models} | Price drops: {price_downs} | Price rises: {price_ups}")

if __name__ == "__main__":
    main()
