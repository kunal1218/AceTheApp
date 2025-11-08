import React from 'react';
import './PulsingCollegeHighlight.css';

// mascotMap: { [collegeId]: mascotImageUrl }
export default function PulsingCollegeHighlight({ clickedChain, mascotMap = {} }) {
  if (!clickedChain || clickedChain.length !== 1) return null;

  const collegeId = clickedChain[0];
  const mascotUrl = mascotMap[collegeId];

  if (!mascotUrl) return null;

  return (
    <img
      src={mascotUrl}
      alt={`${collegeId} mascot`}
      className="pulsing-college pulse"
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
      title="Click to stop highlight"
    />
  );
}