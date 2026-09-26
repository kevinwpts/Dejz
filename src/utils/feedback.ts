// Haptic feedback utility (all sound effects removed per user request)

export const initAudio = () => null;

export const feedback = {
  // Light tap for tabs and buttons
  tap() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  // Very light haptic for sliders
  slider() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
  },

  // Selection tap for timeline / toggles
  selection() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  },

  // Positive action (saving, income)
  success() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 30, 20]);
    }
  },

  // Negative action (expense)
  expense() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  },

  // Big celebration (goal completed)
  celebrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30, 50, 50]);
    }
  },

  // Deleting or warning
  warning() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }
};
