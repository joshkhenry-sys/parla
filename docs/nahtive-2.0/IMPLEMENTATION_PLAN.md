# Nahtive 2.0 — Implementation Plan

**Status:** Foundation / planning  
**Migration:** Parallel build; production remains untouched  
**Visual direction:** Light theme first  
**Initial course:** Spanish only

## 1. Product objective

Build a focused Spanish-learning platform combining a coherent CEFR-aligned curriculum with AI tutoring, personalized practice, and useful feedback. Learners should understand how Spanish works, construct their own sentences, and communicate naturally in real situations.

Nahtive is not a generic chatbot, random lesson generator, or vocabulary-game clone. The curriculum defines what learners should learn next; AI personalizes practice and feedback within those learning goals.

## 2. Product principles

1. Curriculum before generation: every lesson has a level, objective, prerequisite, target language, and assessment.
2. Active production: learners read, interpret, translate, correct, construct, and retrieve language—not just recognize answers.
3. Accurate level placement: A1–C2 must represent meaningful differences in vocabulary, grammar, reading complexity, and independent production. No A0.
4. Natural Spanish: begin with broadly useful contemporary Latin American Spanish. Label regional variation when relevant.
5. Feedback that teaches: explain why an answer works, identify the actual error, and let the learner apply the correction.
6. Adaptive, not arbitrary: adapt practice to demonstrated strengths and weaknesses without silently lowering the lesson's intended level.
7. Evidence-based progress: track performance over time and across skills; one quiz score is not mastery.
8. Fast, calm interface: light-first, mobile-first, accessible, readable, and focused.

## 3. Initial product scope

### Included in first release
- Spanish onboarding and placement assessment or guided starting-level selection.
- CEFR levels A1, A2, B1, B2, C1, C2.
- Structured course dashboard and lesson navigation.
- Lesson player with reading, vocabulary, grammar, guided practice, independent production, and assessment.
- AI feedback for open-ended answers and sentence construction.
- Targeted practice based on recurring learner errors.
- Review queue for vocabulary and grammar.
- Learner progress by skill and course objective.
- Account persistence and secure learner data access.
- Responsive desktop and mobile layouts.

### Out of scope for first release
- English and French courses or multi-language switching.
- Social feeds, leaderboards, avatars, and heavy gamification.
- Unbounded AI-generated courses without curriculum validation.
- Native mobile apps.
- Speech scoring as a launch dependency. Keep the lesson model extensible for later speaking and pronunciation features.

## 4. Learner experience

### Main navigation
- Home
- My Spanish Course
- Practice
- Review
- Progress
- Settings

### Dashboard
The dashboard should immediately answer:
1. Where am I in my Spanish course?
2. What should I do next?
3. What am I improving at?
4. What should I review?

Primary modules: continue learning, current CEFR level, module and lesson sequence, weekly activity, skill indicators (reading, vocabulary, grammar, sentence construction, independent production), and one actionable review recommendation. Avoid clutter and competing metrics.

## 5. Lesson standard

Every canonical lesson blueprint defines:
- CEFR level and lesson identifier.
- Module and prerequisite.
- Measurable learning objectives.
- Target grammar and communicative function.
- Required vocabulary and useful expressions.
- Reading or dialogue with defined length and complexity.
- Comprehension questions.
- Explicit explanation with examples.
- Guided practice with answer keys and accepted alternatives.
- Independent production task.
- Assessment rubric and mastery criteria.
- Review candidates and remediation paths.

Recommended learner-facing sequence:
1. Objective and real-world context.
2. High-frequency vocabulary and expressions.
3. Reading or dialogue in context.
4. Comprehension questions.
5. Grammar and sentence architecture.
6. Guided practice.
7. Independent production challenge.
8. Assessment and actionable feedback.
9. Review recommendation and progression.

Sequence may vary when the objective requires it, but every activity must serve a stated objective.

## 6. Technical direction

### Proposed stack
- Web: Next.js, React, TypeScript.
- Styling: Tailwind CSS and documented design tokens.
- Backend/data: existing Supabase project for Auth and Postgres, subject to schema and security audit.
- AI: server-side OpenAI integration behind authenticated, rate-limited endpoints.
- Hosting: Vercel, initially deployed separately or in an isolated preview/staging environment.
- Source control: existing GitHub repository and dedicated Nahtive 2.0 branch.

This is the proposed target architecture, not a claim that the new app has already been scaffolded or deployed.

### Architecture boundaries
- Curriculum layer: courses, levels, modules, lesson blueprints, objectives, prerequisites.
- Content layer: reviewed lesson versions and validated generated variants.
- Learning layer: enrollments, attempts, responses, skill evidence, review schedules.
- Tutor layer: evaluates responses and generates constrained explanations or practice tied to the current objective.
- Application layer: authenticated UI, dashboard, lesson player, server-side APIs.

