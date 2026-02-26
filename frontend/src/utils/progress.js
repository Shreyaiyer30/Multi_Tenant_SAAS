/**
 * Calculate completion percentage based on task statuses.
 * @param {Array} tasks - List of task objects with a 'status' field.
 * @returns {number} - Completion percentage (0-100).
 */
export function calculateCompletion(tasks = []) {
  if (!tasks.length) return 0;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  return Math.round((doneCount / tasks.length) * 100);
}
