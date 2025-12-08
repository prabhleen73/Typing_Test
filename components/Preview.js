import React, { useEffect, useRef } from "react";
import styled from "styled-components";

export default function Preview({ text, userInput, errorIndex, cursorIndex }) {
  const scrollRef = useRef(null);

  /* --------------------------------------------------
        AUTO-SCROLL WHEN USER TYPES
  ---------------------------------------------------- */
  useEffect(() => {
    if (!scrollRef.current) return;
    if (cursorIndex == null) return;

    const el = scrollRef.current;

    // convert characters typed → scroll position
    const approxCharsPerLine = 60; 
    const lineHeight = 30;  
    const lineNumber = Math.floor(cursorIndex / approxCharsPerLine);

    el.scrollTo({
      top: lineNumber * lineHeight - 50,
      behavior: "smooth",
    });
  }, [cursorIndex]);

  return (
    <ParagraphWrapper ref={scrollRef}>
      {text.split("").map((char, index) => {
        const typed = index < userInput.length;
        const correct = typed && userInput[index] === char;
        const wrong = typed && userInput[index] !== char;
        const isErrorCursor = index === errorIndex;

        let bg = "transparent";
        if (isErrorCursor) bg = "rgba(255,0,0,0.45)";
        else if (wrong) bg = "rgba(255,0,0,0.25)";
        else if (typed) bg = "rgba(0,180,0,0.20)";

        return (
          <span
            key={index}
            style={{
              background: bg,
              padding: "1px",
              color: typed ? "#000" : "#444",
            }}
          >
            {char}
          </span>
        );
      })}
    </ParagraphWrapper>
  );
}


/* --------------------------------------------------
      WIDE, LARGE, FULL-SCREEN STYLE PREVIEW BOX
---------------------------------------------------- */

// const ParagraphWrapper = styled.div`
//   width: 100%;
//   max-height: 55vh;               /* 🔥 much larger */
//   padding: 20px;
//   background: #ffffff;
//   border: 2px solid #c8d3e3;
//   border-radius: 12px;

//   overflow-y: auto;
//   white-space: pre-wrap;

//   font-size: 1.45rem;             /* 🔥 BIGGER TEXT */
//   line-height: 1.9;
//   letter-spacing: 0.4px;

//   /* Smooth scrolling */
//   scroll-behavior: smooth;

//   /* Wide layout feel */
//   word-spacing: 3px;

//   /* Scrollbar style */
//   scrollbar-width: thin;
//   scrollbar-color: #aab6c8 #f1f4f9;

//   &::-webkit-scrollbar {
//     width: 10px;
//   }
//   &::-webkit-scrollbar-thumb {
//     background: #aab6c8;
//     border-radius: 8px;
//   }
// `;

const ParagraphWrapper = styled.div`
  width: 100%;
  max-height: 260px;

  background: #ffffff;
  border-radius: 10px;
  border: 2px solid #c8d3e3;

  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;

  white-space: pre-wrap;
  font-size: 1.25rem;
  line-height: 1.55;
`;


