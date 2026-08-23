This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SIR — Gestion de clinique dentaire

Clone modernisé de CLINIQ.OS : FR/AR (RTL), 3 portails (Secrétaire, Médecin, Propriétaire), dossier patient avec schéma dentaire, plans de traitement, facturation MRU, stock, comptabilité, messages WhatsApp.

### Stack
Next.js 16 · React 19 · Tailwind v4 · Prisma 6 · PostgreSQL · lucide-react · recharts

### Démarrage local
```bash
npm install
npx prisma migrate deploy
npm run db:seed     # comptes démo (password: sir2026)
npm run dev
```

### Déployer sur Vercel + Supabase
1. Créer un projet Supabase ? copier la *connection string* (pooling, port 6543) :
   `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres`
2. Appliquer le schéma + seed :
   ```bash
   DATABASE_URL="<connection-string>" npx prisma migrate deploy
   DATABASE_URL="<connection-string>" npm run db:seed
   ```
3. Sur vercel.com ? **Add New Project** ? importer `trtui85-dot/sir` (framework détecté automatiquement).
4. Variables d'environnement :
   - `DATABASE_URL` = connection string Supabase
   - `JWT_SECRET` = longue chaîne aléatoire (`openssl rand -hex 32`)
   - `OPENAI_API_KEY` = *(optionnel)* active le nettoyage IA des notes
5. Deploy. Login : `+222000000001 / sir2026` (changer les mots de passe après mise en ligne).
