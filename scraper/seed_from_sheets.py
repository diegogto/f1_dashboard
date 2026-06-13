#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seed script: Carga datos iniciales desde Google Sheets a PostgreSQL.
Lee las hojas: Todos_ck, Canasta, Wishlist, Blacklist.
"""

import os
import sys
import datetime
import json

import pygsheets
import psycopg2
import numpy as np

CREDS_FILE = os.environ.get("GOOGLE_CREDS_FILE")
if not CREDS_FILE:
    local_path = os.path.join(os.path.dirname(__file__), "google_creds.json")
    if os.path.exists(local_path):
        CREDS_FILE = local_path
    else:
        CREDS_FILE = os.path.join(os.path.dirname(__file__), "../../../f1_scrapper/formula1-collection-89688a4d1ad3.json")

SHEET_ID = os.environ.get("GOOGLE_SHEET_ID", "1i-PiE-95QnP49iGsn1wtHQPGkDSkjiRqa8drCahnwDQ")
DATABASE_URL = os.environ.get("DATABASE_URL", "")


def safe_float(val) -> float | None:
    try:
        return float(str(val).replace(",", ".")) if val and str(val).strip() else None
    except (ValueError, TypeError):
        return None


def safe_int(val) -> int | None:
    f = safe_float(val)
    return int(f) if f is not None else None


def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    print("🔗 Connecting to Google Sheets...")
    gc = pygsheets.authorize(service_account_file=CREDS_FILE)
    wb = gc.open_by_key(SHEET_ID)

    worksheets = {ws.title: ws for ws in wb.worksheets()}

    # ── 1. Blacklist ──────────────────────────────────────────────────────────
    blacklist_ids: set[str] = set()
    if "Blacklist" in worksheets:
        rows = worksheets["Blacklist"].get_all_values()
        blacklist_ids = {row[0].strip() for row in rows if row and row[0].strip()}
        print(f"  Blacklist: {len(blacklist_ids)} items")

    # ── 2. Wishlist ───────────────────────────────────────────────────────────
    wishlist_ids: set[str] = set()
    wishlist_meta: dict[str, dict] = {}  # article_id -> metadata
    if "Wishlist" in worksheets:
        rows = worksheets["Wishlist"].get_all_values()
        headers = [h.strip() for h in rows[0]] if rows else []
        for row in rows[1:]:
            if not row or not row[0].strip():
                continue
            article = row[0].strip()
            wishlist_ids.add(article)
            meta = dict(zip(headers, row))
            wishlist_meta[article] = meta
        print(f"  Wishlist: {len(wishlist_ids)} items")

    # ── 3. Todos_ck (main catalog) ─────────────────────────────────────────
    catalog: list[dict] = []
    if "Todos_ck" in worksheets:
        rows = worksheets["Todos_ck"].get_all_values()
        if rows:
            headers = [h.strip() for h in rows[0]]
            for row in rows[1:]:
                if not any(c.strip() for c in row):
                    continue
                d = dict(zip(headers, row))
                article = d.get("article", "").strip()
                if not article:
                    continue
                catalog.append({
                    "ckArticleId": article,
                    "year":        safe_int(d.get("year")),
                    "driver":      d.get("driver", "").strip() or None,
                    "team":        d.get("team", "").strip() or None,
                    "car":         d.get("car", "").strip() or None,
                    "series":      d.get("series", "").strip() or None,
                    "race":        d.get("race", "").strip() or None,
                    "brand":       d.get("brand", "").strip() or None,
                    "scale":       d.get("scale", "").strip() or None,
                    "link":        d.get("link", "").strip() or None,
                    "currency":    d.get("currency", "EUR").strip() or "EUR",
                    "currentPrice": safe_float(d.get("price")),
                    "isBlacklisted": article in blacklist_ids,
                    "isWishlisted":  article in wishlist_ids,
                })
        print(f"  Todos_ck: {len(catalog)} models")

    # ── 4. Canasta (price history) ──────────────────────────────────────────
    price_history: dict[str, list[tuple[datetime.datetime, float]]] = {}
    if "Canasta" in worksheets:
        all_vals = worksheets["Canasta"].get_all_values()
        if all_vals:
            headers = all_vals[0]
            # Date columns start at index 10 (after fixed metadata columns)
            date_columns = []
            for i, h in enumerate(headers[10:], start=10):
                h = h.strip()
                if not h:
                    continue
                for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%Y", "%m/%d/%Y"):
                    try:
                        date_columns.append((i, datetime.datetime.strptime(h, fmt)))
                        break
                    except ValueError:
                        pass

            for row in all_vals[1:]:
                if not row or not row[0].strip():
                    continue
                article = row[0].strip()
                entries = []
                for col_idx, dt in date_columns:
                    if col_idx < len(row):
                        val = safe_float(row[col_idx])
                        if val is not None and val > 0:
                            entries.append((dt, val))
                if entries:
                    price_history[article] = entries

        print(f"  Canasta: price history for {len(price_history)} articles")

    # ── 5. Write to PostgreSQL ─────────────────────────────────────────────
    print("\n💾 Writing to PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    inserted_models = 0
    inserted_prices = 0

    try:
        with conn.cursor() as cur:
            # Clear existing data
            cur.execute('TRUNCATE "PriceHistory", "Model" RESTART IDENTITY CASCADE')

            for item in catalog:
                cur.execute(
                    '''
                    INSERT INTO "Model" (
                        "ckArticleId", year, driver, team, car, series, race,
                        brand, scale, link, currency, "isBlacklisted", "isWishlisted",
                        "createdAt", "updatedAt"
                    ) VALUES (
                        %(ckArticleId)s, %(year)s, %(driver)s, %(team)s, %(car)s,
                        %(series)s, %(race)s, %(brand)s, %(scale)s, %(link)s,
                        %(currency)s, %(isBlacklisted)s, %(isWishlisted)s, NOW(), NOW()
                    )
                    ON CONFLICT ("ckArticleId") DO UPDATE SET
                        year = EXCLUDED.year,
                        driver = EXCLUDED.driver,
                        team = EXCLUDED.team,
                        "updatedAt" = NOW()
                    RETURNING id
                    ''',
                    item,
                )
                model_id = cur.fetchone()[0]
                inserted_models += 1

                # Insert price history from Canasta
                article = item["ckArticleId"]
                history = price_history.get(article, [])

                # Also add current price from Todos_ck if available
                current_price = item.get("currentPrice")

                for dt, price in history:
                    cur.execute(
                        'INSERT INTO "PriceHistory" ("modelId", price, "scrapedAt") VALUES (%s, %s, %s)',
                        (model_id, price, dt),
                    )
                    inserted_prices += 1

                # Add current price as latest entry if not already covered
                if current_price is not None:
                    cur.execute(
                        'INSERT INTO "PriceHistory" ("modelId", price) VALUES (%s, %s)',
                        (model_id, current_price),
                    )
                    inserted_prices += 1

            conn.commit()
    finally:
        conn.close()

    print(f"✅ Seed complete!")
    print(f"   Models inserted:       {inserted_models}")
    print(f"   Price history entries: {inserted_prices}")
    print(f"   Wishlisted:            {len(wishlist_ids)}")
    print(f"   Blacklisted:           {len(blacklist_ids)}")


if __name__ == "__main__":
    main()
