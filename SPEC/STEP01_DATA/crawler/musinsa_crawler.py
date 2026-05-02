"""
무신사 러닝화 크롤러
- 러닝화 검색 결과 상위 제품 수집
- 제품별 리뷰 (텍스트 + 별점) 수집
- data/ 디렉토리에 JSON + CSV 저장
"""

import urllib.request
import urllib.parse
import json
import csv
import time
import os
import sys
from datetime import datetime

# ── 설정 ──────────────────────────────────────────────
MAX_PRODUCTS    = 30    # 수집할 최대 제품 수
REVIEWS_PER_PRODUCT = 100  # 제품당 최대 리뷰 수
SLEEP_BETWEEN_PRODUCTS = 1.5  # 제품 간 대기 시간 (초)
SLEEP_BETWEEN_PAGES   = 0.8   # 리뷰 페이지 간 대기 시간 (초)
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.musinsa.com/",
    "Accept-Language": "ko-KR,ko;q=0.9",
}

# ── 유틸 ──────────────────────────────────────────────
def get(url: str) -> dict | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"  [오류] {url[:80]}... → {e}", file=sys.stderr)
        return None


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# ── Step 1: 제품 목록 수집 ─────────────────────────────
def fetch_products(max_count: int = MAX_PRODUCTS) -> list[dict]:
    """러닝화 검색 결과 상위 N개 제품 수집"""
    products = []
    page = 1
    keyword = urllib.parse.quote("러닝화")

    log(f"제품 목록 수집 시작 (목표: {max_count}개)")

    while len(products) < max_count:
        url = (
            f"https://api.musinsa.com/api2/dp/v2/plp/goods"
            f"?gf=A&keyword={keyword}&sortCode=POPULAR"
            f"&page={page}&isUsed=false&size=60&caller=SEARCH"
        )
        data = get(url)
        if not data:
            break

        items = data.get("data", {}).get("list", [])
        if not items:
            break

        for item in items:
            if len(products) >= max_count:
                break
            products.append({
                "goods_no":    item.get("goodsNo"),
                "goods_name":  item.get("goodsName"),
                "brand":       item.get("brandName"),
                "brand_en":    item.get("brand"),
                "price":       item.get("price"),
                "normal_price":item.get("normalPrice"),
                "sale_rate":   item.get("saleRate", 0),
                "is_sold_out": item.get("isSoldOut", False),
                "thumbnail":   item.get("thumbnail"),
                "url":         item.get("goodsLinkUrl"),
                "gender":      item.get("displayGenderText"),
            })

        log(f"  페이지 {page}: {len(items)}개 → 누계 {len(products)}개")
        page += 1
        time.sleep(0.5)

    log(f"제품 목록 완료: 총 {len(products)}개")
    return products


# ── Step 2: 제품 통계 (평점, 리뷰 수) ──────────────────
def fetch_product_stats(goods_no: int) -> dict:
    """제품의 전체 평점 및 리뷰 수"""
    url = f"https://goods.musinsa.com/api2/review/v1/goods/{goods_no}/reviews/summary"
    data = get(url)
    if not data:
        return {}
    d = data.get("data", {})
    return {
        "avg_rating":    d.get("avgRating"),
        "review_count":  d.get("totalCount"),
        "rating_dist":   d.get("gradeDistribution"),  # 별점 분포
    }


# ── Step 3: 리뷰 수집 ──────────────────────────────────
def fetch_reviews(goods_no: int, max_reviews: int = REVIEWS_PER_PRODUCT) -> list[dict]:
    """제품의 리뷰 목록 수집 (텍스트 + 별점)"""
    reviews = []
    page = 0
    page_size = 20

    while len(reviews) < max_reviews:
        url = (
            f"https://goods.musinsa.com/api2/review/v1/view/list"
            f"?page={page}&pageSize={page_size}"
            f"&goodsNo={goods_no}&sort=up_cnt_desc"
            f"&selectedSimilarNo={goods_no}"
            f"&myFilter=false&hasPhoto=false&isExperience=false"
        )
        data = get(url)
        if not data:
            break

        items = data.get("data", {}).get("list", [])
        if not items:
            break

        for item in items:
            if len(reviews) >= max_reviews:
                break

            content = (item.get("content") or "").strip()
            if not content or len(content) < 10:
                continue

            reviews.append({
                "review_no":    item.get("no"),
                "goods_no":     goods_no,
                "grade":        int(item.get("grade", 0)),
                "content":      content,
                "size_option":  item.get("goodsOption"),       # 구매 사이즈
                "like_count":   item.get("likeCount", 0),
                "has_image":    len(item.get("images") or []) > 0,
                "user_height":  item.get("userProfileInfo", {}).get("userHeight"),
                "user_weight":  item.get("userProfileInfo", {}).get("userWeight"),
                "created_at":   item.get("createDate"),
            })

        has_next = data.get("data", {}).get("pagination", {}).get("hasNext", False)
        if not has_next:
            break

        page += 1
        time.sleep(SLEEP_BETWEEN_PAGES)

    return reviews


# ── Step 4: 저장 ───────────────────────────────────────
def save_products(products: list[dict]):
    os.makedirs(DATA_DIR, exist_ok=True)
    path_json = os.path.join(DATA_DIR, "products.json")
    path_csv  = os.path.join(DATA_DIR, "products.csv")

    with open(path_json, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    if products:
        with open(path_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=products[0].keys())
            writer.writeheader()
            writer.writerows(products)

    log(f"제품 저장: {path_csv}")


def save_reviews(all_reviews: list[dict]):
    os.makedirs(DATA_DIR, exist_ok=True)
    path_json = os.path.join(DATA_DIR, "reviews.json")
    path_csv  = os.path.join(DATA_DIR, "reviews.csv")

    with open(path_json, "w", encoding="utf-8") as f:
        json.dump(all_reviews, f, ensure_ascii=False, indent=2)

    if all_reviews:
        with open(path_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=all_reviews[0].keys())
            writer.writeheader()
            writer.writerows(all_reviews)

    log(f"리뷰 저장: {path_csv} ({len(all_reviews)}건)")


# ── 메인 ───────────────────────────────────────────────
def main():
    log("=== 무신사 러닝화 크롤러 시작 ===")

    # 1. 제품 목록
    products = fetch_products()
    if not products:
        log("제품 수집 실패")
        return

    # 2. 제품별 평점 + 리뷰
    all_reviews = []
    for i, product in enumerate(products):
        gno = product["goods_no"]
        name = product["goods_name"][:30]
        log(f"\n[{i+1}/{len(products)}] {product['brand']} {name} (#{gno})")

        # 평점/리뷰수 추가
        stats = fetch_product_stats(gno)
        product.update(stats)
        log(f"  평점: {stats.get('avg_rating')} | 리뷰: {stats.get('review_count')}건")

        # 리뷰 수집
        reviews = fetch_reviews(gno)
        all_reviews.extend(reviews)
        log(f"  수집된 리뷰: {len(reviews)}건")

        time.sleep(SLEEP_BETWEEN_PRODUCTS)

    # 3. 저장
    save_products(products)
    save_reviews(all_reviews)

    log(f"\n=== 완료 ===")
    log(f"제품: {len(products)}개 | 리뷰: {len(all_reviews)}건")
    log(f"저장 위치: {DATA_DIR}")


if __name__ == "__main__":
    main()
