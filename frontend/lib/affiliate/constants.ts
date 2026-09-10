// Global affiliate-program caps/thresholds — hardcoded constants in round 1
// per the confirmed spec (SolarPanel-Requirements.md, "Confirmed spec —
// Affiliate / Referral Program"). Not admin-configurable yet; round 2 should
// move these into `site_content` the same way `calc_price_*` works today.
// Kept in one shared file so every phase (installer commission-rate
// validation, admin payout-queue threshold, affiliate dashboard UI) reads
// the same source of truth instead of re-declaring the numbers.

export const COMMISSION_PERCENT_MIN = 1;
export const COMMISSION_PERCENT_MAX = 10;
export const COMMISSION_FLAT_MIN = 100;
export const COMMISSION_FLAT_MAX = 5000;

export const PAYOUT_THRESHOLD_THB = 1000;

export const CLICK_RATE_LIMIT_PER_HOUR = 20;

export const AFFILIATE_ATTRIBUTION_WINDOW_DAYS = 30;
