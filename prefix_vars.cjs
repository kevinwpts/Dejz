const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));

for (const result of report) {
  const filePath = result.filePath;
  const messages = result.messages.filter(m => m.ruleId === 'unused-imports/no-unused-vars');
  
  if (messages.length === 0) continue;
  
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  // Sort messages descending by line so modifications don't shift earlier lines
  messages.sort((a, b) => b.line - a.line || b.column - a.column);
  
  for (const m of messages) {
    const match = m.message.match(/'([^']+)'/);
    if (!match) continue;
    const name = match[1];
    
    const ln = m.line - 1;
    let line = lines[ln];
    
    // Naively replace first occurrence of the word on that line
    // Use word boundaries
    const regex = new RegExp(`\\b${name}\\b`);
    lines[ln] = line.replace(regex, `_${name}`);
  }
  
  fs.writeFileSync(filePath, lines.join('\n'));
}
