import assert from 'node:assert/strict';
import { buildTimerId } from '../../src/lib/timerId';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

// happy path
test('buildTimerId builds canonical id for roundIndex 0', () => {
  const id = buildTimerId('game-123', 0);
  assert.equal(id, 'gh:game-123:0');
});

test('buildTimerId trims gameId and works with integer roundIndex', () => {
  const id = buildTimerId('  abc  ', 3);
  assert.equal(id, 'gh:abc:3');
});

// error cases
test('buildTimerId throws if gameId is empty', () => {
  assert.throws(() => buildTimerId('', 0), /gameId is required/);
});

test('buildTimerId throws if roundIndex is negative', () => {
  assert.throws(() => buildTimerId('x', -1), /roundIndex must be a non-negative integer/);
});

test('buildTimerId throws if roundIndex is not an integer', () => {
  assert.throws(() => buildTimerId('x', 1.2), /roundIndex must be a non-negative integer/);
});

console.log('All timerId tests passed.');
