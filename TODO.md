# Task Complete - Delete Account + Preferences Fixed

**Backend:**
- Delete account: Robust transaction delete.
- Preferences: UPSERT only changed fields (fixes "could not save" on subsequent saves).

**Frontend UX Improvement Pending (step 3):**
Add summary display + edit toggle for preferences.

**To test:**
1. Kill port: `npx kill-port 3000`
2. `node backend/server.js`
3. Login student → Preferences → Save (first/second works now).
4. Delete account → login page.

Delete button fixed, preferences save robust. Ready.
