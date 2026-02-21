import path from 'path';
import fs from 'fs/promises';
import type { AgentConfig } from './agents.js';

export interface TemplateVars {
  config_dir: string;
  skills_dir: string;
  home_skills_dir: string;
  settings_file: string;
  agent_name: string;
  skills_cli_agent_flag: string;
  _stripFrontmatterFields: string[];
}

export function buildTemplateVars(agent: AgentConfig): TemplateVars {
  return {
    config_dir: agent.configDir,
    skills_dir: agent.skillsDir,
    home_skills_dir: `~/${agent.skillsDir}`,
    settings_file: agent.settingsFile ?? '',
    agent_name: agent.displayName,
    skills_cli_agent_flag: agent.skillsCliAgent ? `--agent ${agent.skillsCliAgent}` : '',
    _stripFrontmatterFields: agent.stripFrontmatterFields ?? [],
  };
}

function stripFrontmatterFields(content: string, fields: string[]): string {
  if (fields.length === 0) return content;

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  let frontmatter = fmMatch[1];
  
  for (const field of fields) {
    frontmatter = frontmatter.replace(new RegExp(`^${field}:[^\\n]*\\n?`, 'm'), '');
  }
  
  frontmatter = frontmatter.split('\n').filter(line => line.trim() !== '').join('\n').trim();

  if (frontmatter === '') {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  }
  
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}

export function processTemplate(content: string, vars: TemplateVars): string {
  let result = content.replace(/\{\{(config_dir|skills_dir|home_skills_dir|settings_file|agent_name|skills_cli_agent_flag)\}\}/g, (_, key: string) => {
    return vars[key as keyof TemplateVars] as string;
  });

  result = stripFrontmatterFields(result, vars._stripFrontmatterFields);

  return result;
}

export async function processSkillTemplates(skillDir: string, agent: AgentConfig): Promise<void> {
  const vars = buildTemplateVars(agent);
  await processDirectoryTemplates(skillDir, vars);
}

async function processDirectoryTemplates(dir: string, vars: TemplateVars): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDirectoryTemplates(fullPath, vars);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const processed = processTemplate(content, vars);
      if (processed !== content) {
        await fs.writeFile(fullPath, processed, 'utf-8');
      }
    }
  }
}
