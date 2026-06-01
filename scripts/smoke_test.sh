#!/usr/bin/env bash
# End-to-end smoke test for TrekNest. Exits 0 if all pass.
set +e
PASS=0
FAIL=0
FAILED=()

check() {
    local name="$1" expected="$2" actual="$3"
    if [ "$actual" = "$expected" ]; then
        PASS=$((PASS+1))
        printf "  [PASS] %s\n" "$name"
    else
        FAIL=$((FAIL+1))
        FAILED+=("$name (expected: $expected, got: $actual)")
        printf "  [FAIL] %s (expected: %s, got: %s)\n" "$name" "$expected" "$actual"
    fi
}

jq_path() { python -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null; }

echo "============================================================"
echo "  1. PUBLIC PAGES"
echo "============================================================"
for p in index group-treks treks accommodations about contact privacy terms; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pages/$p.html")
    check "GET /pages/$p.html" "200" "$code"
done
code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pages/does-not-exist.html")
check "404 on unknown URL" "404" "$code"
n=$(curl -s "http://localhost:8080/pages/does-not-exist.html" | grep -c "This trail doesn't exist")
check "404 page renders branded copy" "1" "$n"

echo ""
echo "============================================================"
echo "  2. PUBLIC API ENDPOINTS"
echo "============================================================"
for path in "/" "/api/treks/" "/api/accommodations/" "/api/events/" "/api/admin/operator" "/api/admin/team"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$path")
    check "GET $path" "200" "$code"
done
n=$(curl -s "http://localhost:5000/api/treks/?tour_type=pilgrimage" | jq_path "len(d)")
check "Pilgrimage count = 4" "4" "$n"
n=$(curl -s "http://localhost:5000/api/accommodations/" | jq_path "len(d)")
check "Accommodation count = 8" "8" "$n"

echo ""
echo "============================================================"
echo "  3. AUTH FLOWS"
echo "============================================================"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"hack_xy","email":"hack@xy.com","password":"x123456","user_type":"trek_organiser"}')
check "Block public trek_organiser registration" "400" "$code"

ADMIN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"TrekNestAdmin!2026"}')
TOKEN=$(echo "$ADMIN" | jq_path "d.get('access_token','')")
[ -n "$TOKEN" ] && check "Admin login returns JWT" "ok" "ok" || check "Admin login returns JWT" "ok" "fail"
mcp=$(echo "$ADMIN" | jq_path "d.get('must_change_password')")
check "Admin must_change_password = False" "False" "$mcp"

GUIDE=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"guide_karma","password":"TrekNestGuide!2026"}')
GTOK=$(echo "$GUIDE" | jq_path "d.get('access_token','')")
[ -n "$GTOK" ] && check "Staff login (guide_karma)" "ok" "ok" || check "Staff login (guide_karma)" "ok" "fail"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}')
check "Wrong password rejected (401)" "401" "$code"

echo ""
echo "============================================================"
echo "  4. ADMIN CRUD FLOWS"
echo "============================================================"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/overview)
check "GET /api/admin/overview" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $GTOK" http://localhost:5000/api/admin/overview)
check "Non-admin blocked from overview" "403" "$code"

NEW=$(curl -s -X POST http://localhost:5000/api/admin/tours \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"Smoke Test Tour","tour_type":"hike","difficulty":"Easy","country":"Bhutan","dzongkhag":"Paro","duration_days":1,"per_person_fee":1000,"stops":[{"stop_name":"Start","altitude":2400}]}')
TID=$(echo "$NEW" | jq_path "d.get('tour_id','')")
[ -n "$TID" ] && check "Create tour via admin" "ok" "ok" || check "Create tour via admin" "ok" "fail"
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "http://localhost:5000/api/admin/tours/$TID" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"description":"Updated"}')
check "Update tour via admin" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:5000/api/admin/tours/$TID" \
    -H "Authorization: Bearer $TOKEN")
check "Delete tour via admin" "200" "$code"

RESULT=$(curl -s -X POST http://localhost:5000/api/admin/upload-image \
    -H "Authorization: Bearer $TOKEN" -F "image=@frontend/assets/treks/druk-path.jpg")
URL=$(echo "$RESULT" | jq_path "d.get('image_url','')")
[ -n "$URL" ] && check "Admin image upload returns URL" "ok" "ok" || check "Admin image upload returns URL" "ok" "fail"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$URL")
check "Uploaded image serves through nginx" "200" "$code"

