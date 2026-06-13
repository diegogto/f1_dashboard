#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database brand name cleanup script.
Cleans up any brand names containing regulation warnings by extracting the final name.
"""

import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://f1user:f1pass@localhost:5432/f1db")

def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL is not set.")
        return

    print("🔌 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Query models with corrupted brand names
            cur.execute('SELECT id, "ckArticleId", brand FROM "Model" WHERE brand LIKE \'%Regulation%\' OR brand LIKE \'%Warnings%\'')
            rows = cur.fetchall()
            print(f"🔍 Found {len(rows)} models with warning strings in their brand name.")

            cleaned = 0
            for model_id, article_id, brand in rows:
                if not brand:
                    continue
                
                # Split by newline and grab the last non-empty line (which is the actual brand name)
                lines = [l.strip() for l in brand.split('\n') if l.strip()]
                if lines:
                    clean_brand = lines[-1]
                    # If the clean brand is 'info', let's see if we can extract it or fallback
                    if clean_brand.lower() == 'info' and len(lines) > 1:
                        # Fallback: maybe the first or another line
                        clean_brand = lines[0]
                    
                    cur.execute('UPDATE "Model" SET brand = %s WHERE id = %s', (clean_brand, model_id))
                    cleaned += 1
                    print(f"   ✨ Cleaned [{article_id}]: {repr(brand[:30])}... -> {repr(clean_brand)}")

            conn.commit()
            print(f"✅ Finished! Cleaned {cleaned} brands successfully.")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
