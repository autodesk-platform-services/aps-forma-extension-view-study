import { styled } from "goober";
import { useState } from "preact/hooks";
import { useTranslation } from "../lib/useTranslation";
import { analysisResultPointState, inspectionState } from "../lib/state";
import { Divider } from "./Divider";
import ViewFromPoint from "./ViewFromPoint";

const Header = styled("h2")`
  all: unset;
  font: var(--12-bold);
  color: var(--text-default);
`;

const HeaderContainer = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InspectionContainer = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
`;

const InspectionHeader = styled("div")`
  font-weight: 600;
  font-size: 11px;
  color: var(--text-default);

  span {
    font: var(--11-regular);
  }
`;

export type AnalysisStatsData = {
  ratio: number;
  color: string;
  text: string;
};

export default function AnalysisStats({ data }: { data: AnalysisStatsData[] }) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  console.log(analysisResultPointState.value);
  const inspectionPointPercentageView = analysisResultPointState.value
    ? (analysisResultPointState.value.hits.length /
        (analysisResultPointState.value.hits.length +
          analysisResultPointState.value.misses.length)) *
      100
    : undefined;
  return (
    <>
      <Divider />
      <HeaderContainer>
        <Header>{t("visibility.title")}</Header>
        <ViewFromPoint />
      </HeaderContainer>
      {inspectionState.value && (
        <InspectionContainer>
          <InspectionHeader>{t("inspection.view")}</InspectionHeader>
          <InspectionHeader>
            {inspectionPointPercentageView
              ? Math.round(inspectionPointPercentageView)
              : "-"}{" "}
            <span>%</span>
          </InspectionHeader>
        </InspectionContainer>
      )}
      <div
        style="padding: 8px 0px; display: flex; flex-direction: row; gap: 10px; align-items: center;"
        onClick={() => {
          setIsCollapsed((prev) => !prev);
        }}
      >
        <forma-analysis-segmented-double-slider
          segmentData={data}
          disableinteractive
          disablelegend
          style="width: 100%;"
        />
        <weave-chevron-down
          style={`color: rgba(60, 60, 60, 0.7); display: flex; rotate: ${
            isCollapsed ? "-90deg" : "0deg"
          }`}
        />
      </div>
      {!isCollapsed && (
        <div>
          <forma-horizontalbarchart
            chartData={data.map((d) => ({
              key: d.text,
              label: d.text,
              percent: d.ratio * 100,
              color: d.color,
            }))}
            valueheader=""
            labelheader={t("visibility.levels")}
            precisionpercent={0}
            showtotal={false}
          />
        </div>
      )}
    </>
  );
}
