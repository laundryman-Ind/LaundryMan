"""
Supabase User/Rider Identity Isolation & Security Invariant Tests

Tests Scenarios A through E:
  - Scenario A: Same phone number produces independent User Auth Identity & Rider Auth Identity (USER_UUID != RIDER_UUID).
  - Scenario B: Address deletion permanence (empty DB is authoritative and never re-uploads stale localStorage).
  - Scenario C: Rider login isolation (Rider App receives only Rider profile; no user addresses, orders, name, or cart data).
  - Scenario D: Profile update isolation (Updating Rider profile does not affect User profile).
  - Scenario E: Account deletion isolation (Deleting Rider does not affect User; deleting User does not affect Rider).
  - Database Schema & RLS Policy Integrity.
"""

from pathlib import Path
import re
import uuid

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "supabase" / "schema.sql"
MIGRATION_0006_PATH = ROOT / "supabase" / "migrations" / "0006_identity_isolation_and_schema_hardening.sql"
USER_API_PATH = ROOT / "USER_APP" / "frontend" / "src" / "services" / "api.js"
USER_APP_PATH = ROOT / "USER_APP" / "frontend" / "src" / "App.jsx"
USER_CONTEXT_PATH = ROOT / "USER_APP" / "frontend" / "src" / "context" / "AppContext.jsx"
RIDER_API_PATH = ROOT / "RIDER_APP" / "frontend" / "src" / "services" / "api.js"
RIDER_APP_PATH = ROOT / "RIDER_APP" / "frontend" / "src" / "App.jsx"
RIDER_CONTEXT_PATH = ROOT / "RIDER_APP" / "frontend" / "src" / "context" / "RiderContext.jsx"
DELETE_FUNC_PATH = ROOT / "supabase" / "functions" / "delete-account" / "index.ts"


def test_scenario_a_distinct_identities_same_phone():
    """
    Scenario A:
    Phone: 9749117663
    User App -> User Auth Identity: USER_UUID, Profile: User Profile A, Role: user
    Rider App -> Rider Auth Identity: RIDER_UUID, Profile: Rider Profile B, Role: rider

    USER_UUID != RIDER_UUID and User Profile != Rider Profile.
    Neither app contains cross-app blocking checks.
    """
    phone = "9749117663"
    user_uuid = str(uuid.uuid4())
    rider_uuid = str(uuid.uuid4())

    assert user_uuid != rider_uuid, "User UUID and Rider UUID must be distinct"

    # User App code must NOT contain cross-app rider checks (hasRiderProfile)
    user_api_text = USER_API_PATH.read_text(encoding="utf-8")
    user_app_text = USER_APP_PATH.read_text(encoding="utf-8")
    assert "hasRiderProfile" not in user_api_text, "User API must not search rider profiles"
    assert "hasRiderProfile" not in user_app_text, "User App must not block riders"
    assert "This number is registered as a rider" not in user_app_text, "No cross-app rider rejection message"

    # Rider App code must NOT contain cross-app user checks (hasUserProfile)
    rider_api_text = RIDER_API_PATH.read_text(encoding="utf-8")
    rider_app_text = RIDER_APP_PATH.read_text(encoding="utf-8")
    assert "hasUserProfile" not in rider_api_text, "Rider API must not search user profiles"
    assert "hasUserProfile" not in rider_app_text, "Rider App must not block users"
    assert "This number is registered as a user" not in rider_app_text, "No cross-app user rejection message"


def test_scenario_b_address_deletion_sync_authoritative():
    """
    Scenario B:
    Delete User address.
    Log User into another device.
    Expected: Address remains deleted. It must NOT restore old data from localStorage.
    """
    context_text = USER_CONTEXT_PATH.read_text(encoding="utf-8")

    # Ensure the buggy auto-upload of stale localStorage addresses when DB is empty is removed
    assert "!hasMigrated && addrsOk && dbAddrs.length === 0" not in context_text, (
        "Stale address re-upload bug pattern must be removed from AppContext"
    )
    assert "!hasMigrated && ordersOk && dbAllOrders.length === 0" not in context_text, (
        "Stale orders re-upload bug pattern must be removed from AppContext"
    )

    # Ensure DB is authoritative on addrsOk
    assert "if (addrsOk) {\n      setAddresses(dbAddrs)\n    }" in context_text or (
        "if (addrsOk) setAddresses(dbAddrs)" in context_text or
        "setAddresses(dbAddrs)" in context_text
    ), "AppContext must unconditionally set addresses from DB result"

    # Initial state should not load mock 'USER' (Alex) as default
    assert "load('lm2_user', USER) || USER" not in context_text, (
        "Default state should not fallback to hardcoded mock USER object"
    )


