import React, { useEffect, useState } from 'react';
import { PanelCanvas } from './PixelArt';

const CHARS_PER_TICK = 2;
const TICK_MS = 28;

// Panel-by-panel story player. Space/Enter/click advances (finishing the line first),
// Esc skips to the end.
export function Cutscene({ panels, onDone, finalLabel = 'Start' }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const panel = panels[index];
  const fullText = panel.text;
  const typing = shown < fullText.length;
  const isLast = index === panels.length - 1;

  useEffect(() => {
    setShown(0);
  }, [index]);

  useEffect(() => {
    if (!typing) {
      return undefined;
    }
    const timer = setTimeout(() => setShown((value) => value + CHARS_PER_TICK), TICK_MS);
    return () => clearTimeout(timer);
  }, [shown, typing]);

  function advance() {
    if (typing) {
      setShown(fullText.length);
    } else if (isLast) {
      onDone();
    } else {
      setIndex((value) => value + 1);
    }
  }

  useEffect(() => {
    function onKey(event) {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        advance();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        onDone();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="cutscene" onClick={advance} role="presentation">
      <PanelCanvas className="cutscene-panel" scene={panel.scene} />
      <div className="cutscene-caption">
        {panel.speaker ? <p className="cutscene-speaker">{panel.speaker}</p> : null}
        <p className={`cutscene-text ${panel.speaker ? '' : 'narration'}`}>
          {fullText.slice(0, shown)}
          {typing ? <span className="cutscene-caret">▌</span> : null}
        </p>
        <div className="cutscene-footer">
          <span className="cutscene-progress">
            {panels.map((item, dot) => (
              <i className={dot <= index ? 'on' : ''} key={`${item.scene}-${dot}`} />
            ))}
          </span>
          <span className="cutscene-hint">
            {typing ? 'Space' : isLast ? `Space · ${finalLabel}` : 'Space · Next'}
          </span>
          <button
            className="text-button"
            onClick={(event) => {
              event.stopPropagation();
              onDone();
            }}
            type="button"
          >
            Skip (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