INV=$(curl -s -X POST http://localhost:5000/api/admin/staff/invite \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"username":"smoke_staff","email":"smoke@treknest.bt","first_name":"Smoke","last_name":"Test"}')
TPW=$(echo "$INV" | jq_path "d.get('temporary_password','')")
[ -n "$TPW" ] && check "Admin invites new staff (returns temp password)" "ok" "ok" || check "Admin invites new staff" "ok" "fail"

NEWSTAFF=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"smoke_staff\",\"password\":\"$TPW\"}")
NMCP=$(echo "$NEWSTAFF" | jq_path "d.get('must_change_password')")
check "New staff must_change_password = True" "True" "$NMCP"

NSTOK=$(echo "$NEWSTAFF" | jq_path "d.get('access_token','')")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/change-password \
    -H "Authorization: Bearer $NSTOK" -H "Content-Type: application/json" \
    -d "{\"old_password\":\"$TPW\",\"new_password\":\"NewSmokePass2026\"}")
check "Staff changes password" "200" "$code"

RELOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"smoke_staff","password":"NewSmokePass2026"}')
RMCP=$(echo "$RELOGIN" | jq_path "d.get('must_change_password')")
check "After password change must_change_password = False" "False" "$RMCP"
SUID=$(echo "$RELOGIN" | jq_path "d.get('user_id','')")
curl -s -o /dev/null -X PATCH "http://localhost:5000/api/admin/users/$SUID/active" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"is_active":false}'

echo ""
echo "============================================================"
echo "  5. TOURIST FLOWS"
echo "============================================================"
EMAILT=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"emailtest","password":"TestPass123"}')
ETOK=$(echo "$EMAILT" | jq_path "d.get('access_token','')")
[ -n "$ETOK" ] && check "Tourist login" "ok" "ok" || check "Tourist login" "ok" "fail"

ROOM_ID=$(curl -s http://localhost:5000/api/accommodations/3 | jq_path "d['rooms'][0]['id'] if d.get('rooms') else ''")
[ -n "$ROOM_ID" ] && check "Got a room ID to test booking" "ok" "ok" || check "Got a room ID" "ok" "fail"

code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/bookings/check-availability?room_id=$ROOM_ID&check_in_date=2027-02-10&check_out_date=2027-02-12")
check "Check room availability" "200" "$code"

BOOK=$(curl -s -X POST http://localhost:5000/api/bookings/ \
    -H "Authorization: Bearer $ETOK" -H "Content-Type: application/json" \
    -d "{\"room_id\":$ROOM_ID,\"check_in_date\":\"2027-02-10\",\"check_out_date\":\"2027-02-12\",\"number_of_guests\":2}")
BID=$(echo "$BOOK" | jq_path "d.get('booking_id','')")
[ -n "$BID" ] && check "Tourist books a room" "ok" "ok" || check "Tourist books a room" "ok" "fail"

n=$(curl -s -H "Authorization: Bearer $ETOK" "http://localhost:5000/api/bookings/?scope=mine" | jq_path "len(d)")
[ "$n" != "" ] && [ "$n" -gt 0 ] && check "Tourist sees own bookings" "ok" "ok" || check "Tourist sees own bookings" "ok" "fail"

code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH http://localhost:5000/api/auth/me \
    -H "Authorization: Bearer $ETOK" -H "Content-Type: application/json" \
    -d '{"phone":"+975-17-999999"}')
check "Tourist updates profile" "200" "$code"

echo ""
echo "============================================================"
echo "  6. NEGATIVE TESTS"
echo "============================================================"
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/staff)
check "Unauth blocked from /admin/staff" "401" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ETOK" http://localhost:5000/api/admin/overview)
check "Tourist blocked from admin overview" "403" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/admin/tours \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"x","tour_type":"safari","dzongkhag":"Paro"}')
check "Invalid tour_type rejected" "400" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/admin/tours \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"tour_type":"trek"}')
check "Missing required tour field rejected" "400" "$code"

echo ""
echo "============================================================"
echo "  RESULTS:  $PASS passed, $FAIL failed"
echo "============================================================"
if [ "$FAIL" -gt 0 ]; then
    printf "\nFailed tests:\n"
    for f in "${FAILED[@]}"; do echo "  - $f"; done
    exit 1
fi
exit 0
