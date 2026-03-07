import assert from "node:assert/strict"
import test from "node:test"
import { formatSourceCards } from "../../services/rag/index.mjs"

test("formatSourceCards returns title/path/snippet/score", () => {
  const cards = formatSourceCards(
    [
      {
        id: "chunk-1",
        content: "  상태 변화는 물질이 고체/액체/기체로 바뀌는 현상이다.  ",
        score: 2.5,
        metadata: {
          title: "과학 1단원 요약",
          path: "lessons/science/ch1.md",
        },
      },
    ],
    { snippetLength: 24 },
  )

  assert.equal(cards.length, 1)
  assert.deepEqual(Object.keys(cards[0]), ["title", "path", "snippet", "score"])
  assert.equal(cards[0].title, "과학 1단원 요약")
  assert.equal(cards[0].path, "lessons/science/ch1.md")
  assert.equal(cards[0].score, 2.5)
  assert.equal(cards[0].snippet.endsWith("..."), true)
})

test("formatSourceCards falls back to id and defaults score", () => {
  const cards = formatSourceCards([
    {
      id: "chunk-9",
      content: "짧은 본문",
    },
  ])

  assert.equal(cards.length, 1)
  assert.equal(cards[0].title, "chunk-9")
  assert.equal(cards[0].path, "chunk-9")
  assert.equal(cards[0].snippet, "짧은 본문")
  assert.equal(cards[0].score, 0)
})
