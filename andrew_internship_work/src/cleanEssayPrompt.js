// Clean up essay prompts by removing duplicates and formatting properly
export function cleanEssayPrompt(text) {
  if (!text) return text;
  
  let lines = text.split(/\r?\n/);
  
  function processBlock(blockLines) {
    const isQuestionBlock = blockLines[0] && /^\d+\./.test(blockLines[0]);
    // Detect if this is a multi-option block (contains more than one 'Option N')
    const optionCount = blockLines.filter(line => /^Option ?\d+[:]?/.test(line)).length;
    const isMultiOption = optionCount > 1;
    
    // Remove standalone 'Option N' lines
    let cleaned = [];
    for (let i = 0; i < blockLines.length; i++) {
      const line = blockLines[i];
      if (/^Option ?\d+[:]??\s*$/.test(line)) {
        while (i + 1 < blockLines.length && !blockLines[i + 1].trim()) i++;
        continue;
      }
      cleaned.push(line);
    }
    // Remove duplicate content (first occurrence of lines that appear later)
    let final = [];
    for (let i = 0; i < cleaned.length; i++) {
      const line = cleaned[i];
      if (!line.trim()) {
        final.push(line);
        continue;
      }
      let foundLater = false;
      for (let j = i + 1; j < cleaned.length; j++) {
        if (cleaned[j].includes(line)) {
          foundLater = true;
          break;
        }
      }
      if (!foundLater) final.push(line);
    }
    // Format multi-option questions only
    let formatted = [];
    if (isMultiOption) {
      // For multi-option: split into option blocks, move Limit/Your Response to end of each
      let optionBlocks = [];
      let currentOpt = [];
      for (let i = 0; i < final.length; i++) {
        const line = final[i];
        if (/^Option ?\d+[:]?/.test(line) && currentOpt.length) {
          optionBlocks.push(currentOpt);
          currentOpt = [];
        }
        currentOpt.push(line);
      }
      if (currentOpt.length) optionBlocks.push(currentOpt);
      for (let block of optionBlocks) {
        // Move Limit/Your Response to end
        let limitIdx = block.findIndex(l => /^Limit:/.test(l));
        let responseIdx = block.findIndex(l => /^Your Response:/.test(l));
        let limitLine = limitIdx !== -1 ? block.splice(limitIdx, 1)[0] : null;
        let responseLine = responseIdx !== -1 ? block.splice(responseIdx > limitIdx && limitIdx !== -1 ? responseIdx - 1 : responseIdx, 1)[0] : null;
        // Option heading
        if (/^Option ?\d+[:]?/.test(block[0])) {
          formatted.push(block[0].replace(/[:]?$/, ':'));
          if (block[1] && block[1].trim()) {
            formatted.push(block[1].trim());
          }
          formatted.push("");
          formatted.push(...block.slice(2));
        } else {
          formatted.push(...block);
        }
        if (limitLine) formatted.push(limitLine);
        if (responseLine) {
          // Add an extra blank line between Limit: and Your Response:
          if (limitLine) formatted.push("");
          formatted.push(responseLine, '', '', '');
        }
        // Add blank line between options
        formatted.push("");
      }
      // Remove trailing blank lines
      while (formatted.length && !formatted[formatted.length - 1].trim()) formatted.pop();
    } else {
      // Single-response: original logic
      for (const line of final) {
        formatted.push(line);
      }
      // Add separator for questions
      if (isQuestionBlock) {
        const headingIdx = formatted.findIndex(line => line.trim());
        if (headingIdx !== -1) {
          formatted.splice(headingIdx + 1, 0, "--------------------", "");
        }
      }
      // Remove trailing empty lines
      while (formatted.length && !formatted[formatted.length - 1].trim()) {
        formatted.pop();
      }
    }
    return formatted;
  }
  
  // Split into blocks by headings
  let blocks = [];
  let current = [];
  
  for (const line of lines) {
    if (/^(\d+\.|ESSAY PROMPTS|COLLEGE:|Applicant:|Year:|^\s*[-=]{3,}\s*$)/.test(line) && current.length) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  
  // Process and join
  let result = blocks
    .map(processBlock)
    .flat()
    .join("\n")
    .replace(/(-{15,}\s*\n\s*){2,}/g, "--------------------\n\n") // Remove duplicate separators
    .replace(/(Your Response:)/g, '$1\n\n\n'); // Add three line breaks after 'Your Response:'

  // Remove any disclaimers that may have been inserted in the middle (from previous runs or logic)
  result = result.replace(/IMPORTANT:[\s\S]*?UC Application\).*?(\n|$)/g, '');

  // Add disclaimers at the bottom (plain text, no HTML)
  const disclaimer = [
    '\n\n',
    'IMPORTANT:',
    '- Not all essay questions are required for every applicant (please check your specific application choices on your college application)',
    '- Not all necessary essay questions are guaranteed to be present (please reference with supplemental essay requirements on your college application)',
    '- University of California (UC) application essay questions are not included (please reference the UC Application)'
  ].join('\n');

  return result.trim() + '\n\n' + disclaimer;
}