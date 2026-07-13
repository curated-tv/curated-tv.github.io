# Curated Time TV

A static, television-style YouTube channel for GitHub Pages. Every visitor joins the same point in the repeating rotation. The public page exposes one custom play/pause control and does not expose the playlist.

## Add your videos

Open `playlist.js` and edit the `videos` array:

```js
videos: [
  { id: "VIDEO_ID", durationSeconds: 245 },
  { id: "ANOTHER_ID", durationSeconds: 612 },
]
```

The video ID is the part after `v=` in a YouTube URL. Enter the full duration of each video in seconds. Videos must allow embedding.

The `epoch` value anchors the rotation. Keep it fixed after publishing if you want all visitors to remain synchronized.

## Publish with GitHub Pages

1. Create a GitHub repository and upload these files.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then click **Save**.
5. GitHub will show the public address after deployment.

## YouTube limitation

The embedded player has its standard controls, keyboard input, and full-screen button disabled. The video surface is also covered so viewers cannot open YouTube controls. YouTube may still display its logo, ads, consent screens, or other overlays. YouTube does not provide a supported method to remove all branding.

Browsers block autoplay with sound, so a visitor must press **Turn on channel** once. If the visitor pauses and later presses play, the site rejoins the current broadcast position.
