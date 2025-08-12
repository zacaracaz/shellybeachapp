import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';

const comment = process.argv[2].replace(/^\/apply\s+/, '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log(`Applying GPT request: ${comment}`);

// Get list of tracked files
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);

// Ask GPT what to do
const prompt = `
You are a coding assistant. The user wants to make the following change: "${comment}".
Please provide the exact new content for any files that should be modified.
Reply in JSON array form: [{"file": "relative/path/to/file", "content": "new file content"}]
`;
const gptRes = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
});

let changes;
try {
  changes = JSON.parse(gptRes.choices[0].message.content);
} catch (e) {
  console.error('GPT did not return valid JSON');
  process.exit(1);
}

// Apply changes
for (const change of changes) {
  const filePath = path.join(process.cwd(), change.file);
  fs.writeFileSync(filePath, change.content, 'utf8');
  console.log(`Updated ${change.file}`);
}

// Commit and push
execSync(`git config user.name "github-actions[bot]"`);
execSync(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
execSync(`git checkout -b gpt-apply-${Date.now()}`);
execSync(`git add .`);
execSync(`git commit -m "Apply GPT changes: ${comment}"`);
execSync(`git push origin HEAD`);
