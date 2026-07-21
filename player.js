/* global YT, CHANNEL_CONFIG */
(() => {
  "use strict";

  const config = window.CHANNEL_CONFIG;
  const stateText = document.getElementById("broadcast-state");
  const playButton = document.getElementById("play-button");
  const playLabel = document.getElementById("play-label");
  const playIcon = document.getElementById("play-icon");
  const slotLabel = document.getElementById("slot-label");
  const programNote = document.getElementById("program-note");

  document.querySelectorAll("[data-channel-name]").forEach((node) => {
    node.textContent = config.channelName;
  });
  document.title = config.channelName;

  const SECONDS_PER_DAY = 24 * 60 * 60;
  const MILLISECONDS_PER_DAY = SECONDS_PER_DAY * 1000;

  let player;
  let currentSlotIndex = -1;
  let currentVideoIndex = -1;
  let currentVideoId = "";
  let currentSlotLabel = "";
  let isPlaying = false;
  let firstStart = true;
  const failedVideoIds = new Set();

  function parseClockTime(value) {
    const [hours = 0, minutes = 0, seconds = 0] = value
      .split(":")
      .map((part) => Number.parseInt(part, 10));
    return (hours * 60 * 60) + (minutes * 60) + seconds;
  }

  function configuredDateParts(now = Date.now()) {
    const local = new Date(now);
    return {
      year: local.getFullYear(),
      month: local.getMonth() + 1,
      day: local.getDate(),
      seconds: (local.getHours() * 60 * 60)
        + (local.getMinutes() * 60)
        + local.getSeconds(),
    };
  }

  function secondsInConfiguredDay(now = Date.now()) {
    return configuredDateParts(now).seconds;
  }

  function configuredDayNumber(now = Date.now()) {
    const parts = configuredDateParts(now);
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MILLISECONDS_PER_DAY);
  }

  function scheduleFor(now = Date.now()) {
    const fallback = config.schedule || [];
    if (!config.dailySchedules || !config.monthSchedule) return fallback;

    const parts = configuredDateParts(now);
    const isoDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    const day = String(parts.day);
    const scheduleName = config.monthSchedule[isoDate]
      || config.monthSchedule[day]
      || config.monthSchedule.default;

    return config.dailySchedules[scheduleName] || fallback;
  }

  function slotContains(seconds, start, end) {
    if (start === end) return true;
    if (start < end) return seconds >= start && seconds < end;
    return seconds >= start || seconds < end;
  }

  function elapsedInSlot(seconds, start, end) {
    if (start === end) return seconds;
    if (start < end) return seconds - start;
    return seconds >= start ? seconds - start : (SECONDS_PER_DAY - start) + seconds;
  }

  function videoDuration(video) {
    return Math.max(0, Number(video.durationSeconds) || 0);
  }

  function activeSlotVideos(slot, excludedIds = failedVideoIds) {
    return slot.videos
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => videoDuration(video) > 0 && !excludedIds.has(video.id));
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function slotStartDayNumber(now, seconds, start, end) {
    const dayNumber = configuredDayNumber(now);
    if (start > end && seconds < end) return dayNumber - 1;
    return dayNumber;
  }

  function rotatedSlotVideos(slot, slotIndex, dayNumber, excludedIds = failedVideoIds) {
    const items = activeSlotVideos(slot, excludedIds);
    if (items.length <= 1 || slot.dailyRotation === false) return items;

    const seed = Number.isFinite(slot.rotationSeed) ? slot.rotationSeed : slotIndex * 997;
    const rotation = positiveModulo(dayNumber + seed, items.length);
    return items.slice(rotation).concat(items.slice(0, rotation));
  }

  function slotVideoTotal(items) {
    return items.reduce((sum, item) => sum + videoDuration(item.video), 0);
  }

  function currentProgramCanYield() {
    const schedule = scheduleFor();
    const slot = schedule[currentSlotIndex];
    return Boolean(slot && slot.buffer);
  }

  function positionAt(now = Date.now(), excludedIds = failedVideoIds) {
    const schedule = scheduleFor(now);
    if (!schedule.length) throw new Error("Add at least one schedule slot to config.");

    const seconds = secondsInConfiguredDay(now);

    for (let slotIndex = 0; slotIndex < schedule.length; slotIndex += 1) {
      const slot = schedule[slotIndex];
      const start = parseClockTime(slot.start);
      const end = parseClockTime(slot.end);

      if (!slotContains(seconds, start, end)) continue;

      const dayNumber = slotStartDayNumber(now, seconds, start, end);
      const activeVideos = rotatedSlotVideos(slot, slotIndex, dayNumber, excludedIds);
      const total = slotVideoTotal(activeVideos);
      if (!total) throw new Error(`Add at least one video to the ${slot.label} slot.`);

      let cursor = elapsedInSlot(seconds, start, end) % total;

      for (let index = 0; index < activeVideos.length; index += 1) {
        const item = activeVideos[index];
        const video = item.video;
        const duration = videoDuration(video);
        if (cursor < duration) {
          return {
            slot,
            slotIndex,
            index: item.index,
            video,
            offset: cursor,
          };
        }
        cursor -= duration;
      }
    }

    throw new Error("The current time is not covered by the channel schedule.");
  }

  function renderProgram(position) {
    if (!position) return;
    currentSlotLabel = position.slot.label || "Current program";
    if (slotLabel) slotLabel.textContent = currentSlotLabel;
    if (programNote) programNote.textContent = position.video.title || "You are watching the current program.";
  }

  function updateControls(playing) {
    isPlaying = playing;

    if (firstStart && !playing) {
      playLabel.textContent = "Turn on channel";
      playIcon.textContent = "▶";
      stateText.textContent = "Channel ready";
    } else {
      playLabel.textContent = playing ? "Pause" : "Play";
      playIcon.textContent = playing ? "Ⅱ" : "▶";
      stateText.textContent = playing
        ? `On air - ${currentSlotLabel || "Current program"}`
        : "Paused";
    }

    playButton.setAttribute("aria-label", playing ? "Pause channel" : "Play channel");
  }

  function tuneToNow(autoplay, startAtBeginning = false) {
    if (!player) return;

    const position = positionAt();
    const videoId = position.video.id;
    const startSeconds = startAtBeginning ? 0 : position.offset;
    renderProgram(position);

    if (currentSlotIndex !== position.slotIndex || currentVideoIndex !== position.index) {
      currentSlotIndex = position.slotIndex;
      currentVideoIndex = position.index;
      currentVideoId = videoId;
      const command = autoplay ? "loadVideoById" : "cueVideoById";
      player[command]({ videoId, startSeconds });
      return;
    }

    currentVideoId = videoId;
    if (startAtBeginning) {
      player.seekTo(0, true);
    } else if (Math.abs(player.getCurrentTime() - position.offset) > 4) {
      player.seekTo(position.offset, true);
    }
    if (autoplay) player.playVideo();
  }

  function tuneAfterVideoEnds() {
    const position = positionAt();
    const programChanged = currentSlotIndex !== position.slotIndex
      || currentVideoIndex !== position.index;
    tuneToNow(true, programChanged);
  }

  function togglePlayback() {
    if (!player) return;

    if (firstStart) {
      firstStart = false;
      playLabel.textContent = "Tuning in...";
      tuneToNow(true);
      return;
    }

    if (isPlaying) {
      player.pauseVideo();
    } else {
      tuneToNow(true);
    }
  }

  window.onYouTubeIframeAPIReady = () => {
    const initial = positionAt();
    currentSlotIndex = initial.slotIndex;
    currentVideoIndex = initial.index;
    currentSlotLabel = initial.slot.label;
    renderProgram(initial);

    player = new YT.Player("youtube-player", {
      videoId: initial.video.id,
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
          tuneToNow(false);
          updateControls(false);
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) updateControls(true);
          if (event.data === YT.PlayerState.PAUSED) updateControls(false);
          if (event.data === YT.PlayerState.ENDED) tuneAfterVideoEnds();
        },
        onError: () => {
          if (currentVideoId) failedVideoIds.add(currentVideoId);
          stateText.textContent = "Skipping unavailable program";
          try {
            tuneToNow(!firstStart);
          } catch (error) {
            stateText.textContent = "No embeddable program in this slot";
          }
        },
      },
    });
  };

  playButton.addEventListener("click", togglePlayback);
  setInterval(() => {
    if (!player) return;
    if (isPlaying) {
      const position = positionAt();
      const programChanged = currentSlotIndex !== position.slotIndex
        || currentVideoIndex !== position.index;
      if (programChanged && currentProgramCanYield()) tuneToNow(true, true);
    } else {
      renderProgram(positionAt());
    }
  }, 5000);

  const api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  api.async = true;
  document.head.appendChild(api);
})();
