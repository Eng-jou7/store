# Yousef Clothes Store

Express + MongoDB app for user login, products, and orders. Deployed on Vercel.

## Local development

1. Copy `.env.example` to `.env` and fill in your values.
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open `http://localhost:3000`

## Deploy on Vercel (required for login to work)

Login and registration need MongoDB in the cloud. Vercel cannot use `localhost` for the database.

### 1. MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com).
2. **Database Access**: create a DB user (username + password).
3. **Network Access**: add `0.0.0.0/0` (allow access from anywhere — required for Vercel).
4. **Connect → Drivers**: copy the connection string, for example:
   `mongodb+srv://USER:PASSWORD@cluster....mongodb.net/login-app?retryWrites=true&w=majority`
5. Replace `<password>` with your DB user password (URL-encode special characters like `@`, `#`, `%`).

### 2. Vercel environment variables

In Vercel: **Project → Settings → Environment Variables**

| Name        | Value                                      |
|-------------|--------------------------------------------|
| `MONGO_URI` | Your full Atlas connection string          |
| `ADMIN_KEY` | Strong admin password (optional but recommended) |

Apply to **Production** (and Preview if you use preview deployments).

### 3. Redeploy

After saving variables: **Deployments → Redeploy** (use “Redeploy without cache”).

Environment variables are not applied to an old deployment until you redeploy.

### 4. Verify login on production

1. Open your live Vercel URL.
2. **Register a new account** on the live site (accounts created locally are not on Atlas unless you use the same `MONGO_URI`).
3. Sign in with that account.
4. If it fails, open **Vercel → Project → Logs** and look for:
   - `MongoDB connection error` → check `MONGO_URI` and Atlas Network Access
   - Other errors under `/api/login` → check Atlas cluster is running (not paused)

## Troubleshooting

- **Server error on login**: usually missing or wrong `MONGO_URI` on Vercel.
- **Invalid email or password**: account may exist only on local MongoDB; register again on the live site.
- **Password with special characters in Atlas**: URL-encode them in the connection string.
