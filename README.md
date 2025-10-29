# MGC College Golf Stat Starter

## 1) Setup
```bash
pnpm i   # or npm i / yarn
cp .env.local.example .env.local
# paste your Supabase URL + anon key
```

## 2) Dev
```bash
npm run dev
```


Open http://localhost:3000

- Auth page: `/auth` (magic link)
- Schedule: `/schedule`
- Create Round: `/rounds/new`
- Score Entry: `/rounds/:id/score`

RLS rules are enforced by your Supabase project as defined in the SQL bootstrap you ran.

## Notes
- To appear in "Players" list, users must share a team with you (RLS view on profiles).
- Coaches/Admins can create rounds and manage courses/tees (add courses & tees via Supabase table editor for now).
