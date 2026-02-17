import React, { useEffect, useRef } from "react";
import styled from "styled-components";

export default function Preview({ text, userInput, errorIndex, cursorIndex }) {
  const scrollRef = useRef(null);
  const cursorRef = useRef(null);

useEffect(() => {
  const container = scrollRef.current;
  const cursor = cursorRef.current;

  if (!container || !cursor) return;
  if (userInput.length === 0) return;

  const style = window.getComputedStyle(container);
  const lineHeight = parseInt(style.lineHeight);
  const paddingTop = parseInt(style.paddingTop);

  const cursorTop = cursor.offsetTop - paddingTop;
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;

  const currentLine = Math.floor(cursorTop / lineHeight);
  const visibleLines = Math.floor(containerHeight / lineHeight);
  const firstVisibleLine = Math.floor(scrollTop / lineHeight);
  const lastVisibleLine = firstVisibleLine + visibleLines - 1;

  // Only scroll if cursor goes beyond visible lines
  if (currentLine > lastVisibleLine) {
    container.scrollTop = (currentLine - visibleLines + 1) * lineHeight;
  }
}, [cursorIndex, userInput]);

  let globalIndex = 0;

  return (
    <ParagraphWrapper ref={scrollRef}>
      {text.split(/(\s+)/).map((segment, segmentIndex) => {
        // If it's whitespace (space/newline)
        if (/^\s+$/.test(segment)) {
          globalIndex += segment.length;
          return <span key={segmentIndex}>{segment}</span>;
        }

        // If it's a word
        return (
          <Word key={segmentIndex}>
            {segment.split("").map((char) => {
              const index = globalIndex++;
              const typed = index < userInput.length;
              const wrong = typed && userInput[index] !== char;
              const isErrorCursor = index === errorIndex;
              const isCursor = index === cursorIndex;

              let bg = "transparent";
              if (isErrorCursor) bg = "rgba(255,0,0,0.45)";
              else if (wrong) bg = "rgba(255,0,0,0.25)";
              else if (typed) bg = "rgba(0,180,0,0.20)";

              return (
                <span
                  key={index}
                  ref={isCursor ? cursorRef : null}
                  style={{
                    background: bg,
                    padding: 0,
                    margin: 0,
                    color: typed ? "#000" : "#555",
                  }}
                >
                  {char}
                </span>
              );
            })}
          </Word>
        );
      })}
    </ParagraphWrapper>
  );
}

/* Wrapper */
const ParagraphWrapper = styled.div`
  width: 100%;
  max-height: 260px;
  background: #ffffff;
  border-radius: 10px;
  border: 2px solid #c8d3e3;
  padding: 20px;

  overflow-y: auto;
  overflow-x: hidden;

  white-space: pre-wrap;   /* preserve spaces + newlines */
  font-size: 1.25rem;
  line-height: 1.6;
  font-family: monospace;
  text-align: left;
`;

/* Prevent word splitting */
const Word = styled.span`
  white-space: nowrap;
`;