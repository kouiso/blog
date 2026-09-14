---
name: blog-analytics-report
description: 週次の解析レポートを生成する時に使う。GA4 Data API + Search Console API + Clarity Data Export API から取得し、site/<domain>/report/<YYYY-WW>.md に出力。伸びた/落ちた記事・直帰・スクロール深度・リライト候補を出す。blog-weekly-report Routine から呼ばれる。参照系なので kill-switch の影響を受けない。
---

# blog-analytics-report — 週次解析レポート

## 前提

- `.env` に `GOOGLE_SERVICE_ACCOUNT_JSON` と `CLARITY_API_TOKEN`（未取得ならその旨を report に記録してスキップ）
- Clarity Data Export API は取得範囲が直近1〜3日 → **日次で取り溜める設計**（週次レポートは蓄積分を集計）

## 手順

1. **GA4 Data API**: `runReport` — ページ別 sessions / engagementRate / averageSessionDuration（直近7日と前7日の比較）
2. **Search Console API**: `searchanalytics.query` — ページ別 impressions / clicks / ctr / position
3. **Clarity Data Export API**: 日次蓄積した JSON から scroll depth / dead clicks / rage clicks を集計
4. **`site/<domain>/report/<YYYY-WW>.md` に出力**:

```markdown
# <domain> 週次レポート YYYY-WW

## 伸びた記事 / 落ちた記事
| slug | sessions 前週→今週 | position 変化 | 所感 |

## 直帰・スクロール深度で怪しい記事

## リライト候補（順位下落・低 engagement）
→ keyword/backlog.yaml へ source: rewrite で追記

## 今週の決定と次の一手
（brain 流に「何を決めたか・次の一手」を1〜3行）
```

5. リライト候補は `keyword/backlog.yaml` に `source: rewrite` で追記し、commit/push

## 絶対禁止

- 鍵が無いのに架空の数値を書く（未取得は「未取得」と明記）
- レポートを生成して commit しない（自動コミットが運用の前提）
