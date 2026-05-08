# Vibes & Grinds — Product Plan

## Version 1 (built now)

### Must-have now
- Add and edit coffee visits with vibe + coffee ratings.
- Automatic composite score.
- Main feed with sorting and search/filter.
- Visit detail modal with extra notes + photo section.
- Simple dashboard snapshot (visit count + average scores).

### Add later (Version 2)
- Google Maps place auto-fill hardening (better validation and graceful fallback).
- Map view of all shops.
- Shared trip links and export.
- Year-end recap visuals.

## Technical approach (plain language)
- **Frontend:** React + Tailwind for a polished, fast UI.
- **API:** Works in both local Express and Cloudflare Functions.
- **Data:** SQLite/D1 schema aligned so local and cloud behave the same.
- **Modernization:** close feature gaps between local backend and cloud API, improve UX states, and add lightweight analytics cards.

## Complexity
- Overall: **Medium**.
- Biggest risk area: API/schema drift between local development and deployed environment.

## Decisions you'll eventually need to make
- Keep photo uploads simple (current) vs object storage provider (Cloudflare R2/S3).
- Google Maps API budget and restrictions.
- Whether to keep this private or add auth for wider sharing.
