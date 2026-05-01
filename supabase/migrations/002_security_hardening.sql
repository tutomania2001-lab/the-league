-- Prevent users from directly writing wallet_balance (only Edge Functions can)
create or replace function public.prevent_wallet_direct_update()
returns trigger as $$
begin
  if NEW.wallet_balance <> OLD.wallet_balance and current_setting('role') = 'authenticated' then
    raise exception 'Wallet balance can only be modified by server functions';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger block_direct_wallet_update
  before update on public.users
  for each row execute procedure public.prevent_wallet_direct_update();

-- Prevent users from modifying their own kyc_verified or stripe_customer_id
create or replace function public.prevent_sensitive_field_update()
returns trigger as $$
begin
  if NEW.kyc_verified <> OLD.kyc_verified or NEW.stripe_customer_id <> OLD.stripe_customer_id then
    raise exception 'Sensitive fields can only be modified by server functions';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger block_sensitive_field_update
  before update on public.users
  for each row execute procedure public.prevent_sensitive_field_update();

-- Rate limit: max 5 failed auth attempts tracked via metadata (Supabase handles lockout natively)
-- Enable leaked password protection
-- Note: enable in Dashboard → Auth → Settings → "Enable leaked password protection"

-- Ensure wallet_balance can never go negative at the database level
alter table public.users
  add constraint wallet_balance_non_negative check (wallet_balance >= 0);

-- Ensure transactions amount is always positive
alter table public.transactions
  add constraint transaction_amount_positive check (amount > 0);
