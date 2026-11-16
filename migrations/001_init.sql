-- The Vantillu Co. — e-commerce schema.
-- All money is stored as integer paise. All access is server-side; RLS is enabled
-- on every table with NO policies, and API roles are stripped of privileges, so the
-- Supabase auto-generated REST API cannot read or write any row.

-- ---------- identity ----------
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table customer_profiles (
  user_id    uuid primary key references users(id) on delete cascade,
  full_name  text not null default '',
  mobile     text check (mobile is null or mobile ~ '^[6-9][0-9]{9}$'),
  updated_at timestamptz not null default now()
);

create table admin_roles (
  user_id    uuid primary key references users(id) on delete cascade,
  role       text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table auth_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  meta        jsonb not null default '{}'::jsonb,
  attempts    int  not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index auth_otps_email_created_idx on auth_otps (email, created_at desc);

create table sessions (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expiry_idx on sessions (expires_at);

create table addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  label      text not null default 'Home',
  full_name  text not null,
  mobile     text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  house      text not null,
  street     text not null,
  landmark   text,
  city       text not null,
  district   text not null,
  state      text not null,
  pincode    text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on addresses (user_id);

-- ---------- catalogue ----------
create table categories (
  id          text primary key,
  name        text not null,
  description text not null default '',
  image_url   text not null default '',
  sort_order  int  not null default 0
);

create table product_images (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('image/webp')),
  data         bytea not null,
  created_at   timestamptz not null default now()
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  category_id  text not null references categories(id),
  description  text not null default '',
  image_url    text not null default '',
  image_alt    text not null default '',
  price_paise  int  check (price_paise is null or price_paise >= 0),
  pack_label   text,
  stock        int  not null default 0 check (stock >= 0),
  is_available boolean not null default false,
  archived_at  timestamptz,
  ingredients  text,
  allergens    text,
  net_quantity text,
  shelf_life   text,
  storage      text,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_category_idx on products (category_id);
create index products_active_idx on products (archived_at, sort_order);

-- ---------- delivery ----------
create table delivery_settings (
  id                          smallint primary key check (id = 1),
  delivery_enabled            boolean not null default true,
  delivery_fee_paise          int not null default 0 check (delivery_fee_paise >= 0),
  free_delivery_threshold_paise int check (free_delivery_threshold_paise is null or free_delivery_threshold_paise > 0),
  updated_at                  timestamptz not null default now()
);
insert into delivery_settings (id) values (1);

-- A pattern is a 3-6 digit PIN prefix (e.g. 500 = whole region, 500081 = one PIN).
-- The longest matching pattern wins; enabled=false blocks a PIN inside a wider enabled region.
create table serviceable_postcodes (
  pattern            text primary key check (pattern ~ '^[1-9][0-9]{2,5}$'),
  label              text not null default '',
  enabled            boolean not null default true,
  delivery_fee_paise int check (delivery_fee_paise is null or delivery_fee_paise >= 0),
  created_at         timestamptz not null default now()
);

-- ---------- orders ----------
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  user_id             uuid references users(id) on delete set null,
  idempotency_key     text not null unique,
  cart_hash           text not null,
  status              text not null check (status in (
                        'payment_pending','payment_failed','paid','confirmed','preparing',
                        'dispatched','delivered','cancelled','refund_initiated','refunded')),
  customer_name       text not null,
  mobile              text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  email               text,
  ship_house          text not null,
  ship_street         text not null,
  ship_landmark       text,
  ship_city           text not null,
  ship_district       text not null,
  ship_state          text not null,
  ship_pincode        text not null check (ship_pincode ~ '^[1-9][0-9]{5}$'),
  subtotal_paise      int not null check (subtotal_paise >= 0),
  delivery_fee_paise  int not null check (delivery_fee_paise >= 0),
  total_paise         int not null check (total_paise > 0),
  currency            text not null default 'INR' check (currency = 'INR'),
  razorpay_order_id   text unique,
  courier_name        text,
  tracking_id         text,
  tracking_url        text,
  stock_reserved      boolean not null default true,
  cancel_reason       text,
  expires_at          timestamptz not null,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_total_matches check (total_paise = subtotal_paise + delivery_fee_paise)
);
create index orders_user_idx on orders (user_id, created_at desc);
create index orders_status_idx on orders (status, created_at desc);
create index orders_created_idx on orders (created_at desc);
create index orders_mobile_idx on orders (mobile);
create index orders_email_idx on orders (lower(email));
create index orders_pending_expiry_idx on orders (expires_at) where status in ('payment_pending', 'payment_failed');
create index orders_cart_lookup_idx on orders (mobile, cart_hash, created_at desc);

-- Snapshots: name/description/price/image are copied so later catalogue edits never alter history.
create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  product_slug     text not null,
  name             text not null,
  description      text not null default '',
  image_url        text not null default '',
  pack_label       text,
  unit_price_paise int not null check (unit_price_paise >= 0),
  quantity         int not null check (quantity > 0),
  line_total_paise int not null check (line_total_paise >= 0)
);
create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  razorpay_order_id   text not null,
  razorpay_payment_id text unique,
  status              text not null default 'created' check (status in ('created','authorized','captured','failed','refunded')),
  amount_paise        int not null check (amount_paise > 0),
  method              text,
  failure_code        text,
  failure_reason      text,
  signature_verified  boolean not null default false,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index payments_order_idx on payments (order_id);
create index payments_rzp_order_idx on payments (razorpay_order_id);

create table refunds (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  payment_id         uuid not null references payments(id),
  razorpay_refund_id text unique,
  amount_paise       int not null check (amount_paise > 0),
  status             text not null default 'initiated' check (status in ('initiated','processed','failed')),
  reason             text,
  initiated_by       uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index refunds_order_idx on refunds (order_id);

create table webhook_events (
  event_id     text primary key,
  event        text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- audit & infrastructure ----------
create table order_status_history (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references orders(id) on delete cascade,
  from_status   text,
  to_status     text not null,
  actor_type    text not null check (actor_type in ('system','customer','admin','gateway')),
  actor_user_id uuid references users(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index order_status_history_order_idx on order_status_history (order_id, id);

create table audit_log (
  id            bigint generated always as identity primary key,
  actor_user_id uuid references users(id) on delete set null,
  action        text not null,
  entity        text not null,
  entity_id     text,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

create table notification_outbox (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete cascade,
  channel    text not null default 'email' check (channel in ('email','whatsapp')),
  kind       text not null,
  recipient  text not null,
  subject    text not null,
  body       text not null,
  status     text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts   int not null default 0,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index notification_outbox_status_idx on notification_outbox (status, created_at);

create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);

-- ---------- row level security: deny everything to API roles ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
  end if;
end $$;
