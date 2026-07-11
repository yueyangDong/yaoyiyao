-- ========== 在 Supabase SQL Editor 中执行 ==========

-- 用户档案表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  gender TEXT DEFAULT '',
  birth_year INT,
  birth_month INT,
  birth_day INT,
  birth_hour INT DEFAULT 0,
  birth_minute INT DEFAULT 0,
  birthplace_province TEXT DEFAULT '',
  birthplace_city TEXT DEFAULT '',
  birthplace_district TEXT DEFAULT '',
  birthplace_longitude FLOAT DEFAULT 120,
  birth_calendar TEXT DEFAULT 'solar',
  is_leap_month BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 查询历史表
CREATE TABLE IF NOT EXISTS query_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  module TEXT NOT NULL,
  query_params JSONB DEFAULT '{}',
  result_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- 删除旧策略(如果存在)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own history" ON query_history;
DROP POLICY IF EXISTS "Users can insert own history" ON query_history;

-- 档案策略
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 历史策略
CREATE POLICY "Users can read own history" ON query_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON query_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 新用户自动创建档案
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
