import React, { useState } from "react";
import "./EditApplicationsPopup.css";
import { useCollegeList } from "./CollegeProvider";
import { createCollegeDoc, getCollegeDocUrl, getEssayPrompts, checkGoogleDocExists } from "../googleDocs";
import { cleanEssayPrompt } from "../cleanEssayPrompt";
import { getUser } from "../api"; // <-- Import the new API function
import { getCollegeDocs, saveCollegeDoc } from "../api"; // import new API


// Fetch real essay prompts from JSON for the selected college
async function getEssayQuestionsForCollege(college, userName) {
  // First, try to match by college.name (exact string match to JSON key)
  let prompts = await getEssayPrompts(college.name, "2025");
  // If not found, try slug
  if ((!prompts || prompts.length === 0) && college.slug) {
    prompts = await getEssayPrompts(college.slug, "2025");
  }
  // If not found, try slugOverride
  if ((!prompts || prompts.length === 0) && college.slugOverride) {
    prompts = await getEssayPrompts(college.slugOverride, "2025");
  }
  // If not found, try id
  if ((!prompts || prompts.length === 0) && college.id) {
    prompts = await getEssayPrompts(college.id, "2025");
  }
  if (prompts && prompts.length > 0) {
    const result = `COLLEGE: ${college.name}\nApplicant: ${userName}\nYear: 2025\n\nESSAY PROMPTS\n====================\n\n` +
      prompts.map((q, i) => {
        if (!q.prompt) return '';
        let heading = "";
        let promptText = q.prompt;
        if (q.prompt.includes("\n")) {
          const idx = q.prompt.indexOf("\n");
          heading = q.prompt.slice(0, idx).trim();
          promptText = q.prompt.slice(idx + 1).trim();
        }

        // Detect and format multi-option prompts
        let options = [];
        let mainPrompt = promptText;
        // Look for 'Option 1', 'Option 2', ...
        const optionRegex = /Option ?(\d+)[:]?/g;
        let optionMatches = [...promptText.matchAll(optionRegex)];
        if (optionMatches.length > 1) {
          // Find all option indices
          let indices = optionMatches.map(m => m.index);
          // The main prompt is everything before the first 'Option'
          mainPrompt = promptText.slice(0, indices[0]).trim();
          // Remove all consecutive 'Option N' lines with no content after, at the start of the options block
          let firstRealOptionIdx = indices.length; // default to skip all if none have content
          for (let j = 0; j < indices.length; j++) {
            const start = indices[j];
            const end = (j + 1 < indices.length) ? indices[j + 1] : promptText.length;
            let optionText = promptText.slice(start, end).trim();
            const match = optionText.match(/^Option ?(\d+)[:]?/);
            let rest = match ? optionText.slice(match[0].length).trim() : optionText;
            if (rest.length > 0) {
              firstRealOptionIdx = j;
              break;
            }
          }
          // If the first real option is just a label (e.g., 'Option 1:') and nothing else, skip it too
          if (firstRealOptionIdx < indices.length) {
            const start = indices[firstRealOptionIdx];
            const end = (firstRealOptionIdx + 1 < indices.length) ? indices[firstRealOptionIdx + 1] : promptText.length;
            let optionText = promptText.slice(start, end).trim();
            const match = optionText.match(/^Option ?(\d+)[:]?/);
            let rest = match ? optionText.slice(match[0].length).trim() : optionText;
            if (!rest || rest.length === 0) {
              firstRealOptionIdx++;
            }
          }
          // Now, only process options from firstRealOptionIdx onward
          for (let j = firstRealOptionIdx; j < indices.length; j++) {
            const start = indices[j];
            const end = (j + 1 < indices.length) ? indices[j + 1] : promptText.length;
            let optionText = promptText.slice(start, end).trim();
            const match = optionText.match(/^Option ?(\d+)[:]?/);
            if (match) {
              const label = `Option ${match[1]}:`;
              let rest = optionText.slice(match[0].length).trim();
              if (rest.length > 0) {
                options.push(`${label}\n${rest}`);
              }
            } else if (optionText.length > 0) {
              options.push(optionText);
            }
          }
        }

        let section = `${i + 1}.`;
        if (heading) section += ` ${heading}`;
        section += `\n--------------------\n`;
        section += mainPrompt + "\n\n";
        if (q.word_limit) {
          section += `Limit: ${q.word_limit.replace(/\n/g, ' ').trim()}\n`;
        }
        section += `\nYour Response:\n\n`;
        if (options.length > 0) {
          section += options.join("\n\n") + "\n";
        }
        section += `\n`;
        // Clean the section before returning
        return cleanEssayPrompt(section);
      }).join("\n");
    return result;
  } else {
    return `Essay prompts for ${college.name} (none found)`;
  }
}

export default function EditApplicationsPopup({ onClose }) {
  const { myColleges } = useCollegeList();
  const [pulsingColleges, setPulsingColleges] = useState({});
  const [userName, setUserName] = useState("User");
  const [collegeDocs, setCollegeDocs] = useState({});

  // Fetch user name on mount
  React.useEffect(() => {
    getUser()
      .then(user => setUserName(user.name || "User"))
      .catch(() => setUserName("User"));
    getCollegeDocs()
      .then(setCollegeDocs)
      .catch(() => setCollegeDocs({}));
  }, []);

  // Handler for college button click
  const handleCollegeButtonClick = async (college) => {
    let existingUrl = collegeDocs[college.id];
    let docExists = false;
    if (existingUrl) {
      try {
        docExists = await checkGoogleDocExists(existingUrl);
      } catch (e) {
        docExists = false;
      }
    }
    if (existingUrl && docExists) {
      window.open(existingUrl, "_blank");
      if (pulsingColleges[college.id]) {
        setPulsingColleges((prev) => ({ ...prev, [college.id]: false }));
      }
      return;
    }
    try {
      const essayText = await getEssayQuestionsForCollege(college, userName);
      const url = await createCollegeDoc(college.id, college.name, essayText, college.slug);
      await saveCollegeDoc(college.id, url); // Save to backend
      setCollegeDocs((prev) => ({ ...prev, [college.id]: url }));
      window.open(url, "_blank");
      setPulsingColleges((prev) => ({ ...prev, [college.id]: true }));
    } catch (err) {
      console.error("Google Docs error:", err);
      alert("Failed to create Google Doc: " + (err && err.message ? err.message : JSON.stringify(err)));
    }
  };

  return (
    <div className="edit-applications-popup-overlay">
      <div className="edit-applications-popup">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Choose your College</h2>
        <div className="college-buttons-list">
          {myColleges.map((college) => (
            <button
              key={college.id}
              className={`college-btn${pulsingColleges[college.id] ? " pulse" : ""}`}
              onClick={() => handleCollegeButtonClick(college)}
            >
              {college.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}