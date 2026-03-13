import type { Scenario } from './MockProtocol';
import { SecurityBreachScenario } from './scenarios/SecurityBreach';

export const ScenarioRegistry: Record<string, Scenario> = {
  'security_breach': SecurityBreachScenario,
  // 可以在这里添加更多剧本
};

export function matchScenario(input: string): Scenario | null {
  const normalizedInput = input.toLowerCase();

  if (normalizedInput.includes('安全') || normalizedInput.includes('审计') || normalizedInput.includes('scan') || normalizedInput.includes('audit')) {
    return SecurityBreachScenario;
  }

  // 默认返回 null，或者可以返回一个通用的“闲聊”剧本
  return null;
}