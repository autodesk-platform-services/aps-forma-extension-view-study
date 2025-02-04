import { styled } from "goober";
import { openSettingsModal } from "../settings-modal/utils";
import SettingsIcon from "./icons/SettingsIcon";

const SettingsButton = styled("button")`
  all: unset;
  cursor: pointer;
`;

export default function AnalysisSettings() {
  const onClick = async () => {
    await openSettingsModal();
  };
  return (
    <SettingsButton onClick={onClick}>
      <SettingsIcon />
    </SettingsButton>
  );
}
