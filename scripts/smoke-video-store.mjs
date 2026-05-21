import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modelSourcePath = path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "model", "timelineModel.js");
const storeSourcePath = path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "store", "videoStore.js");
const tempDir = await mkdtemp(path.join(process.cwd(), ".tmp-vibecut-store-"));
const tempModelPath = path.join(tempDir, "timelineModel.mjs");
const tempStorePath = path.join(tempDir, "videoStore.mjs");

try {
  const modelSource = await readFile(modelSourcePath, "utf8");
  const storeSource = (await readFile(storeSourcePath, "utf8"))
    .replace("../model/timelineModel", "./timelineModel.mjs");

  await writeFile(tempModelPath, modelSource, "utf8");
  await writeFile(tempStorePath, storeSource, "utf8");

  const { getDefaultTracks } = await import(pathToFileURL(tempModelPath).href);
  const { default: useVideoStore } = await import(pathToFileURL(tempStorePath).href);

  const resetStore = (overrides = {}) => {
    useVideoStore.setState({
      clips: [],
      transitions: {},
      transitionItems: [],
      audioTracks: [],
      textOverlays: [],
      tracks: getDefaultTracks(),
      selectedClipId: null,
      selectedTextId: null,
      selectedTransitionId: null,
      selectedAudioTrackId: null,
      totalDuration: 5,
      currentTime: 0,
      _history: [],
      _future: [],
      _historyIndex: -1,
      _historyTransaction: null,
      timelineEditNotice: null,
      ...overrides,
    });
  };

  resetStore({
    clips: [
      { id: "clip-a", name: "Clip A", url: "/a.webm", trimStart: 0, trimEnd: 3, duration: 3, speed: 1, volume: 100 },
      { id: "clip-b", name: "Clip B", url: "/b.webm", trimStart: 0, trimEnd: 2, duration: 2, speed: 1, volume: 100 },
    ],
    totalDuration: 5,
  });
  useVideoStore.getState().setTransition("clip-a", "clip-b", { type: "crossfade", duration: 0.5, name: "Crossfade" });
  assert.deepEqual(useVideoStore.getState().transitions, {}, "setTransition must not write legacy transition maps");
  assert.equal(useVideoStore.getState().transitionItems.length, 1, "setTransition must write a canonical cut transition item");
  assert.equal(useVideoStore.getState().transitionItems[0].params.placement, "cut", "canonical cut transition must declare placement=cut");
  assert.equal(useVideoStore.getState().transitionItems[0].fromItemId, "clip-a");
  assert.equal(useVideoStore.getState().transitionItems[0].toItemId, "clip-b");
  assert.equal(useVideoStore.getState().totalDuration, 4.5, "canonical cut transition must affect total duration");
  const cutModel = useVideoStore.getState().getTimelineModel();
  assert.equal(cutModel.items.filter((item) => item.type === "transition").length, 1, "canonical cut transition must appear once in the timeline model");
  assert.equal(cutModel.items.filter((item) => item.type === "video")[1].start, 2.5, "canonical cut transition must control video overlap");
  useVideoStore.getState().removeTransition("clip-a", "clip-b");
  assert.equal(useVideoStore.getState().transitionItems.length, 0, "removeTransition must remove canonical cut transition items");
  assert.equal(useVideoStore.getState().totalDuration, 5, "removing canonical cut transition must restore total duration");

  resetStore({
    clips: [
      { id: "clip-a", name: "Clip A", url: "/a.webm", trimStart: 0, trimEnd: 3, duration: 3, speed: 1, volume: 100 },
      { id: "clip-b", name: "Clip B", url: "/b.webm", trimStart: 0, trimEnd: 2, duration: 2, speed: 1, volume: 100 },
      { id: "clip-c", name: "Clip C", url: "/c.webm", trimStart: 0, trimEnd: 1, duration: 1, speed: 1, volume: 100 },
    ],
    totalDuration: 6,
  });
  useVideoStore.getState().setTransition("clip-a", "clip-b", { type: "crossfade", duration: 0.5 });
  useVideoStore.getState().setTransition("clip-b", "clip-c", { type: "flash", duration: 0.25 });
  useVideoStore.getState().reorderClips(2, 0);
  assert.deepEqual(useVideoStore.getState().clips.map((clip) => clip.id), ["clip-c", "clip-a", "clip-b"], "reorder must move clips before reassigning cut slots");
  assert.deepEqual(useVideoStore.getState().transitions, {}, "reorder must not recreate legacy transition maps");
  assert.equal(useVideoStore.getState().transitionItems.length, 2, "reorder must preserve cut transition slots as canonical items");
  assert.ok(useVideoStore.getState().transitionItems.some((item) => item.fromItemId === "clip-c" && item.toItemId === "clip-a" && item.duration === 0.5));
  assert.ok(useVideoStore.getState().transitionItems.some((item) => item.fromItemId === "clip-a" && item.toItemId === "clip-b" && item.duration === 0.25));
  assert.equal(useVideoStore.getState().totalDuration, 5.25, "reassigned canonical cut slots must affect reordered duration");
  const reorderedCutModel = useVideoStore.getState().getTimelineModel();
  const reorderedVideos = reorderedCutModel.items.filter((item) => item.type === "video");
  assert.equal(reorderedVideos[1].start, 0.5, "first reassigned cut slot must overlap reordered clips");
  assert.equal(reorderedVideos[2].start, 3.25, "second reassigned cut slot must overlap reordered clips");

  resetStore();
  useVideoStore.getState().addTransitionItem({ id: "tr-a", type: "flash", startTime: 0, duration: 1, trackId: "transition-main" });
  useVideoStore.getState().addTransitionItem({ id: "tr-b", type: "fade", startTime: 0.5, duration: 1, trackId: "transition-main" });
  assert.equal(useVideoStore.getState().transitionItems.length, 1, "transition-main must reject overlapping transitions by default");
  assert.equal(useVideoStore.getState().timelineEditNotice?.code, "track-overlap", "transition overlap rejection must expose an edit notice");

  resetStore({
    tracks: getDefaultTracks().map((track) => track.id === "transition-main" ? { ...track, allowOverlap: true } : track),
  });
  useVideoStore.getState().addTransitionItem({ id: "tr-a", type: "flash", startTime: 0, duration: 1, trackId: "transition-main" });
  useVideoStore.getState().addTransitionItem({ id: "tr-b", type: "fade", startTime: 0.5, duration: 1, trackId: "transition-main" });
  assert.equal(useVideoStore.getState().transitionItems.length, 2, "allowOverlap=true should accept overlapping transitions");
  assert.equal(useVideoStore.getState().timelineEditNotice, null, "accepted transition edit must clear stale edit notices");
  useVideoStore.getState().updateTransitionItem("tr-b", { startTime: 0.2, endTime: 1.2 });
  assert.equal(useVideoStore.getState().transitionItems.find((item) => item.id === "tr-b").startTime, 0.2, "transition update should honor allowOverlap=true");

  resetStore({
    tracks: getDefaultTracks().map((track) => track.id === "music-main" ? { ...track, locked: true } : track),
  });
  useVideoStore.getState().addAudioTrack({ id: "locked-music", name: "Locked Music", url: "/locked.mp3", startTime: 0, duration: 1, endTime: 1, trackId: "music-main" });
  assert.equal(useVideoStore.getState().audioTracks.length, 0, "locked music track must reject audio additions");
  assert.equal(useVideoStore.getState().timelineEditNotice?.code, "track-locked", "locked track rejection must expose an edit notice");
  useVideoStore.getState().clearTimelineEditNotice();
  assert.equal(useVideoStore.getState().timelineEditNotice, null, "timeline edit notices must be clearable");

  resetStore();
  useVideoStore.getState().addAudioTrack({ id: "music-a", name: "Music A", url: "/a.mp3", startTime: 0, duration: 2, endTime: 2, trackId: "music-main" });
  useVideoStore.getState().addAudioTrack({ id: "music-b", name: "Music B", url: "/b.mp3", startTime: 1, duration: 2, endTime: 3, trackId: "music-main" });
  assert.equal(useVideoStore.getState().audioTracks.length, 1, "music-main must reject overlapping audio by default");
  assert.equal(useVideoStore.getState().timelineEditNotice?.code, "track-overlap", "audio overlap rejection must expose an edit notice");

  resetStore();
  useVideoStore.getState().addAudioTrack({ id: "music-a", name: "Music A", url: "/a.mp3", startTime: 0, duration: 1, endTime: 1, trackId: "music-main" });
  useVideoStore.getState().addAudioTrack({ id: "music-b", name: "Music B", url: "/b.mp3", startTime: 1.2, duration: 1, endTime: 2.2, trackId: "music-main" });
  assert.equal(useVideoStore.getState().audioTracks.length, 2, "non-overlapping music items should be accepted");
  useVideoStore.getState().updateAudioTrack("music-b", { startTime: 0.5, endTime: 1.5 });
  assert.equal(useVideoStore.getState().audioTracks.find((track) => track.id === "music-b").startTime, 1.2, "music update must reject overlap");

  useVideoStore.setState({ _history: [], _future: [], _historyIndex: -1 });
  useVideoStore.getState().updateTimelineItem("music-b", { startTime: 0.5, endTime: 1.5 }, { history: true });
  assert.equal(useVideoStore.getState().audioTracks.find((track) => track.id === "music-b").startTime, 1.2, "timeline item update must reject overlap");
  assert.equal(useVideoStore.getState()._history.length, 0, "rejected timeline item update must not push undo history");
  assert.equal(useVideoStore.getState().timelineEditNotice?.code, "track-overlap", "rejected timeline item update must expose an edit notice");

  useVideoStore.getState().beginHistoryTransaction("invalid-music-drag");
  useVideoStore.getState().updateTimelineItem("music-b", { startTime: 0.5, endTime: 1.5 });
  useVideoStore.getState().commitHistoryTransaction();
  assert.equal(useVideoStore.getState().audioTracks.find((track) => track.id === "music-b").startTime, 1.2, "rejected drag transaction must keep audio unchanged");
  assert.equal(useVideoStore.getState()._history.length, 0, "rejected drag transaction must not leave an undo snapshot");
  assert.equal(useVideoStore.getState()._historyTransaction, null, "rejected drag transaction must close cleanly");

  useVideoStore.getState().beginHistoryTransaction("valid-music-drag");
  useVideoStore.getState().updateTimelineItem("music-b", { startTime: 2.5, endTime: 3.5 });
  useVideoStore.getState().commitHistoryTransaction();
  assert.equal(useVideoStore.getState().audioTracks.find((track) => track.id === "music-b").startTime, 2.5, "valid drag transaction must update audio");
  assert.equal(useVideoStore.getState()._history.length, 1, "valid drag transaction must keep one undo snapshot");
  assert.equal(useVideoStore.getState().timelineEditNotice, null, "valid drag transaction must clear stale edit notices");

  resetStore({
    tracks: getDefaultTracks().map((track) => track.id === "music-main" ? { ...track, allowOverlap: true } : track),
  });
  useVideoStore.getState().addAudioTrack({ id: "music-a", name: "Music A", url: "/a.mp3", startTime: 0, duration: 2, endTime: 2, trackId: "music-main" });
  useVideoStore.getState().addAudioTrack({ id: "music-b", name: "Music B", url: "/b.mp3", startTime: 1, duration: 2, endTime: 3, trackId: "music-main" });
  assert.equal(useVideoStore.getState().audioTracks.length, 2, "allowOverlap=true should accept overlapping music items");

  resetStore();
  useVideoStore.getState().addTextOverlay({ content: "A", startTime: 0, endTime: 2, trackId: "text-main" });
  useVideoStore.getState().addTextOverlay({ content: "B", startTime: 1, endTime: 3, trackId: "text-main" });
  assert.equal(useVideoStore.getState().textOverlays.length, 2, "text-main should allow overlap by default");

  resetStore({
    tracks: getDefaultTracks().map((track) => track.id === "text-main" ? { ...track, allowOverlap: false } : track),
  });
  useVideoStore.getState().addTextOverlay({ content: "A", startTime: 0, endTime: 1, trackId: "text-main" });
  useVideoStore.getState().addTextOverlay({ content: "B", startTime: 0.5, endTime: 1.5, trackId: "text-main" });
  assert.equal(useVideoStore.getState().textOverlays.length, 1, "text-main should reject overlap when allowOverlap=false");

  console.log("Video store smoke passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
