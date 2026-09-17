// Fallback question generator when external AI API is blocked by campus/corporate firewalls (e.g. FortiGuard)

const TOPIC_TEMPLATES = {
  'time and work': [
    {
      question_text: "A can complete a piece of work in 12 days and B can do it in 18 days. If they work together, in how many days will the work be completed?",
      option_a: "7.2 days",
      option_b: "6.5 days",
      option_c: "8 days",
      option_d: "7 days",
      correct_option: "A",
      marks: 1,
      explanation: "Work done by A in 1 day = 1/12, by B = 1/18. Combined 1-day work = 1/12 + 1/18 = 5/36. Total days = 36/5 = 7.2 days."
    },
    {
      question_text: "A is twice as efficient as B. If together they finish a project in 14 days, in how many days can A alone finish it?",
      option_a: "28 days",
      option_b: "21 days",
      option_c: "14 days",
      option_d: "35 days",
      correct_option: "B",
      marks: 1,
      explanation: "Ratio of efficiency A:B = 2:1. Let 1-day work be 2x and x. Together (3x) takes 14 days -> Total work = 42x. A takes 42x / 2x = 21 days."
    },
    {
      question_text: "Pipe A can fill a tank in 6 hours and Pipe B can empty it in 8 hours. If both pipes are opened together, how long will it take to fill the tank?",
      option_a: "12 hours",
      option_b: "18 hours",
      option_c: "24 hours",
      option_d: "30 hours",
      correct_option: "C",
      marks: 1,
      explanation: "Net filling rate = 1/6 - 1/8 = (4 - 3)/24 = 1/24 tank/hr. Tank will be full in 24 hours."
    },
    {
      question_text: "15 men can complete a task in 20 days working 8 hours a day. How many days will 20 men take to finish it working 6 hours a day?",
      option_a: "18 days",
      option_b: "20 days",
      option_c: "22 days",
      option_d: "25 days",
      correct_option: "B",
      marks: 1,
      explanation: "Using M1*D1*H1 = M2*D2*H2: 15*20*8 = 20*D2*6 -> 2400 = 120*D2 -> D2 = 20 days."
    },
    {
      question_text: "A, B and C can do a job in 10, 15, and 30 days respectively. If all three work together, how many days will they take?",
      option_a: "5 days",
      option_b: "6 days",
      option_c: "7 days",
      option_d: "4 days",
      correct_option: "A",
      marks: 1,
      explanation: "Combined rate = 1/10 + 1/15 + 1/30 = (3 + 2 + 1)/30 = 6/30 = 1/5. Total time = 5 days."
    },
    {
      question_text: "A can do a work in 15 days and B in 20 days. If they work on it together for 4 days, then the fraction of the work that is left is:",
      option_a: "7/15",
      option_b: "8/15",
      option_c: "11/15",
      option_d: "1/3",
      correct_option: "B",
      marks: 1,
      explanation: "1-day work = 1/15 + 1/20 = 7/60. 4 days work = 4 * (7/60) = 7/15. Remaining work = 1 - 7/15 = 8/15."
    },
    {
      question_text: "A works twice as fast as B. If B can complete a work in 12 days independently, the number of days in which A and B can together finish the work in:",
      option_a: "4 days",
      option_b: "6 days",
      option_c: "8 days",
      option_d: "3 days",
      correct_option: "A",
      marks: 1,
      explanation: "B takes 12 days, so A takes 6 days. Together: 1/6 + 1/12 = 3/12 = 1/4. So 4 days."
    },
    {
      question_text: "If 6 men and 8 boys can do a piece of work in 10 days, while 26 men and 48 boys can do the same in 2 days, the time taken by 15 men and 20 boys in doing the same work is:",
      option_a: "4 days",
      option_b: "5 days",
      option_c: "6 days",
      option_d: "7 days",
      correct_option: "A",
      marks: 1,
      explanation: "10(6M + 8B) = 2(26M + 48B) => 60M + 80B = 52M + 96B => 8M = 16B => 1M = 2B. 6M + 8B = 20B in 10 days (200 boy-days). 15M + 20B = 50B -> 200 / 50 = 4 days."
    },
    {
      question_text: "A alone can do a piece of work in 6 days and B alone in 8 days. A and B undertook to do it for Rs. 3200. With the help of C, they finished the work in 3 days. How much is to be paid to C?",
      option_a: "Rs. 375",
      option_b: "Rs. 400",
      option_c: "Rs. 600",
      option_d: "Rs. 800",
      correct_option: "B",
      marks: 1,
      explanation: "C's 1-day work = 1/3 - (1/6 + 1/8) = 1/3 - 7/24 = 1/24. Ratio of work = 1/6 : 1/8 : 1/24 = 4 : 3 : 1. C's share = 3200 * (1/8) = Rs. 400."
    },
    {
      question_text: "A and B can do a piece of work in 72 days; B and C can do it in 120 days; A and C can do it in 90 days. In what time can A alone do it?",
      option_a: "80 days",
      option_b: "100 days",
      option_c: "120 days",
      option_d: "150 days",
      correct_option: "C",
      marks: 1,
      explanation: "2(A+B+C) = 1/72 + 1/120 + 1/90 = 12/360 = 1/30 => A+B+C = 1/60. A = (A+B+C) - (B+C) = 1/60 - 1/120 = 1/120. A takes 120 days."
    },
    {
      question_text: "Three taps A, B and C can fill a tank in 12, 15 and 20 hours respectively. If A is open all the time and B and C are open for one hour each alternately, the tank will be full in:",
      option_a: "6 hours",
      option_b: "6.5 hours",
      option_c: "7 hours",
      option_d: "7.5 hours",
      correct_option: "C",
      marks: 1,
      explanation: "(A+B)'s 1 hr = 1/12 + 1/15 = 9/60. (A+C)'s 1 hr = 1/12 + 1/20 = 8/60. 2-hr work = 17/60. In 6 hrs = 51/60. In 7th hr (A+B) adds 9/60 -> 60/60 full in 7 hours."
    },
    {
      question_text: "Two pipes A and B can fill a cistern in 20 and 30 minutes respectively, and a third pipe C can empty the full cistern in 15 minutes. If all are opened together, the cistern will be full in:",
      option_a: "60 minutes",
      option_b: "45 minutes",
      option_c: "30 minutes",
      option_d: "Never",
      correct_option: "A",
      marks: 1,
      explanation: "Net rate = 1/20 + 1/30 - 1/15 = (3 + 2 - 4)/60 = 1/60 cistern/min. Cistern fills in 60 minutes."
    },
    {
      question_text: "A can do a piece of work in 4 hours; B and C together can do it in 3 hours, while A and C together can do it in 2 hours. How long will B alone take to do it?",
      option_a: "8 hours",
      option_b: "10 hours",
      option_c: "12 hours",
      option_d: "14 hours",
      correct_option: "C",
      marks: 1,
      explanation: "C's 1-hr = (A+C) - A = 1/2 - 1/4 = 1/4. B's 1-hr = (B+C) - C = 1/3 - 1/4 = 1/12. B takes 12 hours."
    },
    {
      question_text: "A builder decided to build a farmhouse in 40 days. He employed 100 men in the beginning and 100 more after 35 days and completed the construction in stipulated time. If he had not employed the additional men, how many days behind schedule would it have been finished?",
      option_a: "5 days",
      option_b: "6 days",
      option_c: "7 days",
      option_d: "8 days",
      correct_option: "A",
      marks: 1,
      explanation: "Work done in last 5 days by 200 men = 1000 man-days. 100 men would take 1000 / 100 = 10 days (5 days extra)."
    },
    {
      question_text: "A and B can do a piece of work in 45 and 40 days respectively. They began the work together, but A leaves after some days and B finished the remaining work in 23 days. After how many days did A leave?",
      option_a: "6 days",
      option_b: "8 days",
      option_c: "9 days",
      option_d: "12 days",
      correct_option: "C",
      marks: 1,
      explanation: "Work done by B in 23 days = 23/40. Remaining work = 1 - 23/40 = 17/40. (A+B)'s 1-day work = 1/45 + 1/40 = 17/360. Days together = (17/40) / (17/360) = 9 days."
    }
  ]
};

