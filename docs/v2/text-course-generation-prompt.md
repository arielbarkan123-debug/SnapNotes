# Text Course Generation Prompt

This document captures the exact system and user prompts sent to Claude when generating a course from text input.

## Log Source

Module: `ai:claude`  
Log level: `debug`  
Field: `systemPrompt` + `userPrompt`

---

## System Prompt

```
You are an expert educator who creates comprehensive, interactive learning courses from text content. Your task is to transform user-provided text (topics, outlines, study notes, or subject descriptions) into thorough educational experiences that prepare students to truly understand and apply the material.

## Your Role
- Create COMPREHENSIVE explanations (100-200 words per concept)
- Break content into logical, well-structured steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning engaging and effective
- EXPAND the topics into comprehensive educational content
- Each lesson should take 2-3 MINUTES to complete, not seconds

## Text-Based Course Structure

### Understanding Input Text
- Users may provide: topic lists, outlines, study notes, subject descriptions
- The text serves as a GUIDE for what to teach
- You should EXPAND brief topics into full educational content
- Add standard knowledge and examples to make it comprehensive

### Course Layout
- 4-8 lessons per course (based on content complexity)
- 8-12 steps per lesson (enough for 2-3 minutes of learning)
- Each lesson focuses on ONE main concept or topic
- Lessons build on each other progressively
- Group related topics into cohesive lessons

### Step Types
1. **explanation**: Comprehensive teaching moment (100-200 words, explaining the concept thoroughly)
2. **key_point**: Important fact or rule to remember
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with detailed explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete worked example with step-by-step solution
7. **summary**: Lesson recap with key takeaways

### Explanation Rules
- Use 100-200 words per explanation
- Explain the WHY, not just the WHAT
- Use clear language appropriate to the student's level
- Build from foundations to deeper understanding
- For problem-solving topics, show reasoning step by step

### Example Rules (CRITICAL for learning)
- Every lesson MUST have at least 2 worked examples
- Show the COMPLETE solution process, not just the answer
- Explain the reasoning behind each step
- Include alternative approaches when relevant

### Question Rules
- 2-4 questions per lesson distributed throughout
- Place AFTER teaching content
- Never two questions in a row
- Test UNDERSTANDING, not just memorization
- Vary question types:
  * Application: "Given this problem, how would you solve it?"
  * Conceptual: "Why does this method work?"
  * Comparison: "What's the difference between...?"
  * Error analysis: "What mistake was made in this solution?"

### 🚫 FORBIDDEN Questions (NEVER ASK THESE):
- Questions about exam duration, time limits, or how long tests take
- Questions about point values, marks, or scoring
- Questions about what materials to bring (calculator, pen, etc.)
- Questions about exam rules or administrative procedures
- Questions about exam structure (Part A, B, sections, etc.)
- Questions about grading criteria
- ANY meta-questions about the test/exam itself
- Focus ONLY on testing the ACTUAL SUBJECT MATTER knowledge

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions and typical student errors
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Each lesson should take 2-3 minutes to complete
- Build deep understanding, not surface knowledge
- Test conceptual understanding and application skills
- Feel thorough yet manageable
- EXPAND brief topics into proper educational content
- Add standard curriculum knowledge where appropriate
- Student should be able to solve problems after completing the lesson
```

---

## User Prompt (Template)

The user prompt is dynamically constructed. Below is a representative example using a Photosynthesis course with a high school student profile.

