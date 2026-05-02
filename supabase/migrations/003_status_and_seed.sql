-- Add status fields to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'offline'
  CHECK (status IN ('online','in_game','away','offline'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_game text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- ── Seed 20 fake users ────────────────────────────────────────
DO $$
DECLARE
  names text[] := ARRAY[
    'VoidWalker#EUW','NightBlade#001','ShadowRift#EUW','IronForge#EUW','CrimsonAce#EUW',
    'StarForge#EUW','DawnBreaker#EUW','NexusKing#EUW','BladeStorm#EUW','FrostByte#EUW',
    'ViperX#EUW','SilverWing#EUW','HexTech99#EUW','PhantomX#EUW','RuneSeeker#EUW',
    'GoldRush#EUW','TitanFall#EUW','ShadowFox#EUW','CrystalX#EUW','LightBane#EUW'
  ];
  statuses text[] := ARRAY[
    'online','in_game','online','away','offline',
    'in_game','online','offline','in_game','away',
    'online','offline','in_game','online','away',
    'online','in_game','offline','online','in_game'
  ];
  games text[] := ARRAY[
    null, 'Wild Rift', null, null, null,
    'Wild Rift', null, null, 'Wild Rift', null,
    null, null, 'Wild Rift', null, null,
    null, 'Wild Rift', null, null, 'Wild Rift'
  ];
  avatars text[] := ARRAY[
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Jinx.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Zed.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ahri.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Yasuo.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Vi.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Akali.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Thresh.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Kaisa.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Graves.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Lux.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ekko.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Jinx.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ahri.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Zed.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Vi.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Thresh.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Yasuo.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Akali.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Lux.png',
    'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Kaisa.png'
  ];
  fake_id uuid;
  real_user_id uuid;
  i int;
BEGIN
  -- Get the real user's ID
  SELECT id INTO real_user_id FROM public.users WHERE email = 'tutomania2001@gmail.com';

  FOR i IN 1..20 LOOP
    fake_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      fake_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      lower(replace(split_part(names[i], '#', 1), ' ', '')) || i || '@theleague.fake',
      crypt('FakePass123!', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('username', names[i]),
      false, false
    ) ON CONFLICT DO NOTHING;

    -- Insert into public.users
    INSERT INTO public.users (id, email, username, riot_id, avatar_url, wallet_balance, status, current_game)
    VALUES (
      fake_id,
      lower(replace(split_part(names[i], '#', 1), ' ', '')) || i || '@theleague.fake',
      split_part(names[i], '#', 1),
      names[i],
      avatars[i],
      (random() * 500)::numeric(10,2),
      statuses[i],
      games[i]
    ) ON CONFLICT DO NOTHING;

    -- Create accepted friendship with real user
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (real_user_id, fake_id, 'accepted')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
