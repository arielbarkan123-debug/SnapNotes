# QA Test Plan: Settings Integration for Content Generation

This document outlines manual QA test scenarios to verify that all AI-generated content properly uses:
1. **User Learning Profile** settings (study system, education level, language, exam format)
2. **Past Exam Templates** (uploaded exam examples with analysis)

---

## Prerequisites

Before running these tests:
1. Ensure you have access to at least one account with each study system configured
2. Have sample past exam PDFs ready for upload
3. Access the application in both English and Hebrew locales

---

## Test Scenarios

### 1. Course Generation (CG)

| ID | Scenario | Profile Setup | Expected Result | Verified |
|----|----------|---------------|-----------------|----------|
| CG-001 | IB Biology HL user | Study System: IB, Subject: Biology (HL), Language: English | Course content uses IB terminology, HL-level complexity, references IB assessment objectives | ☐ |
| CG-002 | Bagrut user (Hebrew) | Study System: Israeli Bagrut, Language: Hebrew | ALL content generated in Hebrew (titles, explanations, questions) | ☐ |
| CG-003 | General learner | Study System: General, Study Goal: General Learning | No curriculum-specific terminology, accessible explanations | ☐ |
| CG-004 | No profile | New user, no profile configured | Course generates successfully with defaults, no errors | ☐ |
| CG-005 | Elementary user | Education Level: Elementary, Study System: US | Simple vocabulary, age-appropriate content, basic explanations | ☐ |
| CG-006 | Graduate user | Education Level: Graduate, Study System: General | Advanced terminology, assumes prior knowledge, academic tone | ☐ |
| CG-007 | Exam prep goal | Study Goal: Exam Prep, Study System: IB | Emphasis on testable knowledge, exam tips included | ☐ |
| CG-008 | Visual learner | Learning Styles: [Visual], Study System: Any | References to diagrams, visual organization in content | ☐ |

#### How to Test Course Generation:
1. Configure user profile with specified settings at `/settings`
2. Upload an image/document to generate a course
3. Review generated course content for expected characteristics
4. Check lesson steps, key points, and questions

---

### 2. Exam Generation (EG)

| ID | Scenario | Profile Setup | Past Exams | Expected Result | Verified |
|----|----------|---------------|------------|-----------------|----------|
| EG-001 | IB + past exams (match_real) | Study System: IB, Exam Format: Match Real | Upload IB Biology paper | Question format matches uploaded exam style exactly (question types, point distribution) | ☐ |
| EG-002 | IB + past exams (inspired_by) | Study System: IB, Exam Format: Inspired By | Upload IB Biology paper | Question style influenced by but not strictly matching past exam | ☐ |
| EG-003 | Past exams with diagrams | Any | Upload exam with diagram questions | image_label questions generated when appropriate | ☐ |
| EG-004 | No past exams | Any | None uploaded | Exam generates with default distribution, no errors | ☐ |
| EG-005 | Specific command terms | Study System: IB | Upload exam with "Define", "Explain", "Evaluate" | Generated questions use same command terms | ☐ |
| EG-006 | 70% easy difficulty | Any | Upload exam with 70% easy, 20% medium, 10% hard | Generated exam matches difficulty distribution | ☐ |
| EG-007 | Multiple past exams | Any | Upload 2-3 different exams | Style guide aggregates patterns from all exams | ☐ |
| EG-008 | UK A-Level user | Study System: UK A-Level | Optional | UK curriculum context in questions, A-Level style | ☐ |
| EG-009 | AP user | Study System: AP | Optional | AP curriculum context, AP exam format | ☐ |
| EG-010 | Hebrew language | Language: Hebrew | Optional | All exam questions and options in Hebrew | ☐ |

#### How to Test Exam Generation:
1. Configure user profile with specified settings
2. If applicable, upload past exam templates at `/settings/past-exams`
3. Wait for past exam analysis to complete (check analysis_status)
4. Navigate to a course and generate an exam
5. Review generated questions for expected characteristics
6. Check question type distribution, difficulty, and style

#### Verifying Past Exam Integration:
- Open browser DevTools, Network tab
- Generate an exam and find the POST request to `/api/exams`
- Examine the request/response to verify:
  - `past_exam_templates` query was made
  - Style guide was built from templates
  - Question distribution matches past exam analysis

---

### 3. Practice Questions (PQ)

| ID | Scenario | Profile Setup | Expected Result | Verified |
|----|----------|---------------|-----------------|----------|
| PQ-001 | IB student | Study System: IB, Subject: Biology (HL) | Questions aligned with IB Biology HL curriculum | ☐ |
| PQ-002 | Bagrut (Hebrew) | Study System: Israeli Bagrut, Language: Hebrew | Questions, options, and explanations in Hebrew | ☐ |
| PQ-003 | HL subject level | Subject Level: HL (IB) | HL-appropriate difficulty and concepts | ☐ |
| PQ-004 | match_real format | Exam Format: Match Real, Study System: IB | IB-style command terms (Define, Explain, Compare) | ☐ |
| PQ-005 | General learner | Study System: General | No curriculum-specific context, general questions | ☐ |
| PQ-006 | Specific lesson | Select a specific lesson | Questions based on lesson content, not general | ☐ |
| PQ-007 | Wrong answer reinforcement | Get a question wrong in practice | Reinforcement questions on the same concept | ☐ |

