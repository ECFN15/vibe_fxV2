# VibeCut Render Service

Cloud Run FFmpeg MVP for Vibe_CUT Export Pro.

Current scope:

- accepts signed `POST /render` requests from Firebase Functions;
- validates the minimum MP4/H.264/AAC `ExportManifest` contract;
- downloads clip/audio sources from Firebase Storage through `sourceStoragePath`;
- concatenates video clips with FFmpeg, scales/crops or pads to the target format, encodes H.264/AAC MP4;
- uploads `output.mp4` to the requested Firebase Storage path.

Known MVP limits:

- transitions are stored in the manifest but not rendered yet;
- text overlays are stored in the manifest but not rendered yet;
- clip speed, advanced filters, rotation and detailed audio mixing still need full FFmpeg filter mapping;
- progress is coarse because Firestore updates are owned by the calling Function, not by this service.

Required environment:

```bash
EXPORT_SIGNING_SECRET=shared-secret-with-functions
```

Local smoke:

```bash
docker build -t vibecut-render-service render-service
docker run --rm -e EXPORT_SIGNING_SECRET=dev-secret -p 8080:8080 vibecut-render-service
```

Next production steps:

1. Build a robust multi-clip `filter_complex` for speed, rotation, crop geometry, filters, transitions, text and full audio mix.
2. Parse FFmpeg stderr `time=...` and expose progress to Firestore through a trusted callback or queue worker.
3. Add cancellation, retry leases and renderer concurrency limits.
4. Add integration tests against Firebase emulators plus a local FFmpeg fixture.
