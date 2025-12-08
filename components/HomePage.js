import styled from "styled-components";
import TypingCard from "./TypingCard";
import NavHeader from "./NavHeader";

const HomePage = () => {
  return (
    <PageContainer>
      <MainCard>
        <NavHeader />
        <Content>
          <TypingCard />
        </Content>
      </MainCard>
    </PageContainer>
  );
};

export default HomePage;

const PageContainer = styled.div`
  height: 100vh;
  width: 100vw;
  background: #ffffff;        
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MainCard = styled.div`
  width: 90%;
  max-width: 1000px;
  min-height: 80vh;
  background: #ffffff;         
  border-radius: 1rem;
  box-shadow: 0px 8px 25px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
`;
