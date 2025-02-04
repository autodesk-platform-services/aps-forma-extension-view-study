import { styled } from "goober";
import AnalysisSettings from "./AnalysisSettings";
import Binoculars from "./icons/Binoculars";

const Wrapper = styled("div")`
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  font-size: var(--12-bold);
  column-gap: 8px;
  margin: 16px 0;
`;

const Title = styled("h1")`
  all: unset;
  font: var(--12-bold);
`;

export default function Header() {
  return (
    <Wrapper>
      <Binoculars />
      <Title>View</Title>
      <AnalysisSettings />
    </Wrapper>
  );
}
