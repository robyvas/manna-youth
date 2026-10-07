# Manna Youth

Check-in prin QR și repartizare automată pe grupe pentru întâlnirile Manna Youth.

- `/in` participanți (fără cont, doar prenumele)
- `/lider` check-in lideri, generare și publicare grupe
- `/admin` setări eveniment, echipă, afiș cu QR

Stack: React + Vite + TypeScript + Tailwind, Firebase (Auth + Firestore `eur3`, plan gratuit Spark), găzduire pe Cloudflare Pages.

## Rulare locală

```bash
npm install
cp .env.example .env.local   # completează cu config-ul web din Firebase
npm run dev
npm test
```

## Deploy pe Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: rădăcina repo-ului
- Variabile de mediu: cele 6 `VITE_FIREBASE_*` din `.env.example`
- `public/_redirects` trimite toate rutele la `index.html`

După primul deploy, adaugă domeniul (ex. `manna-youth.pages.dev`) în Firebase → Authentication → Settings → Authorized domains, altfel login-ul Google nu merge.

## Firebase

- Regulile de securitate sunt în `firestore.rules`. Se publică din consolă (Firestore → Rules) sau cu `npx firebase-tools deploy --only firestore:rules`.
- Primul admin se creează manual în Firestore: colecția `staff`, document cu id = emailul Google (litere mici), câmpuri `email`, `name`, `pid` (text scurt unic), `isAdmin: true`, `isLeader`, `order: 0`. Restul echipei se adaugă din aplicație (Admin → Echipa).
- Nimeni nu își poate scoate singur rolul de admin, deci rămâne mereu cel puțin un admin.

## Date

- `events/current`: evenimentul curent (setări, liderii prezenți, contoare, publicat sau nu)
- `events/current/attendees`: participanții din seara asta
- `events/current/names`: un document per prenume, ca să nu existe dubluri
- `staff/{email}`: echipa (lideri și admini)

„Resetează participanții” golește participanții și check-in-urile liderilor și păstrează setările pentru săptămâna următoare.
