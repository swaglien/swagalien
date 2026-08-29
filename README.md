# Nutrition Tracker

Nutrition Tracker is a browser-based daily nutrition dashboard with a Windows desktop version. It tracks meals, calories, protein, carbohydrates, and fat while keeping the web and Windows clients connected through Supabase.

## Features

- Daily calorie and macro tracking
- Multi-food meals and quick logging
- Maintain, lean bulk, cut, performance, protein focus, and custom goals
- Metric and imperial units
- Feet-and-inches height entry in the Windows app
- Weekly calorie trend view
- Recipe text and file parsing
- Nutrition-label photo scanning with OCR
- Email/password accounts
- Supabase cloud sync between the website and Windows app
- Local storage cache for offline use
- Windows installer with GitHub Release auto-updates

## Website

The website can be deployed as a static site through Vercel. The main web files are:

- `index.html`
- `style.css`
- `script.js`
- `supabase-config.js`

The site includes a **Download Windows app** link that points to the latest GitHub Release installer:

`https://github.com/swaglien/swagalien/releases`

## Supabase setup

The app uses Supabase for authentication and synchronized data. The database contains:

- `profiles`
- `goals`
- `meals`
- `meal_items`

Run the database setup SQL in **Supabase Dashboard -> SQL Editor** before testing cloud sync. Row Level Security policies ensure authenticated users can access only their own records.

The browser and Windows app use the Supabase publishable key. Never put a Supabase `service_role` or secret key in frontend files.

In Supabase Authentication URL Configuration, set the Site URL to the deployed Vercel URL and add that URL to the allowed Redirect URLs.

## Windows app

The Windows app is packaged with Electron. Install Node.js LTS, then run these commands from the project folder:

```powershell
npm install
npm start
```

To build the installer:

```powershell
npm run dist
```

The installer is generated in `dist`.

## Publishing a Windows release

Update the version in `package.json` for every release. Each release must have a higher version than the previous one, such as `1.0.3`.

Build the installer, then create a GitHub Release with the matching tag, for example `v1.0.3`. Upload these generated files:

- `Nutrition Tracker Setup 1.0.3.exe`
- `Nutrition Tracker Setup 1.0.3.exe.blockmap`
- `latest.yml`

The packaged app checks GitHub Releases when it opens, downloads newer versions in the background, and installs them after the app closes.

The current release is `v1.0.2`.

## Data and privacy

Before signing in, data is stored locally in the browser or Windows app. After signing in, profile, goals, meals, and meal items sync to the authenticated Supabase account. Existing local data is not automatically migrated into a new account.

Recipe OCR reads text visible in an uploaded image. It does not infer nutrition from ingredient quantities, and OCR results should be reviewed before adding them to a meal.

## Project structure

```text
index.html            Web app layout
style.css             Web app styles
script.js             Nutrition logic, auth, sync, and OCR workflow
supabase-config.js    Supabase project URL and publishable key
main.js               Electron Windows entry point
preload.js            Restricted Electron update bridge
package.json          Electron and build configuration
WINDOWS-APP.md        Windows build notes
dist/                 Generated Windows installers
```

## Future clients

The Supabase schema and client behavior are designed to be reusable by a future iPhone/SwiftUI client. Apple support is not included in the current release.
