// src/utils/gradeUtils.ts

export interface GradeInputs {
    sprintsCompleted: number;
    sprintsExpected: number;
    distractions: number;
    energyLevel: 'on_fumes' | 'meh' | 'full_power';
    taskWeights: { urgent: number; deep: number; strategic: number };
  }
  
  export function calculateGrade({
    sprintsCompleted,
    sprintsExpected,
    distractions,
    energyLevel,
    taskWeights,
  }: GradeInputs): { score: number; letter: string; breakdown: string[] } {
    let score = 100;
    const breakdown: string[] = [];
  
    const sprintRatio = sprintsCompleted / sprintsExpected;
    const energyMultiplier =
      energyLevel === 'full_power' ? 1 : energyLevel === 'meh' ? 0.9 : 0.75;
  
    const sprintScore = Math.min(sprintRatio * 100, 100) * energyMultiplier;
    breakdown.push(`Sprints: ${sprintsCompleted}/${sprintsExpected} → ${Math.round(sprintScore)} pts`);
  
    const distractionPenalty = distractions * 3;
    score -= distractionPenalty;
    breakdown.push(`Distractions: -${distractionPenalty} pts`);
  
    const taskWeightBonus = taskWeights.deep * 2 + taskWeights.strategic * 1.5;
    score += taskWeightBonus;
    breakdown.push(`Task Focus Bonus: +${taskWeightBonus} pts`);
  
    score = Math.max(0, Math.min(score, 100));
  
    const letter =
      score >= 90 ? 'A' :
      score >= 80 ? 'B' :
      score >= 70 ? 'C' :
      score >= 60 ? 'D' :
      'F';
  
    return { score: Math.round(score), letter, breakdown };
  }
  