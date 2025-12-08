
import Image from "next/image";
import styled from "styled-components";
import logo from "../public/images/dtulogo.png";

const NavHeader = () => {
  return (
    <HeaderContainer>
      <LeftContent>
        <Logo>
          <Image src={logo} alt="DTU Logo" width={55} height={55} />
        </Logo>
      </LeftContent>
    </HeaderContainer>
  );
};

export default NavHeader;


const HeaderContainer = styled.header`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  background: #ffffff;         
  color: #000;               

  padding: 12px 30px;
  position: sticky;
  top: 0;
  z-index: 100;

  border-bottom: 1px solid #e5e5e5; 
`;

const LeftContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;

  img {
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  img:hover {
    transform: scale(1.05);
  }
`;
