// Domain types shared across the frontend.
// Keep these aligned with schema.sql and the Pages Functions in functions/api/.

export type Sport = 'mens-basketball' | 'womens-basketball' | 'football' | 'other';

export interface Visit {
  id: number;
  date: string;
  coffee_shop_name: string;
  city: string | null;
  opponent: string | null;
  sport: Sport | null;
  coffee_shop_address: string | null;
  coffee_shop_place_id: string | null;
  coffee_shop_lat: number | null;
  coffee_shop_lng: number | null;
  coffee_order: string | null;
  vibe_rating: number;
  coffee_rating: number;
  composite_score: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export type VisitInput = Omit<Visit, 'id' | 'composite_score' | 'created_at'>;

export interface VestGame {
  id: number;
  date: string | null;
  location: 'vs' | '@' | 'N' | string;
  opponent: string;
  ranking: number | null;
  outfit: string;
  result: 'W' | 'L' | '';
  overtime: boolean;
}

export interface VestGameStats {
  espn_event_id: string;
  game_id: number | null;
  wisconsin_score: number | null;
  opponent_score: number | null;
  wisconsin_h1: number | null;
  wisconsin_h2: number | null;
  opponent_h1: number | null;
  opponent_h2: number | null;
  ot_periods: number;
  venue: string | null;
  venue_city: string | null;
  broadcast: string | null;
  attendance: number | null;
  opp_ranking: number | null;
  wi_ranking: number | null;
  wi_record: string | null;
  wi_fg: string | null;
  wi_3pt: string | null;
  wi_ft: string | null;
  wi_rebounds: number | null;
  wi_turnovers: number | null;
  wi_fg_pct: number | null;
  wi_3pt_pct: number | null;
  wi_ft_pct: number | null;
  opp_fg: string | null;
  opp_3pt: string | null;
  opp_ft: string | null;
  opp_rebounds: number | null;
  opp_turnovers: number | null;
  opp_fg_pct: number | null;
  opp_3pt_pct: number | null;
  opp_ft_pct: number | null;
  wi_leader_pts_name: string | null;
  wi_leader_pts_value: string | null;
  wi_leader_reb_name: string | null;
  wi_leader_reb_value: string | null;
  wi_leader_ast_name: string | null;
  wi_leader_ast_value: string | null;
  fetched_at: string;
}

export interface NetRankingEntry {
  team: string;
  rank: number;
  record: string | null;
  key?: string;
}
