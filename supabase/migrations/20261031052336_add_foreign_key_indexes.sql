-- Cover foreign keys used by common profile, referral, and review lookups.
create index if not exists connected_accounts_profile_id_idx
  on public.connected_accounts (profile_id);

create index if not exists payout_methods_profile_id_idx
  on public.payout_methods (profile_id);

create index if not exists referrals_referrer_id_idx
  on public.referrals (referrer_id);

create index if not exists reviews_campaign_id_idx
  on public.reviews (campaign_id);
