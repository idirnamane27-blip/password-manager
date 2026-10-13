import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { generatePassword, presets } from '../src/services/generator.js';
globalThis.crypto ||= webcrypto;
test('générateur : longueurs et groupes de caractères des préréglages', () => {
  for (let index = 0; index < 100; index++) {
    for (const options of Object.values(presets)) {
      const password = generatePassword(options);
      assert.equal(password.length, options.length);
      assert.match(password, /[a-z]/);
      if (options.uppercase) assert.match(password, /[A-Z]/); else assert.doesNotMatch(password, /[A-Z]/);
      if (options.digits) assert.match(password, /[0-9]/); else assert.doesNotMatch(password, /[0-9]/);
      if (options.symbols) assert.match(password, /[!@#$%&*+\-=?_]/); else assert.match(password, /^[a-zA-Z0-9]+$/);
    }
  }
});
test('générateur : bornes, caractères exclus et renouvellement', () => {
  for (const length of [6, 64]) assert.equal(generatePassword({ length }).length, length);
  for (const length of [0, 65, 6.5]) assert.throws(() => generatePassword({ length }));
  assert.match(generatePassword({ length: 24, uppercase: false, digits: false, symbols: false }), /^[a-z]{24}$/);
  assert.equal(new Set(Array.from({ length: 30 }, () => generatePassword())).size, 30);
});
