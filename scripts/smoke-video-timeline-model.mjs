import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "model", "timelineModel.js");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-timeline-model-"));
const tempModulePath = path.join(tempDir, "timelineModel.mjs");

try {
  const source = await readFile(sourcePath, "utf8");
  await writeFile(tempModulePath, source, "utf8");

  const {
    buildTimelineModel,
    buildExportFrameSchedule,
    clampVolumePercent,
    findTransitionItemOverlap,
    resolveActiveTransition,
    resolveTimelineRenderPlan,
    resolveTimelineTransitions,
    validateExportTimeline,
    validateTimelineRenderPlan,
  } = await import(pathToFileURL(tempModulePath).href);

  const clips = [
    { id: "clip-a", name: "Clip A", url: "/a.webm", trimStart: 0, trimEnd: 3, duration: 3, speed: 1, volume: 80 },
    { id: "clip-b", name: "Clip B", url: "/b.webm", trimStart: 0, trimEnd: 2, duration: 2, speed: 1, volume: 80 },
  ];
  const transitions = {
    "clip-a->clip-b": { type: "crossfade", duration: 0.5 },
  };
  const transitionItems = [
    { id: "tr-free", type: "flash", start: 1.2, duration: 0.4, trackId: "transition-main" },
  ];
  const textOverlays = [
    { id: "txt-1", content: "Intro", startTime: 0.1, endTime: 1.4, trackId: "text-main" },
  ];
  const audioTracks = [
    { id: "music-1", name: "Music", url: "/music.mp3", startTime: 0, duration: 6, endTime: 6, volume: 70, trackId: "music-main" },
  ];
  const totalDuration = 4.5;

  const model = buildTimelineModel({ clips, transitions, transitionItems, textOverlays, audioTracks, totalDuration });
  const videoItems = model.items.filter((item) => item.type === "video");
  assert.equal(videoItems.length, 2);
  assert.equal(videoItems[0].start, 0);
  assert.equal(videoItems[0].duration, 3);
  assert.equal(videoItems[1].start, 2.5);
  assert.equal(videoItems[1].duration, 2);
  const transitionModelItems = model.items.filter((item) => item.type === "transition");
  const modelCutTransition = transitionModelItems.find((item) => item.params.placement === "cut");
  const modelFreeTransition = transitionModelItems.find((item) => item.params.placement === "free");
  assert.equal(transitionModelItems.length, 2);
  assert.equal(modelCutTransition.params.editable, false);
  assert.equal(modelCutTransition.start, 2.5);
  assert.equal(modelFreeTransition.params.editable, true);
  assert.equal(modelFreeTransition.start, 1.2);

  const canonicalTransitions = resolveTimelineTransitions({ clips, transitions, transitionItems, totalDuration });
  const cutTransition = canonicalTransitions.find((transition) => transition.params.placement === "cut");
  const freeTransition = canonicalTransitions.find((transition) => transition.params.placement === "free");
  assert.equal(canonicalTransitions.length, 2);
  assert.equal(cutTransition.fromItemId, "clip-a");
  assert.equal(cutTransition.toItemId, "clip-b");
  assert.equal(cutTransition.start, 2.5);
  assert.equal(cutTransition.duration, 0.5);
  assert.equal(freeTransition.id, "tr-free");

  assert.equal(resolveActiveTransition(transitionItems, 1.3, totalDuration).id, "tr-free");
  assert.equal(resolveActiveTransition(transitionItems, 2.0, totalDuration), null);
  assert.equal(resolveActiveTransition(canonicalTransitions, 2.6, totalDuration).fromItemId, "clip-a");
  assert.equal(resolveActiveTransition(canonicalTransitions, 2.6, totalDuration).toItemId, "clip-b");

  const plan = resolveTimelineRenderPlan({ clips, transitions, transitionItems, textOverlays, audioTracks, totalDuration });
  assert.equal(plan.clips.length, 2);
  assert.equal(plan.transitionItems.length, 1);
  assert.equal(plan.allTransitions.length, 2);
  assert.equal(plan.textOverlays.length, 1);
  assert.equal(plan.audioTracks.length, 1);
  assert.equal(plan.playbackClips[0].volume, 80);

  assert.equal(clampVolumePercent(-20), 0);
  assert.equal(clampVolumePercent(250), 100);
  const clampedVolumePlan = resolveTimelineRenderPlan({
    clips: [{ ...clips[0], volume: -20 }],
    transitions: {},
    transitionItems: [],
    textOverlays: [],
    audioTracks: [{ ...audioTracks[0], volume: 250, endTime: 2, duration: 2 }],
    totalDuration: 3,
  });
  assert.equal(clampedVolumePlan.playbackClips[0].volume, 0);
  assert.equal(clampedVolumePlan.audioTracks[0].volume, 100);

  const mutedPlan = resolveTimelineRenderPlan({
    clips,
    transitions,
    transitionItems,
    textOverlays,
    audioTracks,
    totalDuration,
    tracks: [
      { id: "video-main", type: "video", visible: true, muted: false, locked: false, order: 10 },
      { id: "transition-main", type: "transition", visible: true, muted: false, locked: false, order: 20 },
      { id: "text-main", type: "text", visible: false, muted: false, locked: false, order: 30 },
      { id: "audio-main", type: "audio", visible: true, muted: true, locked: false, order: 40 },
      { id: "music-main", type: "audio", visible: true, muted: true, locked: false, order: 50 },
    ],
  });
  assert.equal(mutedPlan.textOverlays.length, 0);
  assert.equal(mutedPlan.audioTracks.length, 0);
  assert.equal(mutedPlan.playbackClips[0].volume, 0);

  const cleanAudit = validateTimelineRenderPlan({ plan, totalDuration, frameDuration: 1 / 30 });
  assert.deepEqual(cleanAudit.errors, []);
  assert.ok(cleanAudit.warnings.some((warning) => warning.includes("Piste audio tronquee")));

  const gapAudit = validateTimelineRenderPlan({
    totalDuration: 3,
    plan: {
      clips: [
        { id: "a", name: "A", url: "/a.webm", start: 0, duration: 1, trimStart: 0, trimEnd: 1 },
        { id: "b", name: "B", url: "/b.webm", start: 2, duration: 1, trimStart: 0, trimEnd: 1 },
      ],
      transitions: {},
      transitionItems: [],
      audioTracks: [],
    },
  });
  assert.ok(gapAudit.errors.some((error) => error.includes("Trou video")));

  const overlapAudit = validateTimelineRenderPlan({
    totalDuration: 3,
    plan: {
      clips: [
        { id: "a", name: "A", url: "/a.webm", start: 0, duration: 2, trimStart: 0, trimEnd: 2 },
        { id: "b", name: "B", url: "/b.webm", start: 1, duration: 2, trimStart: 0, trimEnd: 2 },
      ],
      transitions: {},
      transitionItems: [],
      audioTracks: [],
    },
  });
  assert.ok(overlapAudit.errors.some((error) => error.includes("Overlap video non couvert")));

  const transitionOverlap = findTransitionItemOverlap([
    { id: "tr-a", type: "flash", start: 0.5, duration: 1, trackId: "transition-main" },
    { id: "tr-b", type: "fade", start: 1.2, duration: 0.5, trackId: "transition-main" },
  ], 3);
  assert.equal(transitionOverlap.trackId, "transition-main");
  assert.equal(transitionOverlap.current.id, "tr-a");
  assert.equal(transitionOverlap.next.id, "tr-b");

  const transitionOverlapAudit = validateTimelineRenderPlan({
    totalDuration: 3,
    plan: {
      clips: [
        { id: "a", name: "A", url: "/a.webm", start: 0, duration: 3, trimStart: 0, trimEnd: 3 },
      ],
      transitions: {},
      transitionItems: [
        { id: "tr-a", type: "flash", start: 0.5, duration: 1, trackId: "transition-main" },
        { id: "tr-b", type: "fade", start: 1.2, duration: 0.5, trackId: "transition-main" },
      ],
      audioTracks: [],
    },
  });
  assert.ok(transitionOverlapAudit.errors.some((error) => error.includes("Overlap transition")));

  const exportAudit = validateExportTimeline({
    clips: plan.clips,
    audioTracks: plan.audioTracks,
    transitionItems: plan.allTransitions,
    totalDuration,
    fps: 8,
    mimeType: "",
  });
  assert.ok(exportAudit.errors.some((error) => error.includes("FPS invalide")));
  assert.ok(exportAudit.errors.some((error) => error.includes("codec")));

  const exactFrameSchedule = buildExportFrameSchedule({ totalDuration: 4.5, fps: 30 });
  assert.equal(exactFrameSchedule.totalFrames, 135);
  assert.equal(exactFrameSchedule.frameDuration, 1 / 30);
  assert.equal(exactFrameSchedule.lastFrameTime, 134 / 30);

  const fractionalFrameSchedule = buildExportFrameSchedule({ totalDuration: 4.52, fps: 30 });
  assert.equal(fractionalFrameSchedule.totalFrames, 136);
  assert.ok(fractionalFrameSchedule.lastFrameTime < fractionalFrameSchedule.totalDuration);
  assert.ok(fractionalFrameSchedule.expectedDuration >= fractionalFrameSchedule.totalDuration);

  console.log("Video timeline model smoke passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
