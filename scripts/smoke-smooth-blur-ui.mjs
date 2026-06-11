import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const demoImagePath = path.resolve('public/assets/vibefx/demo-astronaut.png');

const setRangeValue = async (locator, value) => {
  await locator.evaluate((input, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

const getSliderState = async (page, testId) => (
  page.getByTestId(testId).evaluate((input) => {
    const thumb = input.nextElementSibling?.firstElementChild;
    const valueNode = input.closest('label')?.lastElementChild;
    return {
      min: Number(input.min),
      max: Number(input.max),
      value: Number(input.value),
      thumbLeft: thumb?.style.left || '',
      text: valueNode?.textContent?.trim() || '',
    };
  })
);

const getCoreSliderStates = async (page) => ({
  height: await getSliderState(page, 'smooth-blur-height'),
  precision: await getSliderState(page, 'smooth-blur-precision'),
  blur: await getSliderState(page, 'smooth-blur-blur'),
});

const countChangedSliders = (before, after) => (
  ['height', 'precision', 'blur'].filter((key) => before[key].value !== after[key].value).length
);

const assertPopupIntegrity = async (page, precision) => {
  const layerCount = await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').count();
  assert.equal(layerCount, precision, `preview layer count follows precision ${precision}`);

  const masks = await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').evaluateAll((layers) => (
    layers.map((layer) => ({
      mask: layer.style.webkitMaskImage || layer.style.maskImage,
      filter: layer.style.webkitBackdropFilter || layer.style.backdropFilter,
    }))
  ));

  assert.ok(masks.every((layer) => layer.mask.includes('linear-gradient')), 'all preview layers have gradient masks');
  assert.ok(masks.every((layer) => layer.filter.includes('blur(')), 'all preview layers have blur filters');
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

try {
  await page.goto(`${baseUrl}/studio?workspace=layout`, { waitUntil: 'networkidle' });

  const devBypass = page.getByText(/Contourner l.authentification|Dev Mode/i);
  if (await devBypass.isVisible().catch(() => false)) {
    await devBypass.click();
    await page.waitForTimeout(800);
  }

  await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(demoImagePath);
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return Boolean(canvas?.width && canvas?.height);
  }, null, { timeout: 10_000 });
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /Ouvrir le Flou lisse pro mode/i }).click();
  await page.getByText('Flou lisse', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByTestId('smooth-blur-preview-image').waitFor({ state: 'visible', timeout: 10_000 });

  const previewImage = await page.getByTestId('smooth-blur-preview-image').evaluate((image) => ({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    srcPrefix: image.currentSrc.slice(0, 32),
  }));
  assert.ok(previewImage.naturalWidth > 0, 'smooth blur popup preview image is loaded');
  assert.ok(previewImage.naturalHeight > 0, 'smooth blur popup preview image has height');
  assert.ok(
    previewImage.srcPrefix.startsWith('data:image/') || previewImage.srcPrefix.startsWith('blob:') || previewImage.srcPrefix.startsWith('http'),
    'smooth blur popup preview has a usable image source'
  );

  await page.getByTestId('smooth-blur-reset-all').click();
  const beforeRandom = await getCoreSliderStates(page);
  assert.equal(beforeRandom.height.value, 0, 'reset all creates a clean baseline before random');
  assert.equal(beforeRandom.blur.value, 0, 'reset all removes blur before random');
  assert.equal(await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').count(), 0, 'reset all removes preview layers before random');

  await page.getByTestId('smooth-blur-random').click();
  const afterRandom = await getCoreSliderStates(page);
  assert.ok(countChangedSliders(beforeRandom, afterRandom) >= 2, 'random changes at least two core parameters');
  assert.ok(afterRandom.height.value >= afterRandom.height.min && afterRandom.height.value <= afterRandom.height.max, 'random height stays in bounds');
  assert.ok(afterRandom.precision.value >= afterRandom.precision.min && afterRandom.precision.value <= afterRandom.precision.max, 'random precision stays in bounds');
  assert.ok(afterRandom.blur.value >= afterRandom.blur.min && afterRandom.blur.value <= afterRandom.blur.max, 'random blur stays in bounds');
  await assertPopupIntegrity(page, afterRandom.precision.value);

  await page.getByTestId('smooth-blur-look-caption-pro').click();
  const captionPro = await getCoreSliderStates(page);
  assert.equal(captionPro.height.value, 62, 'caption pro sets expected height');
  assert.equal(captionPro.precision.value, 20, 'caption pro sets expected precision');
  assert.equal(captionPro.blur.value, 68, 'caption pro sets expected blur');
  await assertPopupIntegrity(page, 20);

  await page.getByTestId('smooth-blur-reset-all').click();
  const resetAll = await getCoreSliderStates(page);
  assert.equal(resetAll.height.value, 0, 'reset all removes smooth blur height');
  assert.equal(resetAll.blur.value, 0, 'reset all removes smooth blur radius');
  assert.equal(await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').count(), 0, 'reset all removes preview layers');

  const initialPrecision = await getSliderState(page, 'smooth-blur-precision');
  assert.deepEqual(
    { min: initialPrecision.min, max: initialPrecision.max },
    { min: 5, max: 30 },
    'precision slider exposes the technical bounds'
  );
  assert.ok(
    initialPrecision.value >= initialPrecision.min && initialPrecision.value <= initialPrecision.max,
    'precision slider starts inside its technical bounds'
  );
  await setRangeValue(page.getByTestId('smooth-blur-precision'), 18);
  const normalizedPrecision = await getSliderState(page, 'smooth-blur-precision');
  assert.equal(normalizedPrecision.value, 18, 'precision can be normalized to the v1.1 default');
  assert.match(normalizedPrecision.thumbLeft, /^52(\.\d+)?%$/, 'precision thumb is centered for the v1.1 default');

  await setRangeValue(page.getByTestId('smooth-blur-height'), 0);
  assert.equal(await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').count(), 0, 'height 0 disables layers');

  await setRangeValue(page.getByTestId('smooth-blur-height'), 54);
  await setRangeValue(page.getByTestId('smooth-blur-blur'), 0);
  assert.equal(await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').count(), 0, 'blur 0 disables layers');

  await setRangeValue(page.getByTestId('smooth-blur-blur'), 64);
  await setRangeValue(page.getByTestId('smooth-blur-precision'), 5);
  let precision = await getSliderState(page, 'smooth-blur-precision');
  assert.equal(precision.text, '5', 'precision min label updates');
  assert.equal(precision.thumbLeft, '0%', 'precision min thumb stays inside track');
  await assertPopupIntegrity(page, 5);

  await setRangeValue(page.getByTestId('smooth-blur-precision'), 30);
  precision = await getSliderState(page, 'smooth-blur-precision');
  assert.equal(precision.text, '30', 'precision max label updates');
  assert.equal(precision.thumbLeft, '100%', 'precision max thumb stays inside track');
  await assertPopupIntegrity(page, 30);

  await setRangeValue(page.getByTestId('smooth-blur-precision'), 18);
  await setRangeValue(page.getByTestId('smooth-blur-height'), 75);
  await setRangeValue(page.getByTestId('smooth-blur-blur'), 120);

  const height = await getSliderState(page, 'smooth-blur-height');
  const blur = await getSliderState(page, 'smooth-blur-blur');
  assert.equal(height.text, '75%', 'height label updates with percent');
  assert.equal(blur.text, '120px', 'blur label updates with px');

  const directionMasks = {
    up: (mask) => mask.includes('to top'),
    down: (mask) => mask.includes('linear-gradient(') && !mask.includes('to top') && !mask.includes('to right') && !mask.includes('to left'),
    right: (mask) => mask.includes('to right'),
    left: (mask) => mask.includes('to left'),
  };

  for (const [direction, matchesDirection] of Object.entries(directionMasks)) {
    await page.getByTestId(`smooth-blur-direction-${direction}`).click();
    const firstMask = await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').first().evaluate((layer) => (
      layer.style.webkitMaskImage || layer.style.maskImage
    ));
    assert.ok(matchesDirection(firstMask), `${direction} updates preview mask direction`);
  }

  for (const easeType of ['in', 'out', 'inOut']) {
    await page.getByTestId(`smooth-blur-ease-${easeType}`).click();
    await assertPopupIntegrity(page, 18);
  }

  for (const preset of ['linear', 'sine', 'quad', 'cubic', 'quart', 'quint', 'expo', 'circ']) {
    await page.getByTestId(`smooth-blur-preset-${preset}`).click();
    await assertPopupIntegrity(page, 18);
  }

  await page.getByTestId('smooth-blur-preset-linear').click();
  await page.getByTestId('smooth-blur-ease-in').click();
  const beforeReverse = await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').first().evaluate((layer) => (
    layer.style.webkitBackdropFilter || layer.style.backdropFilter
  ));
  await page.getByTestId('smooth-blur-reverse').click();
  const afterReverse = await page.getByTestId('smooth-blur-preview-layers').locator(':scope > div').first().evaluate((layer) => (
    layer.style.webkitBackdropFilter || layer.style.backdropFilter
  ));
  assert.notEqual(beforeReverse, afterReverse, 'reverse changes the blur curve');

  await page.getByRole('button', { name: 'APPLIQUER' }).click();
  await page.getByText('Flou lisse', { exact: true }).waitFor({ state: 'hidden', timeout: 5_000 });

  console.log('Smooth blur UI smoke passed');
} finally {
  await browser.close();
}
