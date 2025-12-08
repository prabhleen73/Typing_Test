import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createGlobalStyle } from "styled-components";
import { api } from "../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    padding: 0;

    /* FIXED */
    overflow-x: hidden;  
    overflow-y: auto;    

    background: #ffffff
    font-family: 'Poppins', sans-serif;
    height: 100%;
    width: 100%;
  }

  * {
    box-sizing: border-box;
  }

  #__next {
    height: 100%;
    width: 100%;
  }
`;


export default function App({ Component, pageProps }) {
  return (
    <ConvexProvider client={convex}>
      <GlobalStyle />
      <Component {...pageProps} />
    </ConvexProvider>
  );
}
