import { setup, styled } from "goober";
import { h, render } from "preact";
import { Divider } from "../components/Divider";
import {
  DENSITY_SOURCE_DEFAULT,
  DENSITY_TARGET_DEFAULT,
  SelectionMode,
} from "../lib/state";
import { useTranslation } from "../lib/useTranslation";

// Setup goober
setup(h);

function ComplexitySelector({
  selectionMode,
  value,
}: {
  selectionMode: SelectionMode;
  value: string;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div style="padding: 8px 3px;">
        <span style="font-size: 11px; font-weight: 600; color: #3c3c3c;">
          {t("settings.tracingDensity", { mode: t(`settings.mode.${selectionMode}`) })}
        </span>
      </div>

      <div style="padding: 2px 9px; display: flex; flex-direction: column; gap: 2px; font-size: 11px;">
        <weave-radio-button-group
          name={`measurement-points-${selectionMode}`}
          id={`measurement-points-${selectionMode}`}
          onChange={(e) => {
            // @ts-ignore
            const density = e.target!.value;
            localStorage.setItem(`tracingDensity-${selectionMode}`, density);
          }}
        >
          <weave-radio-button
            style="margin-bottom: 2px;"
            value="high"
            label={t("settings.density.high")}
            id={`high-${selectionMode}`}
            checked={value === "high"}
          ></weave-radio-button>
          <weave-radio-button
            style="margin-bottom: 2px;"
            value="medium"
            label={t("settings.density.medium")}
            id={`medium-${selectionMode}`}
            checked={value === "medium"}
          ></weave-radio-button>
          <weave-radio-button
            value="low"
            id={`low-${selectionMode}`}
            label={t("settings.density.low")}
            checked={value === "low"}
          ></weave-radio-button>
        </weave-radio-button-group>
      </div>
    </div>
  );
}

const ViewLinesWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  column-gap: 16px;
  align-items: center;
  font: var(--11-medium);
  margin-top: 16px;
`;

function ShowViewLines({ value }: { value: boolean }) {
  const { t } = useTranslation();
  return (
    <ViewLinesWrapper>
      <div>{t("settings.showViewLines")}</div>
      <weave-toggle
        toggled={value}
        onChange={(e) => {
          localStorage.setItem("showViewLines", e.detail.checked.toString());
        }}
      ></weave-toggle>
    </ViewLinesWrapper>
  );
}

const Flex = styled("div")`
  display: flex;
  flex-direction: row;
  column-gap: 16px;
`;

function SettingsModal() {
  // view lines
  const localStorageViewLines = localStorage.getItem("showViewLines");
  const showViewLinesValue = localStorageViewLines
    ? localStorageViewLines === "true"
    : true;

  // source
  const localStorageDensitySource = localStorage.getItem(
    `tracingDensity-source`
  );
  const tracingDensitySourceValue = localStorageDensitySource
    ? localStorageDensitySource
    : DENSITY_SOURCE_DEFAULT;

  // target
  const localStorageDensityTarget = localStorage.getItem(
    `tracingDensity-target`
  );
  const tracingDensityTargetValue = localStorageDensityTarget
    ? localStorageDensityTarget
    : DENSITY_TARGET_DEFAULT;

  return (
    <div>
      <Flex>
        <ComplexitySelector
          selectionMode="source"
          value={tracingDensitySourceValue}
        />
        <ComplexitySelector
          selectionMode="target"
          value={tracingDensityTargetValue}
        />
      </Flex>
      <Divider />
      <ShowViewLines value={showViewLinesValue} />
    </div>
  );
}

render(<SettingsModal />, document.getElementById("settings")!);