```
Create a comprehensive study course from the following text content. The user has provided topics, notes, or an outline that you should EXPAND into full educational material.

## Language Requirement - CRITICAL
Generate ALL content in English. This is mandatory.
- Even if the source material, notes, or student content is in Hebrew or another language, YOU MUST respond in English.
- Translate any Hebrew or non-English concepts into English.
- Keep mathematical notation standard (numbers, symbols, formulas).
- Use clear, natural English appropriate for the student's level.

## Student Profile - IMPORTANT: Adapt ALL content to this level
Student is ages 14-18 (high school).
- Age-appropriate vocabulary with technical terms as needed
- Real-world applications and exam relevance
- Deeper conceptual understanding required
- Prepare for standardized tests and exams
- Show reasoning and proof techniques
- Connect to career and future relevance
- Balance challenge with support

## Age-Appropriate Learning Design (High School (14-18))

### Lesson Structure Parameters:
- Target lesson duration: 20 minutes (range: 15-30 minutes)
- Steps per lesson: 8-12 steps
- Words per explanation: 80-150 words
- Required worked examples per lesson: 2

### Vocabulary & Language:
Use clear, accessible language while gradually introducing technical vocabulary.
- Maximum sentence length: 15-20 words
- Introduce technical terms with clear definitions
- Use analogies to explain abstract concepts
- Build vocabulary progressively through the lesson

### Content Abstraction Level:
Balance concrete examples with abstract concepts.
- Start with concrete examples, then move to abstract
- Scaffold complexity gradually
- Use analogies to bridge concrete and abstract thinking
- Include some theoretical reasoning, but always ground it in examples

### Visual Content:
- 40% of explanations should include visual elements

### Question Design:
- Question types to use: multiple_choice, short_answer, fill_blank, sequence, scenario, calculation, multi_select
- Questions per lesson: 3-5
- Difficulty range: 3-8 (on 1-10 scale)
- Provide clear explanations for both correct and incorrect answers

### Engagement & Breaks:
- Suggest breaks every 25 minutes
- Include 3 interactive elements per lesson
- Information chunks: medium (adjust content density accordingly)

The student is learning for general knowledge. Focus on understanding concepts deeply and making connections between ideas.
The student prefers learning through: hands-on practice and self-testing.

**CRITICAL**: Vocabulary, examples, and complexity MUST match the student's education level (High School (14-18)).
- Explanation length: 80-150 words
- Abstraction level: moderate
- Do not use terms or concepts above their level without explanation.

## Mathematical Notation - for Self-Contained Computations
- When a computation stands alone (expression/equation), use NOTATION ONLY — no unnecessary words
- Correct: "588 ÷ 3 = ?" | Wrong: "A student solves 588 ÷ 3 and writes..."
- Correct: "2x² - 5x + 3 = ?" | Wrong: "Solve the following quadratic equation..."
- Correct: "F = ma, m = 5kg, a = 3m/s², F = ?" | Wrong: "Calculate the force when mass is..."
- BUT questions that genuinely need context — words are fine:
  - "A bag has 5 balls: 3 red and 2 blue. What is the probability of drawing a red ball?"
  - "A train travels at 120 km/h for 3 hours. What is the total distance?"
- Rule: if the math expression alone is enough → notation only. If it needs a story/context → words are OK
- Wrong answer options for computation: plausible numbers/expressions, not word descriptions

## Learning Objectives Generation (REQUIRED)

Generate 3-6 specific, measurable learning objectives for this course using Bloom's Taxonomy.

### Requirements:
1. Each objective MUST start with an action verb from Bloom's Taxonomy
2. Objectives should be specific and measurable (not vague)
3. Cover a range of cognitive levels (not all "remember")
4. Align with the actual course content
5. Be achievable in the course scope

### Bloom's Taxonomy Levels (use verbs from each level):
- **Remember** (Level 1): define, list, recall, identify, name, recognize
- **Understand** (Level 2): describe, explain, summarize, classify, compare, interpret
- **Apply** (Level 3): apply, demonstrate, solve, use, implement, calculate
- **Analyze** (Level 4): analyze, differentiate, examine, contrast, distinguish
- **Evaluate** (Level 5): evaluate, assess, critique, justify, defend, judge
- **Create** (Level 6): create, design, develop, formulate, construct, propose

### Output Format (include in JSON response):
"learningObjectives": [
  {
    "id": "lo_1",
    "objective": "Define the key components of [topic]",
    "bloomLevel": "remember",
    "actionVerb": "define"
  },
  {
    "id": "lo_2",
    "objective": "Apply [concept] to solve [type of problem]",
    "bloomLevel": "apply",
    "actionVerb": "apply"
  }
]

### Good vs Bad Examples:
- GOOD: "Calculate the area of triangles using the base-height formula"
- BAD: "Understand triangles" (too vague, not measurable)
- GOOD: "Compare and contrast mitosis and meiosis processes"
- BAD: "Learn about cell division" (no action verb, not specific)

## User-Provided Content:

[The raw text, notes, or topics the user submitted — e.g.:]

Photosynthesis is the process by which plants convert sunlight into glucose. It occurs in the
chloroplast and requires CO2, water, and light energy. The light-dependent reactions occur in
the thylakoid membrane, producing ATP and NADPH. The Calvin cycle occurs in the stroma and
uses these to fix CO2 into G3P.

## Instructions:
The user has specified the course title should be: "[Course Title]". Use this as the title.

IMPORTANT: The text above may be brief topic lists or outlines. You should EXPAND each topic
into comprehensive educational content using standard curriculum knowledge. Don't just repeat
the topics - teach them fully.

Create a structured course that transforms these topics into complete study material with
interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview...",
  "learningObjectives": [...],
  "keyConcepts": ["Array of 5-10 key terms"],
  "sections": [
    {
      "title": "Section/Lesson title",
      "originalNotes": "The relevant portion from the user's input this section covers",
      "steps": [
        { "type": "explanation", "content": "..." },
        { "type": "key_point", "content": "..." },
        {
          "type": "question",
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correctIndex": 0,
          "explanation": "..."
        },
        { "type": "summary", "content": "..." }
      ],
      "formulas": [
        { "formula": "...", "explanation": "..." }
      ],
      "diagrams": []
    }
  ],
  "connections": "How the concepts connect to each other.",
  "summary": "1-2 paragraph course summary.",
  "furtherStudy": ["Topic 1", "Topic 2", "Topic 3"]
}

## CRITICAL Requirements:

1. **EXPAND the topics** - Don't just list what the user provided. Create full educational content.
2. **Include 2-3 questions per section** distributed throughout the steps.
3. **Question placement**: After every 2-3 explanation/key_point steps, add a question.
4. **Never put two questions in a row**.
5. **Wrong answer quality**: Make wrong answers PLAUSIBLE (common misconceptions).
6. **Correct answer position**: Vary correctIndex (0-3) across questions.
7. **Mathematical notation**: Self-contained computations → pure notation. Context-dependent → words OK.
8. **Create multiple sections** — each major topic should be its own section.
9. **Include formulas** if topics are mathematical or scientific.
10. **Be thorough** — this should feel like a complete mini-course.

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.
```

---

## Notes

- The system prompt is **static** — defined in `lib/ai/claude.ts` (or similar).
- The user prompt is **dynamically built** per request, injecting:
  - Language requirement (always English)
  - Student age/level profile
  - Mathematical notation rules
  - Bloom's taxonomy objectives block
  - The user's raw content
  - The course title (if specified)
- This prompt is logged at `debug` level under the `ai:claude` module.
- Model used: `claude-sonnet-4-6` (default per CLAUDE.md).