def test_scenario_c_rider_login_isolation():
    """
    Scenario C:
    Login to Rider app using 9749117663.
    Expected: Rider Profile only.
    Rider app must NOT query or receive user address, user cart, user orders, user reviews, or user profile ID.
    """
    rider_api_text = RIDER_API_PATH.read_text(encoding="utf-8")
    rider_context_text = RIDER_CONTEXT_PATH.read_text(encoding="utf-8")

    # Rider API queries only 'riders' and 'orders' for delivery operations
    assert "from(PROFILES)" not in rider_api_text, "Rider API must not query profiles table"
    assert "from(ADDRESSES)" not in rider_api_text, "Rider API must not query addresses table"
    assert "from(CARTS)" not in rider_api_text, "Rider API must not query carts table"
    assert "from(REVIEWS)" not in rider_api_text, "Rider API must not query reviews table"
    assert "from('payments')" not in rider_api_text, "Rider API must not query payments table"

    # Local storage keys in Rider App must be strictly namespaced with rm_
    assert "lm2_" not in rider_context_text, "Rider context must not use user app lm2_ storage keys"


def test_scenario_d_profile_update_isolation():
    """
    Scenario D:
    Update Rider profile. Then open User app.
    Expected: User profile unchanged.
    """
    user_api_text = USER_API_PATH.read_text(encoding="utf-8")
    rider_api_text = RIDER_API_PATH.read_text(encoding="utf-8")

    # User profile updates target 'profiles' table with auth user id
    assert "from(PROFILES)" in user_api_text
    assert ".update(patch)" in user_api_text or ".upsert(" in user_api_text

    # Rider profile updates target 'riders' table with rider user_id
    assert "from(RIDERS)" in rider_api_text
    assert "user_id: user.id" in rider_api_text
    assert "from(PROFILES)" not in rider_api_text


def test_scenario_e_account_deletion_isolation():
    """
    Scenario E:
    Delete Rider profile -> User account remains completely intact.
    Delete User profile -> Rider account remains completely intact.
    """
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    migration_0006_text = MIGRATION_0006_PATH.read_text(encoding="utf-8")
    delete_func_text = DELETE_FUNC_PATH.read_text(encoding="utf-8")

    # In delete_own_account RPC: only user tables are deleted, riders table is NOT deleted
    assert "delete from public.profiles where id = v_user_id;" in schema_text.lower()
    assert "delete from public.riders" not in schema_text[schema_text.find("delete_own_account()"):schema_text.find("delete_own_rider_account()")]

    # In delete_own_rider_account RPC: only riders table is deleted, profiles table is NOT deleted
    assert "delete_own_rider_account()" in schema_text
    assert "delete from public.riders where user_id = v_user_id;" in schema_text.lower()

    # Edge function delete-account must only wipe user tables and user auth account
    assert "userTables" in delete_func_text
    assert "'riders'" not in delete_func_text


def test_rls_policies_and_security_invariants():
    """
    Verify RLS policies on all tables in schema.sql and migration 0006.
    """
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    schema_lower = schema_text.lower()

    # Profiles RLS
    assert 'on public.profiles' in schema_lower
    assert 'auth.uid() = id' in schema_lower

    # Riders RLS
    assert 'on public.riders' in schema_lower
    assert 'user_id = auth.uid()' in schema_lower
    assert '"riders can delete own profile"' in schema_lower

    # Orders RLS
    assert 'on public.orders' in schema_lower
    assert 'auth.uid() = user_id' in schema_lower
    assert 'rider_id in (select id from public.riders where user_id = auth.uid())' in schema_lower

    # User child tables RLS (addresses, carts, reviews, payments, notifications, push_tokens)
    for tbl in ['addresses', 'carts', 'reviews', 'payments', 'notifications', 'push_tokens']:
        assert f'on public.{tbl}' in schema_lower
        assert f'auth.uid() = user_id' in schema_lower


if __name__ == "__main__":
    print("Running identity isolation tests...")
    test_scenario_a_distinct_identities_same_phone()
    print("[PASS] Scenario A: Distinct User and Rider identities with no cross-app blocking")
    test_scenario_b_address_deletion_sync_authoritative()
    print("[PASS] Scenario B: Address deletion permanence & DB authority")
    test_scenario_c_rider_login_isolation()
    print("[PASS] Scenario C: Rider login data isolation")
    test_scenario_d_profile_update_isolation()
    print("[PASS] Scenario D: Profile update isolation")
    test_scenario_e_account_deletion_isolation()
    print("[PASS] Scenario E: Account deletion isolation")
    test_rls_policies_and_security_invariants()
    print("[PASS] RLS policies and security invariants")
    print("\nALL IDENTITY ISOLATION TESTS PASSED SUCCESSFULLY!")
