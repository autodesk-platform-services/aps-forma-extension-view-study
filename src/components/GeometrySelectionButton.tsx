import { styled } from "goober";
import { useTranslation } from "../lib/useTranslation";
import GeometryIcon from "./icons/GeometryIcon";

const ToggleButton = styled("button")<{
  borderColor: string;
  backgroundColor: string;
  isSelected: boolean;
}>`
  all: unset;
  margin-bottom: 16px;
  width: 100%;
  padding: 16px 16px;
  border: 1px solid;
  border-radius: 2px;
  border-color: ${(props) => props.borderColor};
  cursor: pointer;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: 8px;
  background-color: ${(props) =>
    props.isSelected ? props.backgroundColor : "none"};
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonText = styled("div")`
  display: flex;
  flex-direction: column;
`;

interface Props {
  buttonText: string;
  color: string;
  backgroundColor: string;
  elementsSelected: number;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function GeometrySelectionButton({
  buttonText,
  color,
  backgroundColor,
  elementsSelected,
  isSelected,
  onClick,
  disabled,
}: Props) {
  const { t } = useTranslation();
  return (
    <ToggleButton
      borderColor={color}
      backgroundColor={backgroundColor}
      onClick={onClick}
      isSelected={isSelected}
      disabled={disabled}
    >
      <GeometryIcon color={color} />
      <ButtonText>
        <span style="font: var(--11-medium);">{buttonText}</span>
        <span>{t("geometry.selected", { count: elementsSelected })}</span>
      </ButtonText>
      {elementsSelected > 0 && <forma-check style={{ color }} />}
    </ToggleButton>
  );
}
