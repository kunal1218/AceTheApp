import React, { useState } from 'react';
import './PulsingCollegeHighlight.css';

export default function PulsingCollegeHighlight({ clickedChain }) {
  const [isPulsing, setIsPulsing] = useState(true);

  if (!clickedChain || clickedChain.length !== 1) return null;

  const college = clickedChain[0];

  return (
    <div
      className={`pulsing-college${isPulsing ? ' pulse' : ''}`}
      onClick={() => setIsPulsing(false)}
      title="Click to stop highlight"
    >
      {college}
    </div>
  );
}
