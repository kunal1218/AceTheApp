import React from "react";
import "./SubgoalGenerator.css";

// Hardcoded sample plan for preview
const samplePlan = {
  goal: "Secure a summer internship",
  phases: [
    {
      name: "Research",
      milestones: [
        {
          name: "Identify Interests",
          tasks: {
            easy: ["List 3 fields of interest"],
            medium: ["Research 5 companies in each field"],
            hard: ["Reach out to 2 professionals for informational interviews"]
          }
        },
        {
          name: "Resume Prep",
          tasks: {
            easy: ["Draft a basic resume"],
            medium: ["Get feedback from a mentor"],
            hard: ["Tailor resume for 3 different roles"]
          }
        }
      ]
    },
    {
      name: "Ideation",
      milestones: [
        {
          name: "Networking",
          tasks: {
            easy: ["Connect with 5 alumni on LinkedIn"],
            medium: ["Attend a virtual career fair"],
            hard: ["Schedule 3 coffee chats"]
          }
        },
        {
          name: "Application Strategy",
          tasks: {
            easy: ["List 10 target internships"],
            medium: ["Draft a cover letter template"],
            hard: ["Customize cover letters for 5 companies"]
          }
        }
      ]
    },
    {
      name: "Development",
      milestones: [
        {
          name: "Apply & Interview",
          tasks: {
            easy: ["Submit 5 applications"],
            medium: ["Complete 2 mock interviews"],
            hard: ["Follow up with 3 recruiters"]
          }
        },
        {
          name: "Skill Building",
          tasks: {
            easy: ["Complete 1 online course"],
            medium: ["Build a small project related to your field"],
            hard: ["Present your project to a peer group"]
          }
        }
      ]
    }
  ]
};

export default function SkillAssessment() {
  // Render the plan UI as if the user had just received it
  return (
    <div className="subgoal-container">
      <h1 className="welcome-text">Personalized Plan: {samplePlan.goal}</h1>
      <div className="plan-phases">
        {samplePlan.phases.map((phase, i) => (
          <div key={i} className="plan-phase">
            <h2 className="phase-title">{phase.name}</h2>
            <div className="phase-milestones">
              {phase.milestones.map((ms, j) => (
                <div key={j} className="milestone-block">
                  <h3 className="milestone-title">{ms.name}</h3>
                  <div className="milestone-tasks">
                    {['easy', 'medium', 'hard'].map(level => (
                      ms.tasks[level] && ms.tasks[level].length > 0 ? (
                        <div key={level} className={`task-group effort-${level}`}>
                          <div className="task-group-label">{level.charAt(0).toUpperCase() + level.slice(1)} Tasks</div>
                          <ul className="task-list">
                            {ms.tasks[level].map((task, k) => (
                              <li key={k}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
