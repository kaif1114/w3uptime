const fs = require('fs');
const path = require('path');

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node scripts/mark-task-done.js <task_id>');
  process.exit(1);
}

const tasksFilePath = path.join(__dirname, '..', '.taskmaster', 'tasks', 'tasks.json');

// Read the tasks file
const tasksData = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));

// Find and update the task
let taskFound = false;
tasksData.master.tasks.forEach(task => {
  if (task.id === taskId) {
    task.status = 'done';
    taskFound = true;
    console.log(`✓ Marked task ${task.id} (${task.title}) as done`);
  }
});

if (!taskFound) {
  console.error(`Task ${taskId} not found`);
  process.exit(1);
}

// Write the updated data back to the file
fs.writeFileSync(tasksFilePath, JSON.stringify(tasksData, null, 2));

console.log('✅ Successfully updated tasks.json');
