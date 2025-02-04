import { useSignalEffect } from "@preact/signals";
import { Forma } from "forma-embedded-view-sdk/auto";
import { setup, styled } from "goober";
import { h, render } from "preact";
import Header from "./components/Header";
import ViewFromObject from "./components/ViewFromVolume";
import { closeSettingsModal } from "./settings-modal/utils";

// Setup goober
setup(h);

const Container = styled("div")`
  overflow: hidden;
`;

function App() {
  useSignalEffect(() => {
    Forma.render.glb.cleanup();
    Forma.render.elementColors.clearAll();
    closeSettingsModal();
  });

  return (
    <Container>
      <Header />
      <ViewFromObject />
    </Container>
  );
}

render(<App />, document.getElementById("app")!);