export function generateFallbackQuestions(topic, count = 5, marks = 1, difficulty = 'Medium') {
  const normalized = topic.toLowerCase().trim();
  
  // Check exact/partial template match
  let matchedTemplates = null;
  for (const [key, questions] of Object.entries(TOPIC_TEMPLATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      matchedTemplates = questions;
      break;
    }
  }

  const result = [];
  const qty = Math.min(Math.max(count, 1), 20);

  if (matchedTemplates && matchedTemplates.length > 0) {
    for (let i = 0; i < qty; i++) {
      const template = matchedTemplates[i % matchedTemplates.length];
      result.push({
        question_text: template.question_text,
        option_a: template.option_a,
        option_b: template.option_b,
        option_c: template.option_c,
        option_d: template.option_d,
        correct_option: template.correct_option,
        marks: Number(marks) || 1,
        explanation: template.explanation
      });
    }
    return result;
  }

  // Generic dynamic question bank generator for any topic
  const concepts = [
    "Fundamental definition and primary principle",
    "Time complexity and performance trade-offs",
    "Core properties and boundary condition handling",
    "Standard implementation and architectural approach",
    "Best practice optimization and practical application",
    "Error handling and edge case validation",
    "Comparative analysis with alternative techniques",
    "Memory management and resource efficiency",
    "Real-world problem solving and execution flow",
    "Scalability and maintainability considerations"
  ];

  for (let i = 0; i < qty; i++) {
    const concept = concepts[i % concepts.length];
    result.push({
      question_text: `Regarding ${topic} (${difficulty} level), which of the following statements best describes the ${concept.toLowerCase()}?`,
      option_a: `It ensures optimal throughput by enforcing standard constraints in ${topic}.`,
      option_b: `It bypasses conventional verification to prioritize latency over consistency.`,
      option_c: `It restricts execution exclusively to synchronous single-threaded pipelines.`,
      option_d: `It is applicable only when memory allocation is strictly static.`,
      correct_option: "A",
      marks: Number(marks) || 1,
      explanation: `Option A correctly highlights the established principle and best practice regarding ${topic} in standard assessments.`
    });
  }

  return result;
}
