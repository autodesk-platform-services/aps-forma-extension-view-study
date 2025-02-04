import { ComponentChildren } from "preact";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "weave-button": {
        disabled?: boolean;
        onClick?: () => void;
        children?: ComponentChildren;
        style?: string;
        variant: "outlined" | "solid" | "flat";
      };
      "weave-segmented-buttons-group": JSX.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
        value?: string;
        noborder?: boolean;
        children?: ComponentChildren;
        style?: string;
        onChange?: (e: CustomEvent) => void;
        variant: "outlined" | "solid" | "flat";
      };
      "weave-segmented-button": JSX.HTMLAttributes<HTMLButtonElement> & {
        value?: string;
        checked?: boolean;
        noborder?: boolean;
        density?: string;
        disabled?: boolean;
        type?: "button" | "submit" | "reset";
        variant?: "outlined" | "solid" | "flat";
        iconposition?: "left" | "right";
        onChange?: () => void;
        children?: ComponentChildren;
        style?: string;
      };
      "weave-input": {
        children?: ComponentChildren;
        onChange?: (e: CustomEvent) => void;
        style?: string;
        label?: string;
        disabled?: boolean;
        type?: string;
        value?: string;
        unit?: string;
        variant?: string;
        step?: string;
      };
      "weave-progress-bar": {
        percentcomplete?: number;
      };
      "forma-help-16": {
        style?: string;
        id?: string;
      };
      "weave-tooltip": {
        text: string;
        element?: string;
        description?: string;
        children?: ComponentChildren;
        nub?: string;
        width?: string;
        style?: string;
      };
      "weave-radio-button-group": JSX.HTMLAttributes<HTMLButtonElement> & {
        name: string;
        children?: ComponentChildren;
        onChange?: (e: CustomEvent<HTMLInputElement>) => void;
      };
      "weave-radio-button": {
        value?: string;
        checked?: boolean;
        label?: string;
        children?: ComponentChildren;
        style?: string;
        id?: string;
      };
      "weave-toggle": {
        style?: string;
        toggled?: boolean;
        id?: string;
        onChange?: (e: CustomEvent) => void;
      };
      "forma-eye-16": JSX.HTMLAttributes<SVGElement> & {};
      "forma-analysis-segmented-double-slider": JSX.HTMLAttributes<HTMLDivElement> & {
        segmentData?: { ratio: number; color: string; text: string }[];
        disableinteractive?: boolean;
        disablelegend?: boolean;
      };
      "weave-chevron-down": JSX.HTMLAttributes<SVGElement>;
      "forma-horizontalbarchart": JSX.HTMLAttributes<HTMLDivElement> & {
        chartData?: {
          key: string;
          label: string;
          value?: number;
          percent: number;
          color: string;
        }[];
        valueheader?: string;
        labelheader?: string;
        showtotal?: boolean;
        precisionpercent?: number;
        precisionvalue?: number;
      };
      "forma-check": JSX.HTMLAttributes<SVGElement> & {};
    }
  }
}
