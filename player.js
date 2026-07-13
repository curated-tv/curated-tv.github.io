/* global YT, CHANNEL_CONFIG */
(() => {
  "use strict";

  const config = window.CHANNEL_CONFIG;
  const stateText = document.getElementById("broadcast-state");
  const startButton = document.getElementById("start-button");
  const startLabel = document.getElementById("start-label");
  const playButton = document.getElementById("play-button");
  const playLabel = document.getElementById("play-label");
  const playIcon = document.getElementById("play-icon");
  document.querySelectorAll("[data-channel-name]").forEach((node) => { node.textContent = config.channelName; });
  document.title = config.channelName;

  let player;
  let currentIndex = -1;
  let isPlaying = false;
  let firstStart = true;

  function positionAt(now = Date.now()) {
    const total = config.videos.reduce((sum, video) => sum + video.durationSeconds, 0);
    if (!total) throw new Error("Add at least one video to playlist.js");
    let cursor = Math.max(0, Math.floor((now - Date.parse(config.epoch)) / 1000)) % total;
    for (let index = 0; index < config.videos.length; index += 1) {
      if (cursor < config.videos[index].durationSeconds) return { index, offset: cursor };
      cursor -= config.videos[index].durationSeconds;
    }
    return { index: 0, offset: 0 };
  }

  function updateControls(playing) {
    isPlaying = playing;
    playLabel.textContent = playing ? "Pause" : "Play";
    playIcon.textContent = playing ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", playing ? "Pause channel" : "Play channel");
    stateText.textContent = playing ? "On air" : "Paused";
  }

  function tuneToNow(autoplay) {
    if (!player) return;
    const { index, offset } = positionAt();
    const videoId = config.videos[index].id;
    if (currentIndex !== index) {
      currentIndex = index;
      const command = autoplay ? "loadVideoById" : "cueVideoById";
      player[command]({ videoId, startSeconds: offset });
    } else {
      if (Math.abs(player.getCurrentTime() - offset) > 4) player.seekTo(offset, true);
      if (autoplay) player.playVideo();
    }
  }

  function togglePlayback() {
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else {
      tuneToNow(true);
      if (firstStart) {
        firstStart = false;
        startButton.hidden = true;
        playButton.disabled = false;
      }
    }
  }

  window.onYouTubeIframeAPIReady = () => {
    const initial = positionAt();
    currentIndex = initial.index;
    player = new YT.Player("youtube-player", {
      videoId: config.videos[initial.index].id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        start: initial.offset,
      },
      events: {
        onReady: () => {
          startButton.disabled = false;
          startLabel.textContent = "Turn on channel";
          stateText.textContent = "Channel ready";
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) updateControls(true);
          if (event.data === YT.PlayerState.PAUSED) updateControls(false);
          if (event.data === YT.PlayerState.ENDED) tuneToNow(true);
        },
        onError: () => { stateText.textContent = "This program cannot be embedded"; },
      },
    });
  };

  startButton.addEventListener("click", togglePlayback);
  playButton.addEventListener("click", togglePlayback);
  setInterval(() => { if (isPlaying) tuneToNow(true); }, 5000);

  const api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  api.async = true;
  document.head.appendChild(api);
})();