AI must not invent curriculum progression. It operates within lesson objectives, level constraints, and scoring rubrics supplied by the application.

## 7. Data model direction

The current Supabase project contains useful learner and curriculum data. Preserve it and migrate deliberately; do not replace or truncate production tables during the parallel build.

Proposed canonical entities, subject to a full relationship and policy audit:
- courses — one initial course: Spanish.
- course_levels — A1 through C2.
- modules — ordered learning units within a level.
- lesson_blueprints — stable lesson definitions and objectives.
- lesson_versions — versioned, reviewed lesson content.
- learner_enrollments — learner course and level state.
- lesson_attempts — attempt-level results.
- answer_responses — individual response evidence.
- learner_skills — skill estimates with evidence and timestamps.
- review_items — due vocabulary, grammar, and error reviews.
- learner_events — learning activity and progression events.
- generation_jobs — controlled generation and validation jobs, if needed.

Do not create these tables in production as part of this planning milestone. First map the current schema, relationships, RLS policies, existing data, and migration paths.

## 8. Content quality and validation

Before publication, validate:
- Correct CEFR level and objective alignment.
- Spanish grammar, spelling, accents, and naturalness.
- Regional neutrality or clearly labeled regional usage.
- Reading length and lexical/structural complexity.
- Exercise instructions and answer-key consistency.
- Valid accepted alternatives for open-ended answers.
- No contradictory explanations or duplicate filler exercises.
- Rubric alignment with the skill being assessed.

Failed validation blocks publication or flags human review. Do not silently substitute easier content for a learner who struggles; provide targeted remediation.

## 9. Security and reliability

Before connecting the new UI to existing data:
- Verify every AI endpoint authenticates the learner and checks authorization.
- Add rate limits, per-user quotas, request-size limits, schema validation, and safe error handling.
- Keep service-role and AI secrets server-side only.
- Review RLS ownership rules for every learner-owned table.
- Confirm Data API exposure and explicit grants for new public-schema tables.
- Enable and test leaked-password protection in Supabase Auth.
- Review overlapping/inefficient policies and unused indexes rather than blindly removing them.
- Add request IDs and cost/latency logging without logging secrets or unnecessary personal data.

## 10. Delivery phases

### Phase 0 — Foundation and audit
- Create isolated Nahtive 2.0 branch.
- Document product scope, lesson contract, architecture, and acceptance criteria.
- Complete repository, deployment, Supabase schema, RLS, and API security audit.
- Identify existing data and lesson content that can be migrated.

Exit: no production changes; reviewed target architecture and migration map.

### Phase 1 — Application shell and design system
- Establish Next.js + TypeScript structure on the parallel branch.
- Implement light-first responsive design tokens and reusable components.
- Build authenticated app shell and Spanish learner dashboard.
- Add loading, empty, error, and mobile states.

Exit: learner can sign in and navigate a functional Spanish dashboard using safe test/staging data.

### Phase 2 — Curriculum and lesson engine
- Finalize lesson content schema and canonical Spanish course structure.
- Implement lesson player and exercise types.
- Add answer evaluation, explanations, and assessment summaries.
- Add automated lesson-content validation.

Exit: complete lesson can be taken end-to-end and produces a reliable, reviewable result.

### Phase 3 — Learner model and adaptive practice
- Record response-level evidence.
- Estimate skills from repeated performance.
- Generate targeted practice and review recommendations.
- Implement spaced review and progress views.

Exit: learner mistakes influence relevant future practice and progress is explainable.

### Phase 4 — Migration, QA, and controlled launch
- Map and migrate eligible accounts, progress, and content.
- Test auth, RLS, API limits, data ownership, accessibility, and responsive layouts.
- Run curriculum QA with representative A1–C2 lessons.
- Compare staging behavior with production and prepare rollback.
- Launch only after explicit production cutover approval.

Exit: no data loss, validated learner flows, security checks passed, and tested rollback plan.

## 11. First implementation milestone

1. Create isolated branch and product documentation.
2. Complete full technical and data audit.
3. Establish app shell and light design system.
4. Define and validate lesson JSON contract.
5. Implement one representative Spanish lesson end-to-end before scaling the curriculum.

## 12. Release acceptance criteria

Nahtive 2.0 is not ready for public launch until:
- Spanish is the only selectable course.
- Learner can register, sign in, and resume progress.
- Learner can complete a lesson from start to assessment.
- Feedback explains the actual response, including valid alternatives.
- Lesson content passes automated checks and human review.
- Dashboard progress reflects saved attempts, not placeholder numbers.
- Learner records are protected by tested RLS and authenticated APIs.
- AI endpoints have abuse controls and server-side secrets.
- Existing production Nahtive remains available until cutover is approved.
