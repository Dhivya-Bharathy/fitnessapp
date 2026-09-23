import {
  buildDemicAssessmentSystemPrompt,
  buildDemicAssessmentUserPrompt,
} from '../utils/demic-assessment-prompts';
import type { AssessmentAnswers, DemicAssessmentResult } from '../store/assessmentStore';
import type { GeneratedWorkout } from '../types/ai-coach.types';
import {
  FITNESS_ASSESSMENT_QUESTIONS,
  ASSESSMENT_QUESTION_COUNT,
} from '../data/fitnessAssessmentQuestions';
import { extractJSON } from '../utils/json-parser';
import {
  invokeOpenAiChatContent,
  OpenAiProxyError,
  OPENAI_CHAT_MODEL,
} from './openai-proxy';

export class AssessmentPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentPlanError';
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeWorkout(workout: GeneratedWorkout & { focus_moves?: string[]; demic_story_moves?: string[] }) {
  const focus = workout.focus_moves ?? workout.demic_story_moves;
  return { ...workout, focus_moves: focus, demic_story_moves: undefined };
}

export function countAnsweredQuestions(answers: AssessmentAnswers): number {
  return FITNESS_ASSESSMENT_QUESTIONS.filter((q) => {
    const v = answers[q.id];
    if (q.type === 'text') return typeof v === 'string';
    if (q.type === 'multi' || q.type === 'weekdays') {
      return Array.isArray(v) && v.length > 0;
    }
    return typeof v === 'string' && v.length > 0;
  }).length;
}

function assertAnswersComplete(answers: AssessmentAnswers): void {
  const answered = countAnsweredQuestions(answers);
  const required = ASSESSMENT_QUESTION_COUNT - 1; /* text optional */
  if (answered < required) {
    throw new AssessmentPlanError(
      `Please complete all ${ASSESSMENT_QUESTION_COUNT} questions before generating your plan (${answered}/${ASSESSMENT_QUESTION_COUNT} answered).`,
    );
  }
}

/** Generates AI training + Indian diet from 22-question intake. */
export async function generateDemicAssessmentPlan(
  answers: AssessmentAnswers,
): Promise<DemicAssessmentResult> {
  assertAnswersComplete(answers);

  let content: string;
  try {
    content = await invokeOpenAiChatContent({
      messages: [
        { role: 'system', content: buildDemicAssessmentSystemPrompt() },
        { role: 'user', content: buildDemicAssessmentUserPrompt(answers) },
      ],
      model: OPENAI_CHAT_MODEL,
      temperature: 0.65,
      max_tokens: 2800,
      response_format: { type: 'json_object' },
    });
  } catch (e) {
    const msg = e instanceof OpenAiProxyError ? e.message : String(e);
    throw new AssessmentPlanError(msg);
  }

  const parsed = extractJSON<DemicAssessmentResult>(content);

  if (!parsed?.workout?.exercises?.length || !parsed.indian_diet_plan?.meals?.length) {
    throw new AssessmentPlanError('AI returned an invalid plan. Please try again.');
  }

  parsed.workout = normalizeWorkout({
    ...parsed.workout,
    id: generateId(),
    created_at: new Date().toISOString(),
  });

  return parsed;
}
