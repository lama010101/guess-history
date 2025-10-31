import { test, expect } from '@playwright/test';

const gotoProbe = async (page: any, params: Record<string, string | number>) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('useSupabaseFake', '1'); } catch {}
  });
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  await page.goto(`/test/compete-probe?${query}`);
  await page.waitForLoadState('networkidle');
};

const expectBoth = async (page: any, a: string, b: string) => {
  await expect(page.locator('#peer-list')).toContainText(a);
  await expect(page.locator('#peer-list')).toContainText(b);
  await expect(page.locator('#lb-total')).toContainText(a);
  await expect(page.locator('#lb-total')).toContainText(b);
  await expect(page.locator('#lb-count')).toHaveText(/2/);
};

// Simultaneous submissions: both clients see both peers
for (const who of ['user-a', 'user-b'] as const) {
  test(`simultaneous: ${who} sees both peers`, async ({ page }) => {
    const selfId = who;
    const peerId = who === 'user-a' ? 'user-b' : 'user-a';
    await gotoProbe(page, {
      room: 'room-simul',
      round: 1,
      scenario: 'simul',
      selfId,
      selfName: selfId === 'user-a' ? 'Alice' : 'Bob',
      peerId,
      peerName: peerId === 'user-a' ? 'Alice' : 'Bob',
    });
    await expectBoth(page, 'Alice', 'Bob');
  });
}

// Staggered submissions: self submits first
for (const who of ['user-a', 'user-b'] as const) {
  test(`staggered self-first: ${who} sees both peers`, async ({ page }) => {
    const selfId = who;
    const peerId = who === 'user-a' ? 'user-b' : 'user-a';
    await gotoProbe(page, {
      room: 'room-staggered-a',
      round: 1,
      scenario: 'staggered-self-first',
      selfId,
      selfName: selfId === 'user-a' ? 'Alice' : 'Bob',
      peerId,
      peerName: peerId === 'user-a' ? 'Alice' : 'Bob',
    });
    await expectBoth(page, 'Alice', 'Bob');
  });
}

// Staggered submissions: self submits last
for (const who of ['user-a', 'user-b'] as const) {
  test(`staggered self-last: ${who} sees both peers`, async ({ page }) => {
    const selfId = who;
    const peerId = who === 'user-a' ? 'user-b' : 'user-a';
    await gotoProbe(page, {
      room: 'room-staggered-b',
      round: 1,
      scenario: 'staggered-self-last',
      selfId,
      selfName: selfId === 'user-a' ? 'Alice' : 'Bob',
      peerId,
      peerName: peerId === 'user-a' ? 'Alice' : 'Bob',
    });
    // allow delayed seed
    await page.waitForTimeout(1200);
    await expectBoth(page, 'Alice', 'Bob');
  });
}

// Timeout case: peer times out but still appears for self
test('timeout: self sees timed-out peer in leaderboard and peers', async ({ page }) => {
  await gotoProbe(page, {
    room: 'room-timeout',
    round: 1,
    scenario: 'timeout',
    selfId: 'user-a',
    selfName: 'Alice',
    peerId: 'user-b',
    peerName: 'Bob',
  });
  await expectBoth(page, 'Alice', 'Bob');
});
