// Assume liveGameArea, logSVG, instanceCounter, swipeState, gamePaused, timeWhenPauseActuallyStarted,
// handleDocumentPointerMove, handleDocumentPointerEnd are defined in the broader scope.
export const simplePickleSvgString = `<svg width="100" height="200" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
  <g id="simplePickleGroup">
    <path id="pickleBody" d="M 50,10 C 20,20 10,70 25,120 C 15,170 30,190 50,190 C 70,190 85,170 75,120 C 90,70 80,20 50,10 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="2"/>
    <circle id="bump1" cx="30" cy="60" r="5" fill="#4CAF50"/>
    <circle id="bump2" cx="65" cy="90" r="6" fill="#4CAF50"/>
    <ellipse id="bump3" cx="40" cy="150" rx="7" ry="4" fill="#4CAF50"/>
    <path id="highlight" d="M 50,25 C 60,50 65,80 60,110" fill="none" stroke="#66BB6A" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>
`;
export const gameOverSound = document.getElementById('gameOverSound')	


