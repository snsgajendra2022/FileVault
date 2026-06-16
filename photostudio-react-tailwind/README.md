# PhotoStudio React + Tailwind Premium UI

## Main page route

```txt
/
```

## Main app button route

All main buttons now go to:

```txt
https://photostudio.mytiny.us/memories
```

Change this in:

```txt
src/data/config.js
```

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5174/
```

## Build

```bash
npm run build
```

Upload the `dist` folder to your hosting.

## Replace placeholders

In `src/data/config.js`, replace:

```txt
PASTE_GOOGLE_PLAY_STORE_LINK_HERE
PASTE_APP_STORE_LINK_HERE
PASTE_SUPPORT_EMAIL_HERE
```

## Very important

Do not import this full Vite project inside your old Webpack project:

```txt
photostudio-react-tailwind/src/App.jsx
```

Either run this as a separate landing project or copy only `src/components`, `src/data`, and page files into your main project `src` folder.
