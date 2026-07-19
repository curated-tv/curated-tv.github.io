# Curated Time TV

A static, television-style YouTube channel for GitHub Pages.

The channel now follows a fixed daily IST schedule. Every visitor joins the same current programme for the current time slot.

## Daily schedule

All times are in `Asia/Kolkata`.

| Time | Slot |
|---:|---|
| 01:00-05:00 | Lo-fi music |
| 05:00-06:00 | Shloka |
| 06:00-08:00 | Motivation / thought-provoking |
| 08:00-10:00 | BBC Earth / travel |
| 10:00-12:00 | Cartoon |
| 12:00-15:00 | Bengali classic movie / drama |
| 15:00-18:00 | Science |
| 18:00-21:00 | Bengali classics / Hindustani classical |
| 21:00-22:00 | Health / finance |
| 22:00-23:00 | Short film |
| 23:00-01:00 | Historical biography / speeches / audiobooks |

## Curation rules

- The 18:00-21:00 music slot is only for Bengali classic song traditions performed or recorded before the 1960s, plus North Indian / Hindustani classical music.
- The 12:00-15:00 movie slot is for old Bengali films and Bengali drama-style films from before 1960. Satyajit Ray films are the exception and may be included after 1960.
- New videos should be added only if they fit the relevant slot.
- YouTube videos must allow embedding.

## Add your videos

Open `playlist.js` and add the video to the correct schedule slot:

```js
{
  title: "Video title",
  id: "YOUTUBE_VIDEO_ID",
  durationSeconds: 1234,
}
```

The video ID is the part after `v=` in a YouTube URL. Enter the full duration of each video in seconds.

Videos inside each slot loop until the next slot begins. If a slot has more content than its clock window, the site simply cuts to the next scheduled slot at the boundary.

The player also has a future-ready hook for month-specific schedules. For now, `playlist.js` uses one daily schedule. Later, we can add `dailySchedules` and `monthSchedule` in `playlist.js` without changing the player again.

## Publish with GitHub Pages

1. Create a GitHub repository and upload these files.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then click **Save**.
5. GitHub will show the public address after deployment.

## YouTube limitation

The embedded player has its standard controls, keyboard input, and full-screen button disabled. The video surface is also covered so viewers cannot open YouTube controls. YouTube may still display its logo, ads, consent screens, or other overlays. YouTube does not provide a supported method to remove all branding.

Browsers block autoplay with sound, so a visitor must press **Turn on channel** once. If the visitor pauses and later presses play, the site rejoins the current scheduled position.
