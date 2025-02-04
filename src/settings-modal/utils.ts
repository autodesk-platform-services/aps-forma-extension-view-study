import { Forma } from "forma-embedded-view-sdk/auto";

export async function openSettingsModal() {
  // close already opened modal
  await closeSettingsModal();

  // open settings modal
  await Forma.openFloatingPanel({
    embeddedViewId: "settings",
    url: `${window.location.origin}${window.location.pathname}settings.html`,
    title: "Settings",
    hideIcon: true,
    disableMinimize: true,
    disableResize: true,
    placement: {
      type: "right",
      offsetTop: 94,
    },
    preferredSize: {
      width: 285,
      height: 143,
    },
  });
}

export async function closeSettingsModal() {
  await Forma.closeEmbeddedView({ embeddedViewId: "settings" });
}
