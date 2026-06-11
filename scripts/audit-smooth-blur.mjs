import assert from 'node:assert/strict';
import {
  DEFAULT_SMOOTH_BLUR_CONFIG,
  SMOOTH_BLUR_DIRECTIONS,
  SMOOTH_BLUR_EASE_TYPES,
  SMOOTH_BLUR_LIMITS,
  SMOOTH_BLUR_LOOK_PRESETS,
  SMOOTH_BLUR_PRESETS,
  createDisabledSmoothBlurConfig,
  createRandomSmoothBlurConfig,
  createSmoothBlurEase,
  getSmoothBlurGradientLine,
  normalizeSmoothBlurConfig,
  resolveSmoothBlurLayers,
} from '../src/features/vibefx-shared/utils/smoothBlur.js';

const assertStopsAreSafe = (layers, label) => {
  layers.forEach((layer, layerIndex) => {
    assert.ok(Number.isFinite(layer.blur), `${label}: layer ${layerIndex} blur is finite`);
    assert.ok(layer.blur >= 0, `${label}: layer ${layerIndex} blur is positive`);
    assert.match(layer.cssMask, /^linear-gradient\(/, `${label}: layer ${layerIndex} has css mask`);
    assert.equal(layer.stops.length, 4, `${label}: layer ${layerIndex} has 4 stops`);

    layer.stops.forEach((stop, stopIndex) => {
      assert.ok(Number.isFinite(stop), `${label}: stop ${stopIndex} is finite`);
      assert.ok(stop >= 0 && stop <= 1, `${label}: stop ${stopIndex} is in range`);
      if (stopIndex > 0) {
        assert.ok(stop >= layer.stops[stopIndex - 1], `${label}: stops are monotonic`);
      }
    });
  });
};

const clamped = normalizeSmoothBlurConfig({
  enabled: true,
  direction: 'sideways',
  height: 400,
  precision: 99,
  blur: 999,
  preset: 'bad',
  easeType: 'bad',
  reverse: 1,
});

assert.equal(clamped.direction, DEFAULT_SMOOTH_BLUR_CONFIG.direction);
assert.equal(clamped.height, SMOOTH_BLUR_LIMITS.height.max);
assert.equal(clamped.precision, SMOOTH_BLUR_LIMITS.precision.max);
assert.equal(clamped.blur, SMOOTH_BLUR_LIMITS.blur.max);
assert.equal(clamped.preset, DEFAULT_SMOOTH_BLUR_CONFIG.preset);
assert.equal(clamped.easeType, DEFAULT_SMOOTH_BLUR_CONFIG.easeType);
assert.equal(clamped.reverse, true);

assert.equal(resolveSmoothBlurLayers({ ...DEFAULT_SMOOTH_BLUR_CONFIG, enabled: true, height: 0 }).length, 0);
assert.equal(resolveSmoothBlurLayers({ ...DEFAULT_SMOOTH_BLUR_CONFIG, enabled: true, blur: 0 }).length, 0);

for (const look of SMOOTH_BLUR_LOOK_PRESETS) {
  const config = normalizeSmoothBlurConfig({ ...look.config, enabled: true });
  assert.equal(config.enabled, true, `${look.id}: preset enables smooth blur`);
  assert.ok(config.height >= 34 && config.height <= 70, `${look.id}: height stays tasteful`);
  assert.ok(config.blur >= 34 && config.blur <= 82, `${look.id}: blur stays tasteful`);
  assert.ok(config.precision >= 15 && config.precision <= 24, `${look.id}: precision stays efficient`);
  assertStopsAreSafe(resolveSmoothBlurLayers(config), look.id);
}

const deterministicValues = [0, 0.5, 0.99];
let deterministicIndex = 0;
const randomConfig = createRandomSmoothBlurConfig(() => deterministicValues[deterministicIndex++ % deterministicValues.length]);
assert.equal(randomConfig.enabled, true, 'random config enables smooth blur');
assert.ok(randomConfig.height >= SMOOTH_BLUR_LIMITS.height.min && randomConfig.height <= SMOOTH_BLUR_LIMITS.height.max, 'random height is clamped');
assert.ok(randomConfig.precision >= SMOOTH_BLUR_LIMITS.precision.min && randomConfig.precision <= SMOOTH_BLUR_LIMITS.precision.max, 'random precision is clamped');
assert.ok(randomConfig.blur >= SMOOTH_BLUR_LIMITS.blur.min && randomConfig.blur <= SMOOTH_BLUR_LIMITS.blur.max, 'random blur is clamped');
assertStopsAreSafe(resolveSmoothBlurLayers(randomConfig), 'random');

const disabledConfig = createDisabledSmoothBlurConfig();
assert.equal(disabledConfig.enabled, false, 'disabled config turns smooth blur off');
assert.equal(disabledConfig.height, 0, 'disabled config removes height');
assert.equal(disabledConfig.blur, 0, 'disabled config removes blur');

for (const direction of SMOOTH_BLUR_DIRECTIONS) {
  const line = getSmoothBlurGradientLine(direction, 800, 1000);
  Object.entries(line).forEach(([key, value]) => {
    assert.ok(Number.isFinite(value), `${direction}: ${key} is finite`);
  });

  for (const easeType of SMOOTH_BLUR_EASE_TYPES) {
    for (const preset of SMOOTH_BLUR_PRESETS) {
      const label = `${direction}/${easeType}/${preset}`;
      const config = normalizeSmoothBlurConfig({
        enabled: true,
        direction,
        height: 54,
        precision: 18,
        blur: 64,
        easeType,
        preset,
      });
      const layers = resolveSmoothBlurLayers(config);

      assert.equal(layers.length, config.precision, `${label}: precision maps to layers`);
      assertStopsAreSafe(layers, label);

      const ease = createSmoothBlurEase(config);
      assert.ok(ease(0) >= 0 && ease(0) <= 1, `${label}: ease(0) in range`);
      assert.ok(ease(0.5) >= 0 && ease(0.5) <= 1, `${label}: ease(.5) in range`);
      assert.ok(ease(1) >= 0 && ease(1) <= 1, `${label}: ease(1) in range`);

      const reversed = createSmoothBlurEase({ ...config, reverse: true });
      assert.equal(
        Number((ease(0.25) + reversed(0.25)).toFixed(6)),
        1,
        `${label}: reverse mirrors curve`
      );
    }
  }
}

console.log('Smooth blur audit passed');
