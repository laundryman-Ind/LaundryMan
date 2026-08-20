from pathlib import Path

root = Path(__file__).resolve().parents[1]
func = (root / 'supabase/functions/delete-account/index.ts').read_text(encoding='utf-8')
schema = (root / 'supabase/schema.sql').read_text(encoding='utf-8')

# The function uses a loop: for (const table of userTables) { ... .from(table) ... }
# so we check that 'addresses' appears in the userTables list.
assert "'addresses'" in func, 'delete-account edge function must remove saved addresses'
assert ".eq('user_id', user.id)" in func, 'address cleanup must target the signed-in user'
assert '.delete()' in func, 'delete-account must call .delete()'
assert 'on delete cascade' in schema.lower(), 'address FK should cascade on user deletion'
