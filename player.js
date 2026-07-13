/* global YT, CHANNEL_CONFIG */
(() => {
  "use strict";

  const config = window.CHANNEL_CONFIG;
  const stateText = document.getElementById("broadcast-state");
  const playButton = document.getElementById("play-button");
  const playLabel = document.getElementById("play-label");
  const playIcon = document.getElementById("play-icon");

  document.querySelectorAll("[data-channel-name]").forEach((node) => { node.textContent = config.channelName; });
  document.title = config.channelName;

  let player;
  let currentIndex = -1;
  let isPlaying = false;
  
  // This tracks whether the channel has been turned on yet
  let firstStart = true; 

  function positionAt(now = Date.now()) {
    const total = config.videos.reduce((sum, video) => sum + video.durationSeconds, 0);
    if (!total) throw new Error("Add at least one video to config.");
    let cursor = Math.max(0, Math.floor((now - Date.parse(config.epoch)) / 1000)) % total;
    for (let index = 0; index < config.videos.length; index += 1) {
      if (cursor < config.videos[index].durationSeconds) return { index, offset: cursor };
      cursor -= config.videos[index].durationSeconds;
    }
    return { index: 0, offset: 0 };
  }

  function updateControls(playing) {
    isPlaying = playing;
    
    // SEQUENCE 1: Before the channel is turned on
    if (firstStart && !playing) {
      playLabel.textContent = "Turn on channel";
      playIcon.textContent = "▶";
      stateText.textContent = "Channel ready";
    } 
    // SEQUENCE 2: After it's turned on (Standard Play/Pause)
    else {
      playLabel.textContent = playing ? "Pause" : "Play";
      playIcon.textContent = playing ? "Ⅱ" : "▶";
      stateText.textContent = playing ? "On air" : "Paused";
    }
    
    playButton.setAttribute("aria-label", playing ? "Pause channel" : "Play channel");
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
    
    // SEQUENCE 1: The very first click
    if (firstStart) {
      firstStart = false; // Turn off the "Turn on" state permanently
      playLabel.textContent = "Tuning in..."; // Temporary loading text
      tuneToNow(true);
    } 
    // SEQUENCE 2: All subsequent clicks (Play/Pause)
    else {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        tuneToNow(true);
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
          playButton.disabled = false;
          // Initializes the UI with the "Turn on channel" state
          updateControls(false); 
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

  playButton.addEventListener("click", togglePlayback);
  setInterval(() => { if (isPlaying) tuneToNow(true); }, 5000);

  const api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  api.async = true;
  document.head.appendChild(api);
})();