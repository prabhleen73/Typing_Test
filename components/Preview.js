import React, { useEffect, useRef, useMemo } from "react";
import styled from "styled-components";

function Preview({ text, userInput }) {
  const containerRef = useRef(null);
  const cursorRef = useRef(null);

  //  split text only once
  const characters = useMemo(() => text.split(""), [text]);

  //  scroll logic
  useEffect(() => {
    const container = containerRef.current;
    const cursor = cursorRef.current;

    if (!container || !cursor) return;

    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();

      const offsetTop =
        cursorRect.top - containerRect.top + container.scrollTop;

      const containerHeight = container.clientHeight;
      const targetScroll = offsetTop - containerHeight * 0.3;

      const maxScroll =
        container.scrollHeight - container.clientHeight;

      const nextScroll = Math.max(
        0,
        Math.min(targetScroll, maxScroll)
      );

      //  avoid unnecessary DOM update
      if (container.scrollTop !== nextScroll) {
        container.scrollTop = nextScroll;
      }
    });
  }, [userInput]);

  return (
    <Wrapper ref={containerRef}>
      <Text>
        {characters.map((char, index) => {
          let status = "remaining";

          if (index < userInput.length) {
            status =
              userInput[index] === char ? "correct" : "wrong";
          }

          return (
            <MemoChar
              key={index}
              char={char}
              status={status}
              isCursor={index === userInput.length}
              cursorRef={cursorRef}
            />
          );
        })}
      </Text>
    </Wrapper>
  );
}


   //MEMOIZED CHAR (KEY FIX)


const MemoChar = React.memo(
  ({ char, status, isCursor, cursorRef }) => {
    return (
      <Char
        className={status}
        ref={isCursor ? cursorRef : null}
      >
        {char}
      </Char>
    );
  },
  (prev, next) =>
    prev.char === next.char &&
    prev.status === next.status &&
    prev.isCursor === next.isCursor
);

/* ===== Styles ===== */

const Wrapper = styled.div`
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  padding: 20px;
  border: 2px solid #c8d3e3;
  border-radius: 10px;
  background: #fff;

  font-family: monospace;
  font-size: 1.25rem;
  line-height: 1.6;

  white-space: pre-wrap;
`;

const Text = styled.div`
 display: flex;
flex-wrap: wrap;
`;

const Char = styled.span`
  white-space: pre;

  &.correct {
    background: rgba(0, 180, 0, 0.2);
  }

  &.wrong {
    background: rgba(255, 0, 0, 0.3);
  }

  &.remaining {
    color: #555;
  }
`;

export default React.memo(Preview);