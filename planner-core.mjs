export const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const HOURS = Array.from({ length: 17 }, (_, index) => 6 + index);
export const PLANNER_STEP_MINUTES = 15;
export const PLANNER_START_MINUTES = HOURS[0] * 60;
export const PLANNER_END_MINUTES = (HOURS[HOURS.length - 1] + 1) * 60;

export function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function snapPlannerMinutes(minutes) {
  const stepped = Math.round(minutes / PLANNER_STEP_MINUTES) * PLANNER_STEP_MINUTES;
  return Math.max(PLANNER_START_MINUTES, Math.min(stepped, PLANNER_END_MINUTES - PLANNER_STEP_MINUTES));
}

export function buildPlannerSelection(day, startMinutes, endMinutes) {
  const boundedDay = Math.max(0, Math.min(day, DAYS.length - 1));
  const safeStart = snapPlannerMinutes(startMinutes);
  const safeEnd = snapPlannerMinutes(endMinutes);
  const minMinutes = Math.min(safeStart, safeEnd);
  const maxMinutes = Math.max(safeStart, safeEnd) + PLANNER_STEP_MINUTES;

  return {
    day: boundedDay,
    start: minutesToTime(minMinutes),
    end: minutesToTime(Math.min(maxMinutes, PLANNER_END_MINUTES)),
  };
}

export function normalizeRepeatDays(entry) {
  const rawDays = Array.isArray(entry.repeatDays) ? entry.repeatDays : [entry.day];
  const days = [...new Set(rawDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  return days.length ? days.sort((a, b) => a - b) : [entry.day];
}

export function expandEntries(entries) {
  return entries
    .flatMap((entry) => {
      const days = entry.repeatMode === "weekly" ? normalizeRepeatDays(entry) : [entry.day];
      return days.map((day) => ({ entry, day }));
    })
    .sort((a, b) => a.day - b.day || a.entry.start.localeCompare(b.entry.start) || a.entry.end.localeCompare(b.entry.end));
}
