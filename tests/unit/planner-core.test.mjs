import assert from "node:assert/strict";
import test from "node:test";
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  buildPlannerSelection,
  expandEntries,
  normalizeRepeatDays,
  snapPlannerMinutes,
} from "../../planner-core.mjs";

test("normalizeRepeatDays sorts, deduplicates, and falls back to the entry day", () => {
  assert.deepEqual(normalizeRepeatDays({ day: 4, repeatDays: [4, 2, 2, 9, -1] }), [2, 4]);
  assert.deepEqual(normalizeRepeatDays({ day: 3, repeatDays: [] }), [3]);
});

test("expandEntries materializes weekly occurrences in day order", () => {
  const occurrences = expandEntries([
    {
      id: "a",
      day: 2,
      start: "16:00",
      end: "17:00",
      repeatMode: "weekly",
      repeatDays: [4, 2],
    },
    {
      id: "b",
      day: 1,
      start: "09:00",
      end: "09:30",
      repeatMode: "none",
    },
  ]);

  assert.deepEqual(
    occurrences.map((occurrence) => [occurrence.entry.id, occurrence.day]),
    [["b", 1], ["a", 2], ["a", 4]],
  );
});

test("planner selection snaps to quarter hours and stays within bounds", () => {
  assert.equal(snapPlannerMinutes(PLANNER_START_MINUTES - 90), PLANNER_START_MINUTES);
  assert.equal(snapPlannerMinutes(PLANNER_END_MINUTES + 90), PLANNER_END_MINUTES - 15);

  assert.deepEqual(buildPlannerSelection(-4, 487, 541), {
    day: 0,
    start: "08:00",
    end: "09:15",
  });

  assert.deepEqual(buildPlannerSelection(99, 1400, 1400), {
    day: 6,
    start: "22:45",
    end: "23:00",
  });
});