#### How to Test Practice Questions:
1. Configure user profile with specified settings
2. Navigate to Practice Hub or a course lesson
3. Generate practice questions
4. Review questions for curriculum alignment, language, and difficulty

---

### 4. Edge Cases (EC)

| ID | Scenario | Steps | Expected Result | Verified |
|----|----------|-------|-----------------|----------|
| EC-001 | Unauthenticated access | Logout, try to generate course | 401 Unauthorized response | ☐ |
| EC-002 | Profile fetch fails | (Simulate DB error) | Continues without personalization, uses defaults | ☐ |
| EC-003 | Past exams fetch fails | (Simulate DB error) | Generates exam without style guide, no crash | ☐ |
| EC-004 | Invalid study_system | Manual DB edit to invalid value | Falls back to 'general' | ☐ |
| EC-005 | Empty subjects array | Profile with subjects: [] | No subject-specific context, still generates | ☐ |
| EC-006 | Missing subject_levels | Profile with subject_levels: {} | Uses base subject without level | ☐ |
| EC-007 | Rate limit exceeded | Generate many exams rapidly | 429 response with retry headers | ☐ |
| EC-008 | AI timeout | (Simulate long response) | Appropriate timeout error, not hanging | ☐ |

---

## Verification Checklist

### User Learning Profile Fields

| Field | Used In | How to Verify |
|-------|---------|---------------|
| `education_level` | Course, Questions | Content complexity matches level |
| `study_system` | Course, Exam, Questions | Curriculum context in AI prompt |
| `subjects` | Exam, Questions | Subject-specific terminology |
| `subject_levels` | Exam, Questions | HL/SL distinction in IB, level-appropriate content |
| `study_goal` | Course | Exam prep vs general learning tone |
| `learning_styles` | Course | Visual/practice/reading emphasis |
| `exam_format` | Exam | match_real vs inspired_by instruction |
| `language` | Course, Exam, Questions | Hebrew vs English generation |

### Past Exam Template Fields

| Field | Used In | How to Verify |
|-------|---------|---------------|
| `question_types` | Exam | Question type distribution matches |
| `difficulty_distribution` | Exam | Easy/medium/hard percentages |
| `command_terms` | Exam, Questions | Terms appear in question stems |
| `point_distribution` | Exam | Point values match pattern |
| `image_analysis.has_diagrams` | Exam | image_label questions generated |
| `labeling_style` | Exam | Correct labeling interaction mode |
| `bloom_levels` | Exam | Cognitive level distribution |
| `sample_questions` | Exam | Question style mimicked |

---

## API Endpoints to Monitor

| Endpoint | Key Parameters | What to Check |
|----------|----------------|---------------|
| `POST /api/generate-course` | (body: imageUrl/textContent/documentContent) | `userContext` passed to AI |
| `POST /api/exams` | courseId, questionCount | `buildExamStyleGuide`, `buildExamContext` called |
| `POST /api/generate-questions` | courseId, lessonIndex, topic | `curriculumSection` in prompt |

---

## Database Queries to Verify

```sql
-- Check user profile is fetched
SELECT * FROM user_learning_profile WHERE user_id = '<user_id>';

-- Check past exams with completed analysis
SELECT id, title, analysis_status, extracted_analysis
FROM past_exam_templates
WHERE user_id = '<user_id>' AND analysis_status = 'completed';

-- Verify exam question distribution
SELECT question_type, COUNT(*) as count
FROM exam_questions
WHERE exam_id = '<exam_id>'
GROUP BY question_type;
```

---

## Regression Tests

After any changes to the following files, re-run these scenarios:

| File Changed | Run Scenarios |
|--------------|---------------|
| `lib/past-exams/style-guide.ts` | EG-001 to EG-010 |
| `lib/curriculum/context-builder.ts` | All CG, EG, PQ |
| `app/api/exams/route.ts` | All EG |
| `app/api/generate-course/route.ts` | All CG |
| `app/api/generate-questions/route.ts` | All PQ |
| `lib/ai/prompts/*` | All scenarios |

---

## Sign-off

| Tester | Date | Scenarios Passed | Notes |
|--------|------|------------------|-------|
| | | | |
| | | | |

---

## Automated Test Commands

Run the automated Jest tests to complement manual testing:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/api/exams.test.ts

# Run in watch mode
npm test -- --watch
```

### Test Files:
- `__tests__/api/generate-course.test.ts` - Course generation integration
- `__tests__/api/exams.test.ts` - Exam generation integration
- `__tests__/api/generate-questions.test.ts` - Practice questions integration
- `__tests__/lib/past-exams/style-guide.test.ts` - Style guide builder unit tests
