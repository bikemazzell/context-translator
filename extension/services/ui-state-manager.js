/**
 * UI State Manager
 * Manages popup UI state (screens, forms, buttons, confirmation states)
 */

export class UIStateManager {
  constructor() {
    this.currentScreen = 'main';
    this.formVisible = false;
    this.pendingDelete = null;
    this.buttonStates = new Map();
    this.buttonTexts = new Map();
  }

  /**
   * Get current screen
   * @returns {string} Current screen name
   */
  getCurrentScreen() {
    return this.currentScreen;
  }

  /**
   * Show main screen
   */
  showMainScreen() {
    this.currentScreen = 'main';
  }

  /**
   * Show settings screen
   */
  showSettingsScreen() {
    this.currentScreen = 'settings';
  }

  /**
   * Check if on main screen
   * @returns {boolean}
   */
  isMainScreen() {
    return this.currentScreen === 'main';
  }

  /**
   * Check if on settings screen
   * @returns {boolean}
   */
  isSettingsScreen() {
    return this.currentScreen === 'settings';
  }

  /**
   * Show form
   */
  showForm() {
    this.formVisible = true;
  }

  /**
   * Hide form
   */
  hideForm() {
    this.formVisible = false;
  }

  /**
   * Toggle form visibility
   */
  toggleForm() {
    this.formVisible = !this.formVisible;
  }

  /**
   * Check if form is visible
   * @returns {boolean}
   */
  isFormVisible() {
    return this.formVisible;
  }

  /**
   * Set pending delete language
   * @param {string} languageName
   */
  setPendingDelete(languageName) {
    this.pendingDelete = languageName;
  }

  /**
   * Clear pending delete
   */
  clearPendingDelete() {
    this.pendingDelete = null;
  }

  /**
   * Get pending delete language
   * @returns {string|null}
   */
  getPendingDelete() {
    return this.pendingDelete;
  }

  /**
   * Check if language is pending delete
   * @param {string} languageName
   * @returns {boolean}
   */
  isPendingDelete(languageName) {
    if (languageName === null || languageName === undefined) {
      return false;
    }
    return this.pendingDelete === languageName;
  }

  /**
   * Set button disabled state
   * @param {string} buttonId
   * @param {boolean} disabled
   */
  setButtonDisabled(buttonId, disabled) {
    this.buttonStates.set(buttonId, disabled);
  }

  /**
   * Check if button is disabled
   * @param {string} buttonId
   * @returns {boolean}
   */
  isButtonDisabled(buttonId) {
    return this.buttonStates.get(buttonId) || false;
  }

  /**
   * Set button text
   * @param {string} buttonId
   * @param {string} text
   */
  setButtonText(buttonId, text) {
    this.buttonTexts.set(buttonId, text);
  }

  /**
   * Get button text
   * @param {string} buttonId
   * @returns {string|undefined}
   */
  getButtonText(buttonId) {
    return this.buttonTexts.get(buttonId);
  }

  /**
   * Clear button text
   * @param {string} buttonId
   */
  clearButtonText(buttonId) {
    this.buttonTexts.delete(buttonId);
  }

  /**
   * Reset all state to defaults
   */
  reset() {
    this.currentScreen = 'main';
    this.formVisible = false;
    this.pendingDelete = null;
    this.buttonStates.clear();
    this.buttonTexts.clear();
  }
}
