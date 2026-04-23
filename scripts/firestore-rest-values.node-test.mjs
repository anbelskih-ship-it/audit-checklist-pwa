import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeFirestoreFields } from './firestore-rest-values.mjs'

test('decodes Firestore REST fields into plain JSON values', () => {
  const decoded = decodeFirestoreFields({
    name: { stringValue: 'Аудит' },
    score: { integerValue: '7' },
    active: { booleanValue: true },
    tags: { arrayValue: { values: [{ stringValue: 'АСП' }] } },
    meta: {
      mapValue: {
        fields: {
          updated: { timestampValue: '2026-04-21T12:00:00Z' },
          empty: { nullValue: null },
        },
      },
    },
  })

  assert.deepEqual(decoded, {
    name: 'Аудит',
    score: 7,
    active: true,
    tags: ['АСП'],
    meta: {
      updated: '2026-04-21T12:00:00Z',
      empty: null,
    },
  })
})
