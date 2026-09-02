// Minimal service worker: all scanning/filling/AI logic runs in the side
// panel context directly (it has the same chrome.* API access as background).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Older Chrome versions without setPanelBehavior fall back to the action's default popup/panel wiring.
})
