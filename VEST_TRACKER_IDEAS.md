# VIBES & GRINDS / VEST TRACKER ideas

## Brand positioning
- Keep the original playful spirit, but shift from coffee-shop warmth to a **sports analytics + locker room bulletin** feel.
- Tagline options:
  - "Fit Check. Final Score."
  - "The Vest Effect"
  - "Dressed for Ws"

## Headline toggle concept
Use the top-left headline as a mode switch:
- `VIBES & GRINDS` (current mode)
- `VEST TRACKER` (new mode)

Interaction ideas:
- Click headline opens a two-option dropdown with subtle animation.
- Keyboard shortcut (`V`) cycles modes.
- Persist last selected mode in local storage.

## Fun data display ideas

### 1) Fit leaderboard cards
Show each outfit as a card with:
- Outfit name (e.g., Red Vest, Blue Suit)
- Record (`W-L`)
- Win percentage bar
- "Last seen" opponent

Why it works: instantly answers "which look wins most?"

### 2) Season timeline strip
Horizontal row of games:
- Each game is a chip: opponent + `W/L`
- Chip color maps to result (green win, red loss)
- Small vest icon/color indicates outfit
- OT marker badge when applicable

Why it works: story of momentum + outfit streaks.

### 3) Outfit "thermometer"
Single visual ranking outfits by win rate and sample size:
- High win rate + low sample flagged as "small sample"
- Can sort by total wins or win %

Why it works: avoids overhyping 1-game outfits.

### 4) "What should AJ wear next?" module
Simple recommendation block:
- Best-performing outfit with min sample threshold (e.g., 3+ games)
- Secondary recommendation based on opponent profile (if tracked later)

Why it works: highly shareable and meme-friendly.

### 5) Opponent matchup view
Table grouped by outfit:
- Opponent
- Result
- Context notes (OT, ranked, home/away if added)

Why it works: easy receipts for social posts.

### 6) Streak detector
Badges like:
- "Red Vest: 4-game win streak"
- "Blue Suit bounce-back game"

Why it works: turns static data into narratives.

## Visual direction (less coffee-shop)
- Palette: charcoal, off-white, Badger red accents.
- Typography: bold condensed headline + clean data font.
- UI motifs: scoreboard pills, stitched labels, jersey-number numerals.
- Texture: very subtle grain/noise instead of paper/cafe textures.

## Suggested MVP for one-shot implementation
1. Headline dropdown toggle (`VIBES & GRINDS` / `VEST TRACKER`).
2. Summary row: overall record + best outfit + worst outfit.
3. Outfit leaderboard cards.
4. Recent games timeline.
5. Basic filter: All outfits / specific outfit.

## Data structure suggestion
Each game row:
- opponent
- outfit_name (normalized key)
- result (`W`/`L`)
- overtime (bool)
- game_date (optional but recommended)
- notes (optional)

Normalization tip:
- Merge naming variants (`Red vest`, `Red Vest`) into one canonical key.
- Keep display label separate from key for clean analytics.
