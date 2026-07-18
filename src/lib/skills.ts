import { skills as generatedSkills } from "../../.velite";
import {
  SKILL_CATEGORIES,
  type Skill,
  type SkillCategory,
} from "@/lib/skills-schema";

/** A validated skill plus its compiled MDX body string. */
export type SkillEntry = Skill & { body: string };

/** All skills, sorted by `order` then name (stable within a category). */
export const skills: SkillEntry[] = [...generatedSkills].sort(
  (a, b) => a.order - b.order || a.name.localeCompare(b.name),
);

/** A category paired with its skills, in `SKILL_CATEGORIES` order. */
export interface SkillGroup {
  category: SkillCategory;
  skills: SkillEntry[];
}

/**
 * Skills grouped by category, in the canonical category order, omitting any
 * category that currently has no skills.
 */
export function getSkillGroups(): SkillGroup[] {
  return SKILL_CATEGORIES.map((category) => ({
    category,
    skills: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);
}
