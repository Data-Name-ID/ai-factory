import { replaceTemplatesWithAssets } from '../transformer.js';
import type { AgentTransformer, TransformResult } from '../transformer.js';

export class CursorTransformer implements AgentTransformer {
  transform(skillName: string, content: string): TransformResult {
    const { content: newContent, directoryRenames } = replaceTemplatesWithAssets(content);

    return {
      targetDir: skillName,
      targetName: 'SKILL.md',
      content: newContent,
      flat: false,
      directoryRenames,
    };
  }
}
