# Firebase setup for NYSA website

## Firestore rules (required for admin save)

In [Firebase Console](https://console.firebase.google.com/) → **nysa-academy** → Firestore → Rules, use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /siteContent/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> For production, restrict `write` to authenticated admins only.

## Collection structure

- Collection: `siteContent`
- Document ID: `main`
- Content is one JSON object (hero, courses, gallery, videos, etc.)

## Admin access

1. On the public site, click the **logo 12 times** (within ~2.5 seconds between first and last click).
2. Enter password: `nysa@123`
3. Admin panel opens in a **new tab** (`admin.html`).

### Home page videos (YouTube links)

- **Hero Section** → *Watch Video — YouTube link* (top hero button)
- **About Video (Home)** → *Play Video — YouTube link* (second section with building image), plus image URL and text

## Files

- `js/site-defaults.js` — default content if Firestore is empty
- `js/firebase-site.js` — load/save helpers
- `admin.html` — section-wise content editor
